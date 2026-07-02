import { createResource, createSignal, createMemo, createEffect, Show, on, type JSX } from 'solid-js';
import { useParams } from '@solidjs/router';
import { Table, type Column } from '../../ui/Table';
import { Button } from '../../ui/Button';
import { SplitButton } from '../../ui/SplitButton';
import { StatusBadge } from '../../ui/StatusBadge';
import { StatusCrumbs } from '../../ui/StatusCrumbs';
import { Icon } from '../../ui/Icon';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Select } from '../../ui/Select';
import { LineEditor } from './StocktakeLineEditor';
import {
  fetchStocktakeByNumber,
  fetchStocktakeLines,
  updateStocktakeHeader,
  finaliseStocktake,
  batchLines,
  type FinaliseError,
} from './api';
import { fetchActiveReasonOptions, fetchLocations } from './reference';
import type { StocktakeLine } from './types';
import { isEditable, editBlockReason, difference, hasCountedLine, reasonsForDirection } from './rules';
import { createAutosave } from '../../lib/autosave';
import { formatDate, formatDateTime, formatSigned, formatNumber } from '../../lib/format';
import { toast } from '../../state/toast';
import './stocktakes.css';

/*
 * S3 — Stocktake detail (J4/J5/J6/J7). A read-only line table (line data is entered
 * only in the S4 editor — AC-D1/D2); in-place auto-saved header/metadata fields
 * (AC-E6/E7); a persistent status footer with the lock toggle, New→Finalised status
 * crumbs, and the finalise split button (AC-D3); bulk line actions when rows are
 * selected; and finalise with typed errors keyed to the offending lines. Every edit
 * affordance shares the one editability gate (NEW & unlocked).
 */

const LINE_PAGE_SIZE = 500;

export function StocktakeDetailPage(): JSX.Element {
  const params = useParams();
  const [refreshKey, setRefreshKey] = createSignal(0);

  const [header] = createResource(
    () => ({ storeId: params.storeId!, number: Number(params.number), _k: refreshKey() }),
    (s) => fetchStocktakeByNumber(s.storeId, s.number),
  );

  const [linesData] = createResource(
    () => {
      const h = header();
      return h ? { storeId: params.storeId!, stocktakeId: h.id, _k: refreshKey() } : undefined;
    },
    (s) => fetchStocktakeLines({ storeId: s.storeId, stocktakeId: s.stocktakeId, page: 1, pageSize: LINE_PAGE_SIZE }),
  );

  const [reasons] = createResource(fetchActiveReasonOptions, { initialValue: [] });
  const [locations] = createResource(() => params.storeId, fetchLocations, { initialValue: [] });

  const editable = () => (header() ? isEditable(header()!) : false);
  const blockReason = () => (header() ? editBlockReason(header()!) : null);

  /* ---------- In-place header autosave (AC-E6/E7) ---------- */
  const saveField = (patch: Parameters<typeof updateStocktakeHeader>[2]) =>
    updateStocktakeHeader(params.storeId!, header()!.id, patch);
  const asDescription = createAutosave('', (v) => saveField({ description: v }));
  const asComment = createAutosave('', (v) => saveField({ comment: v }));
  const asCountedBy = createAutosave('', (v) => saveField({ countedBy: v }));
  const asVerifiedBy = createAutosave('', (v) => saveField({ verifiedBy: v }));

  // Re-sync baselines when the record loads/refreshes (no write).
  createEffect(
    on(header, (h) => {
      if (!h) return;
      asDescription.sync(h.description ?? '');
      asComment.sync(h.comment ?? '');
      asCountedBy.sync(h.countedBy ?? '');
      asVerifiedBy.sync(h.verifiedBy ?? '');
    }),
  );

  /* ---------- View-only item filter (not a stored field) ---------- */
  const [itemFilter, setItemFilter] = createSignal('');
  const allLines = () => linesData()?.nodes ?? [];
  const lines = createMemo(() => {
    const q = itemFilter().trim().toLowerCase();
    if (!q) return allLines();
    return allLines().filter((l) => l.itemName.toLowerCase().includes(q) || l.item.code.toLowerCase().includes(q));
  });

  /* ---------- Selection + bulk actions (J5) ---------- */
  const [selected, setSelected] = createSignal<Set<string>>(new Set());
  const clearSelection = () => setSelected(new Set<string>());
  const toggle = (id: string) =>
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelected((p) => (p.size === lines().length ? new Set<string>() : new Set(lines().map((l) => l.id))));
  const selectedLines = () => allLines().filter((l) => selected().has(l.id));

  /* ---------- Editor (S4) ---------- */
  const [editorOpen, setEditorOpen] = createSignal(false);
  const [editIndex, setEditIndex] = createSignal(-1); // -1 = add-new
  const editingLine = () => (editIndex() >= 0 ? lines()[editIndex()] ?? null : null);
  const openEditor = (line: StocktakeLine | null) => {
    setEditIndex(line ? lines().findIndex((l) => l.id === line.id) : -1);
    setEditorOpen(true);
  };

  /* ---------- Finalise (J7) ---------- */
  const [finaliseOpen, setFinaliseOpen] = createSignal(false);
  const [finalising, setFinalising] = createSignal(false);
  const [finaliseErr, setFinaliseErr] = createSignal<FinaliseError | undefined>();
  const reducedStockLineIds = () => new Set(finaliseErr()?.reducedStockLineIds ?? []);
  const mismatchLineIds = () => new Set(finaliseErr()?.mismatchLineIds ?? []);

  const attemptFinalise = () => {
    if (!hasCountedLine(allLines())) {
      toast.warning('Nothing counted yet — count at least one line before finalising.');
      return;
    }
    setFinaliseErr(undefined);
    setFinaliseOpen(true);
  };
  const doFinalise = async () => {
    setFinalising(true);
    try {
      const res = await finaliseStocktake(params.storeId!, header()!.id);
      if (res.ok) {
        toast.success('Stocktake finalised.');
        setFinaliseOpen(false);
        setRefreshKey((k) => k + 1);
      } else {
        setFinaliseErr(res.error);
        setFinaliseOpen(false);
        toast.error(res.error.message);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setFinalising(false);
    }
  };

  /* ---------- Lock toggle (J6) ---------- */
  const toggleLock = async () => {
    const h = header();
    if (!h) return;
    try {
      await updateStocktakeHeader(params.storeId!, h.id, { isLocked: !h.isLocked });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  /* ---------- Bulk: reduce to zero / change location / delete (J5) ---------- */
  const [reduceOpen, setReduceOpen] = createSignal(false);
  const [reduceReason, setReduceReason] = createSignal<string | null>(null);
  const [bulkBusy, setBulkBusy] = createSignal(false);
  const [locOpen, setLocOpen] = createSignal(false);
  const [bulkLoc, setBulkLoc] = createSignal<string | null>(null);
  const [delLinesOpen, setDelLinesOpen] = createSignal(false);

  // Reduce-to-zero is a reduction: capture a reason when active reduction reasons exist (AC-E8).
  const reductionReasons = createMemo(() => reasonsForDirection(reasons(), 'negative'));
  const reduceReasonRequired = () => reductionReasons().length > 0;

  const applyReduceToZero = async () => {
    setBulkBusy(true);
    try {
      const updates = selectedLines().map((l) => ({
        id: l.id,
        countedNumberOfPacks: 0,
        reasonOptionId: reduceReason() ?? undefined,
      }));
      const errs = await batchLines(params.storeId!, header()!.id, [], updates, []);
      if (errs.length) toast.error(errs[0]!.message);
      else toast.success(`Reduced ${updates.length} line(s) to zero.`);
      setReduceOpen(false);
      setReduceReason(null);
      clearSelection();
      setRefreshKey((k) => k + 1);
    } finally {
      setBulkBusy(false);
    }
  };
  const applyChangeLocation = async () => {
    setBulkBusy(true);
    try {
      const updates = selectedLines().map((l) => ({ id: l.id, locationId: bulkLoc() }));
      const errs = await batchLines(params.storeId!, header()!.id, [], updates, []);
      if (errs.length) toast.error(errs[0]!.message);
      else toast.success(`Moved ${updates.length} line(s).`);
      setLocOpen(false);
      clearSelection();
      setRefreshKey((k) => k + 1);
    } finally {
      setBulkBusy(false);
    }
  };
  const applyDeleteLines = async () => {
    setBulkBusy(true);
    try {
      const errs = await batchLines(params.storeId!, header()!.id, [], [], [...selected()]);
      if (errs.length) toast.error(errs[0]!.message);
      else toast.success(`Deleted ${selected().size} line(s).`);
      setDelLinesOpen(false);
      clearSelection();
      setRefreshKey((k) => k + 1);
    } finally {
      setBulkBusy(false);
    }
  };

  /* ---------- Side panel ---------- */
  const [panelOpen, setPanelOpen] = createSignal(true);
  const copyRecord = async () => {
    const h = header();
    if (!h) return;
    const text = `Stocktake #${h.stocktakeNumber}\nStatus: ${h.status}\nDescription: ${h.description ?? ''}\nCreated: ${formatDateTime(h.createdDatetime)}\nLines: ${h.lineCount}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard.');
    } catch {
      toast.error('Copy failed.');
    }
  };

  /* ---------- Line table columns (S3) ---------- */
  const columns: Column<StocktakeLine>[] = [
    {
      key: 'code',
      header: 'Code',
      width: '110px',
      render: (l) => (
        <span class="st-cell-code">
          <Show when={reducedStockLineIds().has(l.stockLine?.id ?? '') || mismatchLineIds().has(l.id)}>
            <Icon name="circle-alert" size={14} label="Line error" class="cell-error-icon" />
          </Show>
          {l.item.code}
        </span>
      ),
      cardHidden: true,
    },
    { key: 'name', header: 'Item', render: (l) => <span class="cell-truncate">{l.itemName}</span> },
    { key: 'batch', header: 'Batch', priority: 3, render: (l) => l.batch || '—' },
    { key: 'expiry', header: 'Expiry', priority: 2, render: (l) => formatDate(l.expiryDate) || '—' },
    { key: 'location', header: 'Location', priority: 3, render: (l) => l.location?.code || '—' },
    { key: 'unit', header: 'Unit', priority: 2, render: (l) => l.item.unitName || '—' },
    { key: 'packSize', header: 'Pack size', priority: 2, align: 'right', render: (l) => <span class="tabular">{formatNumber(l.packSize)}</span> },
    {
      key: 'snapshot',
      header: 'Snapshot',
      align: 'right',
      render: (l) => (
        <span class={`tabular${mismatchLineIds().has(l.id) ? ' cell-error' : ''}`}>
          {formatNumber(l.snapshotNumberOfPacks)}
          <Show when={mismatchLineIds().has(l.id)}>
            <Icon name="circle-alert" size={12} label="Snapshot no longer matches current stock" />
          </Show>
        </span>
      ),
    },
    {
      key: 'counted',
      header: 'Counted',
      align: 'right',
      render: (l) => (
        <span class={`tabular${reducedStockLineIds().has(l.stockLine?.id ?? '') ? ' cell-error' : ''}`}>
          {l.countedNumberOfPacks == null ? '—' : formatNumber(l.countedNumberOfPacks)}
        </span>
      ),
    },
    {
      key: 'difference',
      header: 'Difference',
      align: 'right',
      render: (l) => <span class="tabular">{l.countedNumberOfPacks == null ? '—' : formatSigned(difference(l))}</span>,
    },
    { key: 'reason', header: 'Reason', priority: 2, render: (l) => l.reasonOption?.reason || '—' },
    { key: 'comment', header: 'Comment', priority: 3, render: (l) => <span class="cell-truncate">{l.comment || '—'}</span> },
  ];

  const selection = {
    isSelected: (id: string) => selected().has(id),
    onToggle: toggle,
    onToggleAll: toggleAll,
    get allSelected() {
      return lines().length > 0 && selected().size === lines().length;
    },
    get someSelected() {
      return selected().size > 0;
    },
  };

  const crumbSteps = () => {
    const h = header();
    return [
      { key: 'NEW', label: 'New', reachedAt: h?.createdDatetime },
      { key: 'FINALISED', label: 'Finalised', reachedAt: h?.finalisedDatetime },
    ];
  };

  return (
    <Show when={header()} fallback={<DetailFallback loading={header.loading} error={header.error as Error | undefined} />}>
      {(h) => (
        <div class={`page detail${panelOpen() ? ' with-panel' : ''}`}>
          {/* App bar / toolbar: description + item search + actions */}
          <div class="detail-toolbar">
            <div class="detail-title">
              <span class="detail-number tabular">#{h().stocktakeNumber}</span>
              <input
                class="input detail-description"
                placeholder="Description"
                disabled={!editable()}
                value={asDescription.value()}
                onInput={(e) => asDescription.set(e.currentTarget.value)}
                onBlur={() => asDescription.flush()}
                aria-label="Description"
              />
            </div>
            <div class="detail-toolbar-actions">
              <input
                class="input input-compact detail-search"
                placeholder="Filter items…"
                value={itemFilter()}
                onInput={(e) => setItemFilter(e.currentTarget.value)}
                aria-label="Filter items"
              />
              <Button
                label="Add item"
                icon="plus-circle"
                variant="secondary"
                compact
                disabled={!editable()}
                title={editable() ? undefined : 'Not editable'}
                onClick={() => openEditor(null)}
              />
              <Button label="Report" icon="printer" variant="ghost" compact onClick={() => toast.info('Report generation is out of scope for this build.')} />
              <Button
                icon="sidebar"
                aria-label="Toggle detail panel"
                variant="ghost"
                compact
                onClick={() => setPanelOpen((v) => !v)}
              />
            </div>
          </div>

          {/* Locked / finalised banner */}
          <Show when={blockReason()}>
            <div class={`detail-banner banner-${blockReason() === 'finalised' ? 'info' : 'warning'}`}>
              <Icon name={blockReason() === 'finalised' ? 'info' : 'alert'} size={20} />
              <span>
                {blockReason() === 'finalised'
                  ? 'This stocktake is finalised and read-only.'
                  : 'This stocktake is on hold (locked). Unlock it to make changes.'}
              </span>
            </div>
          </Show>
          <Show when={finaliseErr()}>
            <div class="detail-banner banner-error">
              <Icon name="circle-alert" size={20} />
              <span>{finaliseErr()!.message}</span>
            </div>
          </Show>

          <div class="detail-main">
            {/* Content body: read-only line table */}
            <div class="page-body detail-body">
              <Table
                caption="Stocktake lines"
                columns={columns}
                rows={lines()}
                rowKey={(l) => l.id}
                selection={editable() ? selection : undefined}
                onRowClick={(l) => openEditor(l)}
                rowError={(l) => reducedStockLineIds().has(l.stockLine?.id ?? '') || mismatchLineIds().has(l.id)}
                state={linesData.loading && !linesData() ? 'loading' : lines().length === 0 ? (itemFilter() ? 'empty-no-matches' : 'empty-no-records') : 'normal'}
                emptyMessage="No lines yet. Use Add item to start counting."
                onClearFilters={() => setItemFilter('')}
                cardTitle={(l) => <>{l.item.code} — {l.itemName}</>}
              />
            </div>

            {/* Side panel */}
            <Show when={panelOpen()}>
              <aside class="detail-panel">
                <h3 class="panel-heading">Details</h3>
                <dl class="panel-fields">
                  <dt>Status</dt>
                  <dd><StatusBadge label={h().status === 'NEW' ? 'New' : 'Finalised'} tone={h().status === 'NEW' ? 'info' : 'success'} /></dd>
                  <dt>Entered by</dt>
                  <dd>{h().user?.username ?? '—'}</dd>
                  <dt>Created</dt>
                  <dd class="tabular">{formatDateTime(h().createdDatetime)}</dd>
                  <Show when={h().finalisedDatetime}>
                    <dt>Finalised</dt>
                    <dd class="tabular">{formatDateTime(h().finalisedDatetime)}</dd>
                  </Show>
                  <dt>Lines</dt>
                  <dd class="tabular">{h().lineCount}</dd>
                </dl>

                <label class="field">
                  <span class="field-label">Counted by</span>
                  <input class="input" disabled={!editable()} value={asCountedBy.value()} onInput={(e) => asCountedBy.set(e.currentTarget.value)} onBlur={() => asCountedBy.flush()} />
                </label>
                <label class="field">
                  <span class="field-label">Verified by</span>
                  <input class="input" disabled={!editable()} value={asVerifiedBy.value()} onInput={(e) => asVerifiedBy.set(e.currentTarget.value)} onBlur={() => asVerifiedBy.flush()} />
                </label>
                <label class="field">
                  <span class="field-label">Comment</span>
                  <textarea class="input textarea" disabled={!editable()} value={asComment.value()} onInput={(e) => asComment.set(e.currentTarget.value)} onBlur={() => asComment.flush()} />
                </label>

                <div class="panel-actions">
                  <Button label="Copy" icon="copy" variant="ghost" compact onClick={copyRecord} />
                  <Show when={editable()}>
                    <Button label="Delete" icon="delete" variant="destructive" compact onClick={() => toast.info('Delete this stocktake from the list view.')} />
                  </Show>
                </div>
              </aside>
            </Show>
          </div>

          {/* Action footer: bulk bar when rows selected, else lifecycle controls */}
          <div class="action-footer">
            <Show
              when={selected().size === 0}
              fallback={
                <div class="bulk-bar">
                  <Button icon="minus-circle" aria-label="Clear selection" variant="ghost" compact onClick={clearSelection} />
                  <span class="bulk-count">{selected().size} selected</span>
                  <div class="bulk-actions">
                    <Button label="Reduce to zero" icon="rewind" variant="secondary" compact onClick={() => { setReduceReason(null); setReduceOpen(true); }} />
                    <Button label="Change location" icon="arrow-right" variant="secondary" compact onClick={() => { setBulkLoc(null); setLocOpen(true); }} />
                    <Button label="Delete" icon="delete" variant="destructive" compact onClick={() => setDelLinesOpen(true)} />
                  </div>
                </div>
              }
            >
              <div class="footer-lock">
                <Show when={h().status === 'NEW'}>
                  <button type="button" class={`lock-toggle${h().isLocked ? ' lock-on' : ''}`} onClick={toggleLock} aria-pressed={h().isLocked}>
                    {h().isLocked ? 'On hold' : 'Hold'}
                  </button>
                </Show>
              </div>
              <StatusCrumbs steps={crumbSteps()} current={h().status} />
              <Show when={editable()}>
                <SplitButton
                  icon="arrow-right"
                  options={[
                    { value: 'NEW', label: 'New', disabled: true },
                    { value: 'FINALISED', label: 'Save and confirm → Finalised' },
                  ]}
                  selected="FINALISED"
                  onSelect={() => {}}
                  onPrimary={() => attemptFinalise()}
                />
              </Show>
            </Show>
          </div>

          {/* Line editor */}
          <LineEditor
            open={editorOpen()}
            storeId={params.storeId!}
            stocktakeId={h().id}
            reasons={reasons()}
            locations={locations()}
            line={editingLine()}
            existingItemIds={allLines().map((l) => l.itemId)}
            onClose={() => setEditorOpen(false)}
            onSaved={() => {
              setEditorOpen(false);
              setRefreshKey((k) => k + 1);
            }}
            onNavigate={(delta) => {
              const next = editIndex() + delta;
              if (next >= 0 && next < lines().length) setEditIndex(next);
            }}
            navPrevDisabled={editIndex() <= 0}
            navNextDisabled={editIndex() < 0 || editIndex() >= lines().length - 1}
          />

          {/* Finalise confirmation */}
          <ConfirmDialog
            open={finaliseOpen()}
            title="Finalise stocktake?"
            message="This applies all counted differences as inventory adjustments and makes the stocktake read-only. Uncounted lines are dropped."
            confirmLabel="Save and confirm"
            busy={finalising()}
            onConfirm={doFinalise}
            onCancel={() => setFinaliseOpen(false)}
          />

          {/* Bulk reduce-to-zero (captures a reason when required) */}
          <ConfirmDialog
            open={reduceOpen()}
            title="Reduce selected lines to zero?"
            message={`Set counted = 0 for ${selected().size} selected line(s).`}
            confirmLabel="Reduce to zero"
            busy={bulkBusy()}
            confirmDisabled={reduceReasonRequired() && !reduceReason()}
            onConfirm={applyReduceToZero}
            onCancel={() => setReduceOpen(false)}
          >
            <Show when={reduceReasonRequired()}>
              <Select
                label="Reason (required)"
                placeholder="Choose a reason"
                required
                options={reductionReasons().map((r) => ({ value: r.id, label: r.reason }))}
                value={reduceReason()}
                onChange={setReduceReason}
              />
            </Show>
          </ConfirmDialog>

          {/* Bulk change location */}
          <ConfirmDialog
            open={locOpen()}
            title="Change location"
            message={`Move ${selected().size} selected line(s) to:`}
            confirmLabel="Apply"
            busy={bulkBusy()}
            onConfirm={applyChangeLocation}
            onCancel={() => setLocOpen(false)}
          >
            <Select
              label="Location"
              placeholder="No location"
              options={locations().map((l) => ({ value: l.id, label: `${l.code} — ${l.name}` }))}
              value={bulkLoc()}
              onChange={setBulkLoc}
            />
          </ConfirmDialog>

          {/* Bulk delete lines */}
          <ConfirmDialog
            open={delLinesOpen()}
            title="Delete selected lines?"
            message={`Permanently delete ${selected().size} selected line(s)?`}
            destructive
            confirmLabel="Delete"
            busy={bulkBusy()}
            onConfirm={applyDeleteLines}
            onCancel={() => setDelLinesOpen(false)}
          />
        </div>
      )}
    </Show>
  );
}

function DetailFallback(props: { loading: boolean; error?: Error }): JSX.Element {
  return (
    <div class="page">
      <div class="page-body detail-fallback">
        <Show when={props.loading}>
          <p>Loading stocktake…</p>
        </Show>
        <Show when={props.error}>
          <Icon name="circle-alert" size={32} />
          <p>{props.error?.message}</p>
        </Show>
        <Show when={!props.loading && !props.error}>
          <Icon name="circle-alert" size={32} />
          <p>Stocktake not found.</p>
        </Show>
      </div>
    </div>
  );
}
