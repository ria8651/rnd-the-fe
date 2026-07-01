/**
 * S3 — Stocktake detail screen (spec/stocktakes/05-ui-surface.md › S3). View one stocktake,
 * review its lines (read-only table — AC-D1), manage the line set via the line editor (S4 —
 * AC-D2), and finalise. Header/metadata fields are edited in place and auto-saved (AC-E6/E7).
 * Lifecycle controls (lock, status crumbs New→Finalised, finalise split button) live in a
 * persistent action footer (AC-D3); the bulk-line-action bar takes over that region when rows
 * are selected. Every edit affordance shares the one editability gate (NEW and unlocked).
 */
import { type JSX, Show, createEffect, createMemo, createResource, createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import { useNavigate, useParams } from '@solidjs/router';
import { PageLayout } from '../../chrome/PageLayout';
import { Table } from '../../ui/Table';
import type { Column } from '../../ui/table-model';
import { Icon } from '../../ui/Icon';
import { Button, IconButton } from '../../ui/Button';
import { StatusBadge } from '../../ui/StatusBadge';
import { StatusCrumbs } from '../../ui/StatusCrumbs';
import { SplitButton } from '../../ui/SplitButton';
import { Banner } from '../../ui/Banner';
import { Toggle } from '../../ui/inputs/Toggle';
import { TextField } from '../../ui/inputs/TextField';
import { SelectField } from '../../ui/inputs/SelectField';
import { Modal, ConfirmDialog } from '../../ui/Modal';
import { toast } from '../../ui/toast';
import { formatDate, formatDateTime, formatDelta, formatNumber } from '../../format';
import { createAutosave } from '../../util/autosave';
import { auth } from '../../state/auth';
import { getStocktakeByNumber, updateStocktake, batchStocktakeLines, deleteStocktakes, type UpsertLineInput } from './api';
import { listReasonOptions, listLocations, type Ref } from './reference';
import {
  editBlockReason,
  isEditable,
  packDifference,
  finaliseCheck,
  errorSurface,
  reasonTypeMatchesDirection,
  type LineProblem
} from './rules';
import type { StocktakeLine } from './types';
import { StocktakeLineEditor } from './StocktakeLineEditor';

type HeaderField = 'description' | 'comment' | 'countedBy' | 'verifiedBy';

export function StocktakeDetailPage(): JSX.Element {
  const params = useParams();
  const navigate = useNavigate();
  const number = () => Number(params.number);

  const [data, { refetch, mutate }] = createResource(
    () => ({ storeId: auth.storeId, n: number() }),
    (p) => getStocktakeByNumber(p.storeId, p.n)
  );
  const [reasons] = createResource(() => auth.storeId, () => listReasonOptions().catch(() => []));
  const [locations] = createResource(() => auth.storeId, () => listLocations(auth.storeId).catch(() => [] as Ref[]));

  const st = () => data() ?? undefined;
  const editable = () => (st() ? isEditable(st()!) : false);
  const blockReason = () => (st() ? editBlockReason(st()!) : null);

  // ── In-place header editing (optimistic + debounced, flush-on-leave — D1/AC-E6/E7) ──
  const [header, setHeader] = createStore({ description: '', comment: '', countedBy: '', verifiedBy: '' });
  let syncedId = '';
  createEffect(() => {
    const s = st();
    if (s && s.id !== syncedId) {
      syncedId = s.id;
      setHeader({
        description: s.description ?? '',
        comment: s.comment ?? '',
        countedBy: s.countedBy ?? '',
        verifiedBy: s.verifiedBy ?? ''
      });
    }
  });

  const commit = async (field: HeaderField, value: string) => {
    const s = st();
    if (!s) return;
    const res = await updateStocktake(auth.storeId, { id: s.id, [field]: value });
    if (res.ok) {
      mutate((prev) => (prev ? { ...prev, [field]: value } : prev));
    } else {
      // Rollback to the last saved value and surface the error (banner-class errors as a toast).
      setHeader(field, (s[field] as string | null) ?? '');
      toast(`Could not save — ${res.errorType}`, 'error');
    }
  };
  const savers: Record<HeaderField, ReturnType<typeof createAutosave<string>>> = {
    description: createAutosave((v) => commit('description', v)),
    comment: createAutosave((v) => commit('comment', v)),
    countedBy: createAutosave((v) => commit('countedBy', v)),
    verifiedBy: createAutosave((v) => commit('verifiedBy', v))
  };
  const editField = (field: HeaderField, value: string) => {
    setHeader(field, value); // optimistic
    savers[field].schedule(value);
  };

  // ── View filter over the line table (not a stored field; always available) ──────────
  const [itemFilter, setItemFilter] = createSignal('');
  const lines = createMemo<StocktakeLine[]>(() => {
    const all = st()?.lines ?? [];
    const q = itemFilter().trim().toLowerCase();
    if (!q) return all;
    return all.filter((l) => l.itemName.toLowerCase().includes(q) || (l.item.code ?? '').toLowerCase().includes(q));
  });

  // ── Finalise pre-flight errors, keyed by line id ────────────────────────────────────
  const [lineErrors, setLineErrors] = createSignal<Record<string, LineProblem[]>>({});
  const cellError = (row: StocktakeLine, key: string): string | undefined => {
    const errs = lineErrors()[row.id];
    if (!errs) return undefined;
    if (key === 'snapshot' && errs.includes('snapshotMismatch')) return 'Snapshot no longer matches current stock';
    if (key === 'counted' && errs.includes('reduceBelowZero')) return 'Would reduce stock below zero';
    if (key === 'reason' && errs.includes('reasonRequired')) return 'A reason is required';
    if (key === 'reason' && errs.includes('reasonInvalid')) return 'Reason not valid for this adjustment';
    return undefined;
  };
  const rowError = (row: StocktakeLine) => (lineErrors()[row.id]?.length ? 'This line has a problem — see highlighted cells' : undefined);

  // ── Line editor (S4) ────────────────────────────────────────────────────────────────
  const [editorOpen, setEditorOpen] = createSignal(false);
  const [editorLine, setEditorLine] = createSignal<StocktakeLine | null>(null);
  const openAdd = () => {
    setEditorLine(null);
    setEditorOpen(true);
  };
  const openEdit = (line: StocktakeLine) => {
    setEditorLine(line);
    setEditorOpen(true);
  };

  // ── Selection + bulk actions (J5) ────────────────────────────────────────────────────
  const [selected, setSelected] = createSignal<Set<string>>(new Set());
  const [confirmReduce, setConfirmReduce] = createSignal(false);
  const [reduceReasonId, setReduceReasonId] = createSignal('');
  const [changeLocOpen, setChangeLocOpen] = createSignal(false);
  const [bulkLocId, setBulkLocId] = createSignal('');
  const [confirmDeleteLines, setConfirmDeleteLines] = createSignal(false);
  const selectedLines = () => lines().filter((l) => selected().has(l.id));

  // Reducing to zero is a negative adjustment, so it needs a reason under the same rules as
  // line save (AC-E8). Offer reduction-valid reasons; a vaccine-only selection offers the
  // vaccine-wastage subset. When none are configured, no reason is required.
  const WASTAGE_TYPES = ['OPEN_VIAL_WASTAGE', 'CLOSED_VIAL_WASTAGE'];
  const selectionAllVaccine = () => selectedLines().length > 0 && selectedLines().every((l) => l.item.isVaccine);
  const reduceReasonOptions = () => {
    const negative = (reasons() ?? []).filter((r) => r.isActive && reasonTypeMatchesDirection(r.type, 'negative'));
    const wastage = negative.filter((r) => WASTAGE_TYPES.includes(r.type));
    return selectionAllVaccine() && wastage.length ? wastage : negative;
  };
  const reduceNeedsReason = () => reduceReasonOptions().length > 0;

  const runBatch = async (edits: { upserts?: UpsertLineInput[]; deleteIds?: string[] }, okMsg: string) => {
    const s = st();
    if (!s) return;
    try {
      const res = await batchStocktakeLines(auth.storeId, edits);
      const failed = [...res.inserts, ...res.updates, ...res.deletes].filter((r) => r.errorType);
      if (failed.length) toast(`${failed.length} line(s) failed: ${failed[0]!.errorType}`, 'error');
      else toast(okMsg, 'success');
      setSelected(new Set<string>());
      await refetch();
    } catch {
      toast('Operation failed', 'error');
    }
  };
  const reduceToZero = () => {
    const s = st();
    if (!s) return;
    if (reduceNeedsReason() && !reduceReasonId()) return; // confirm is gated on a reason
    const reasonOptionId = reduceReasonId() || undefined;
    void runBatch(
      { upserts: selectedLines().map((l) => ({ id: l.id, stocktakeId: s.id, countedNumberOfPacks: 0, reasonOptionId })) },
      'Selected lines reduced to zero'
    );
    setConfirmReduce(false);
    setReduceReasonId('');
  };
  const changeLocation = () => {
    const s = st();
    if (!s) return;
    void runBatch(
      { upserts: selectedLines().map((l) => ({ id: l.id, stocktakeId: s.id, location: { value: bulkLocId() || null } })) },
      'Location updated'
    );
    setChangeLocOpen(false);
  };
  const deleteLines = () => {
    void runBatch({ deleteIds: [...selected()] }, 'Lines deleted');
    setConfirmDeleteLines(false);
  };

  // ── Finalise (J7) ────────────────────────────────────────────────────────────────────
  const [confirmFinalise, setConfirmFinalise] = createSignal(false);
  const [finalising, setFinalising] = createSignal(false);
  const attemptFinalise = () => {
    const s = st();
    if (!s) return;
    const check = finaliseCheck(s, s.lines, reasons() ?? []);
    if (check.blockers.includes('noCountedLines')) {
      toast('Nothing counted to finalise', 'error');
      return;
    }
    if (Object.keys(check.lineErrors).length) {
      setLineErrors(check.lineErrors);
      toast('Fix the highlighted lines before finalising', 'error');
      return;
    }
    setLineErrors({});
    setConfirmFinalise(true);
  };
  const doFinalise = async () => {
    const s = st();
    if (!s) return;
    setFinalising(true);
    try {
      const res = await updateStocktake(auth.storeId, { id: s.id, status: 'FINALISED' });
      if (res.ok) {
        toast('Stocktake finalised', 'success');
        setConfirmFinalise(false);
        await refetch();
      } else {
        const surface = errorSurface(res.errorType);
        if (surface === 'line') {
          // Re-run the pre-flight so the offending lines are marked for the user.
          setLineErrors(finaliseCheck(s, s.lines, reasons() ?? []).lineErrors);
        }
        toast(`Finalise rejected — ${res.errorType}`, 'error');
        setConfirmFinalise(false);
      }
    } finally {
      setFinalising(false);
    }
  };

  // ── Lock / unlock (J6) ────────────────────────────────────────────────────────────────
  const toggleLock = async () => {
    const s = st();
    if (!s) return;
    const res = await updateStocktake(auth.storeId, { id: s.id, isLocked: !s.isLocked });
    if (res.ok) {
      mutate((prev) => (prev ? { ...prev, isLocked: !prev.isLocked } : prev));
      toast(s.isLocked ? 'Stocktake unlocked' : 'Stocktake locked', 'success');
    } else {
      toast(`Could not change lock — ${res.errorType}`, 'error');
    }
  };

  // ── Record actions ─────────────────────────────────────────────────────────────────────
  const [sideOpen, setSideOpen] = createSignal(true);
  const [confirmDeleteRecord, setConfirmDeleteRecord] = createSignal(false);
  const deleteRecord = async () => {
    const s = st();
    if (!s) return;
    try {
      await deleteStocktakes(auth.storeId, [s.id]);
      toast('Stocktake deleted', 'success');
      navigate('/stocktakes');
    } catch {
      toast('Delete failed', 'error');
    }
  };
  const copyRecord = async () => {
    const s = st();
    if (!s) return;
    const text = `Stocktake #${s.stocktakeNumber} — ${s.status}\n${s.description ?? ''}\nLines: ${s.lineCount}`;
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied to clipboard', 'success');
    } catch {
      toast('Copy failed', 'error');
    }
  };

  // ── Line table columns (spec S3 › Line table) ────────────────────────────────────────
  const columns: Column<StocktakeLine>[] = [
    { key: 'code', header: 'Code', role: 'identifier', width: '120px', priority: 1, format: (l) => l.item.code ?? '', tooltip: (l) => l.item.code ?? undefined },
    { key: 'name', header: 'Item', priority: 1, format: (l) => l.itemName },
    { key: 'batch', header: 'Batch', width: '120px', priority: 3, format: (l) => l.batch ?? '' },
    { key: 'expiry', header: 'Expiry', width: '110px', priority: 2, format: (l) => formatDate(l.expiryDate) },
    { key: 'location', header: 'Location', width: '120px', priority: 3, format: (l) => l.location?.name ?? '' },
    { key: 'unit', header: 'Unit', width: '90px', priority: 2, format: (l) => l.item.unitName ?? '' },
    { key: 'packSize', header: 'Pack size', numeric: true, width: '100px', priority: 2, format: (l) => formatNumber(l.packSize) },
    { key: 'snapshot', header: 'Snapshot', numeric: true, width: '110px', priority: 2, format: (l) => formatNumber(l.snapshotNumberOfPacks) },
    {
      key: 'counted',
      header: 'Counted',
      numeric: true,
      width: '110px',
      priority: 1,
      format: (l) => (l.countedNumberOfPacks == null ? '—' : formatNumber(l.countedNumberOfPacks))
    },
    { key: 'difference', header: 'Difference', numeric: true, width: '110px', priority: 1, format: (l) => (l.countedNumberOfPacks == null ? '' : formatDelta(packDifference(l))) },
    { key: 'reason', header: 'Reason', width: '150px', priority: 2, format: (l) => l.reasonOption?.reason ?? '' },
    { key: 'manufacturer', header: 'Manufacturer', priority: 3, format: (l) => l.manufacturer?.name ?? '' },
    { key: 'comment', header: 'Comment', priority: 3, format: (l) => l.comment ?? '' }
  ];

  const crumbSteps = () => {
    const s = st();
    return [
      { value: 'NEW', label: 'New', reachedAt: s?.createdDatetime },
      { value: 'FINALISED', label: 'Finalised', reachedAt: s?.finalisedDatetime ?? null }
    ];
  };

  return (
    <Show when={!data.loading || st()} fallback={<div class="placeholder"><span class="spinner" /> Loading…</div>}>
      <Show when={st()} fallback={<div class="placeholder"><h2>Stocktake not found</h2><a href="/stocktakes">Back to list</a></div>}>
        {(s) => (
          <PageLayout
            sideOpen={sideOpen()}
            title={<>Stocktake #{s().stocktakeNumber}</>}
            toolbarStart={
              <div class="detail-header">
                <TextField
                  label="Description"
                  value={header.description}
                  onInput={(v) => editField('description', v)}
                  onBlur={() => savers.description.flush()}
                  disabled={!editable()}
                  width="260px"
                />
                <TextField
                  label="Find item"
                  value={itemFilter()}
                  onInput={setItemFilter}
                  placeholder="Filter lines…"
                  width="200px"
                />
              </div>
            }
            toolbar={
              <>
                <IconButton icon="plus-circle" label="Add item" text="Add item" onClick={openAdd} disabled={!editable()} />
                <IconButton icon="printer" label="Generate / print report" onClick={() => window.print()} />
                <IconButton icon="sidebar" label="Toggle details" plain onClick={() => setSideOpen(!sideOpen())} />
              </>
            }
            side={<SidePanel />}
            footer={
              <Show
                when={selected().size === 0}
                fallback={
                  <div class="bulk-bar">
                    <button class="icon-btn icon-btn--plain" type="button" aria-label="Clear selection" onClick={() => setSelected(new Set<string>())}>
                      <Icon name="minus-circle" size={20} />
                    </button>
                    <span class="bulk-bar__count">{selected().size} selected</span>
                    <span class="bulk-bar__spacer" />
                    <IconButton icon="rewind" label="Reduce to zero" text="Reduce to zero" onClick={() => setConfirmReduce(true)} />
                    <IconButton icon="arrow-right" label="Change location" text="Location" onClick={() => setChangeLocOpen(true)} />
                    <Button variant="danger" icon="delete" onClick={() => setConfirmDeleteLines(true)}>
                      Delete
                    </Button>
                  </div>
                }
              >
                <div class="status-footer">
                  <Toggle
                    checked={s().isLocked}
                    onChange={toggleLock}
                    ariaLabel={s().isLocked ? 'On hold — unlock to edit' : 'Put on hold'}
                    label="On hold"
                    disabled={s().status === 'FINALISED'}
                  />
                  <div class="status-footer__crumbs">
                    <StatusCrumbs steps={crumbSteps()} current={s().status} />
                  </div>
                  <Show when={editable()}>
                    <SplitButton
                      menuLabel="Change status"
                      value="FINALISED"
                      options={[
                        { value: 'NEW', label: 'New', disabled: true },
                        { value: 'FINALISED', label: 'Save and confirm' }
                      ]}
                      onAction={attemptFinalise}
                    />
                  </Show>
                </div>
              </Show>
            }
          >
            <Show when={blockReason()}>
              <div style={{ 'margin-bottom': 'var(--space-3)' }}>
                <Banner tone={blockReason() === 'finalised' ? 'info' : 'warning'}>
                  <Show
                    when={blockReason() === 'finalised'}
                    fallback={<>This stocktake is on hold. Unlock it (the “On hold” toggle) to resume editing.</>}
                  >
                    This stocktake is finalised and read-only. Its inventory adjustments have been applied.
                  </Show>
                </Banner>
              </div>
            </Show>

            <Table
              columns={columns}
              rows={lines()}
              getRowId={(l) => l.id}
              selectable={editable()}
              selected={selected()}
              onSelectedChange={setSelected}
              cellError={cellError}
              rowError={rowError}
              onRowClick={openEdit}
              emptyText="No lines. Use “Add item” to count a batch."
              caption={`Lines for stocktake ${s().stocktakeNumber}`}
            />
          </PageLayout>
        )}
      </Show>

      {/* Line editor (S4) */}
      <Show when={editorOpen()}>
        <StocktakeLineEditor
          stocktakeId={st()!.id}
          existingLine={editorLine()}
          existingItemIds={(st()?.lines ?? []).map((l) => l.itemId)}
          reasons={reasons() ?? []}
          locations={locations() ?? []}
          siblings={st()?.lines ?? []}
          onNavigate={(l) => setEditorLine(l)}
          onClose={() => setEditorOpen(false)}
          onSaved={async () => {
            setEditorOpen(false);
            await refetch();
          }}
        />
      </Show>

      {/* Confirmations & dialogs */}
      <ConfirmDialog
        open={confirmFinalise()}
        title="Finalise stocktake?"
        message="This applies all counted differences as inventory adjustments and makes the stocktake read-only. It cannot be undone."
        confirmLabel="Save and confirm"
        busy={finalising()}
        onConfirm={doFinalise}
        onCancel={() => setConfirmFinalise(false)}
      />
      <Modal
        open={confirmReduce()}
        title="Reduce to zero?"
        onClose={() => setConfirmReduce(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReduce(false)}>
              Cancel
            </Button>
            <Button variant="primary" icon="rewind" disabled={reduceNeedsReason() && !reduceReasonId()} onClick={reduceToZero}>
              Reduce to zero
            </Button>
          </>
        }
      >
        <p style={{ 'margin-top': 0 }}>Set counted packs to 0 for {selected().size} selected line(s)?</p>
        <Show when={reduceNeedsReason()}>
          <SelectField
            label="Reason"
            required
            value={reduceReasonId()}
            onChange={setReduceReasonId}
            options={reduceReasonOptions().map((r) => ({ value: r.id, label: r.reason }))}
            placeholder="Select a reason…"
            full
          />
        </Show>
      </Modal>
      <ConfirmDialog
        open={confirmDeleteLines()}
        title="Delete lines?"
        message={`Delete ${selected().size} selected line(s)?`}
        confirmLabel="Delete"
        danger
        onConfirm={deleteLines}
        onCancel={() => setConfirmDeleteLines(false)}
      />
      <ConfirmDialog
        open={confirmDeleteRecord()}
        title="Delete stocktake?"
        message="Delete this stocktake? This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={deleteRecord}
        onCancel={() => setConfirmDeleteRecord(false)}
      />
      <Modal
        open={changeLocOpen()}
        title="Change location"
        onClose={() => setChangeLocOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setChangeLocOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={changeLocation}>
              Apply
            </Button>
          </>
        }
      >
        <SelectField
          label={`New location for ${selected().size} line(s)`}
          searchable
          value={bulkLocId()}
          onChange={setBulkLocId}
          options={(locations() ?? []).map((l) => ({ value: l.id, label: l.code ? `${l.name} (${l.code})` : l.name }))}
          placeholder="No location"
          full
        />
      </Modal>
    </Show>
  );

  // ── Side panel (attribution, comment, system fields, record actions) ──────────────────
  function SidePanel(): JSX.Element {
    const s = () => st()!;
    return (
      <div class="detail-side">
        <div>
          <h3>Attribution</h3>
          <div class="form-grid">
            <div class="form-grid--full">
              <TextField label="Counted by" value={header.countedBy} onInput={(v) => editField('countedBy', v)} onBlur={() => savers.countedBy.flush()} disabled={!editable()} full />
            </div>
            <div class="form-grid--full">
              <TextField label="Verified by" value={header.verifiedBy} onInput={(v) => editField('verifiedBy', v)} onBlur={() => savers.verifiedBy.flush()} disabled={!editable()} full />
            </div>
            <div class="form-grid--full">
              <TextField label="Comment" value={header.comment} onInput={(v) => editField('comment', v)} onBlur={() => savers.comment.flush()} disabled={!editable()} multiline rows={2} full />
            </div>
          </div>
        </div>
        <div>
          <h3>Details</h3>
          <dl class="detail-meta">
            <div class="detail-meta__row"><dt>Number</dt><dd>#{s().stocktakeNumber}</dd></div>
            <div class="detail-meta__row">
              <dt>Status</dt>
              <dd>
                <Show when={s().status === 'FINALISED'} fallback={<StatusBadge label="New" tone="info" />}>
                  <StatusBadge label="Finalised" tone="success" icon="check-circle" />
                </Show>
              </dd>
            </div>
            <div class="detail-meta__row"><dt>Lines</dt><dd>{s().lineCount}</dd></div>
            <div class="detail-meta__row"><dt>Created</dt><dd>{formatDateTime(s().createdDatetime)}</dd></div>
            <Show when={s().finalisedDatetime}>
              <div class="detail-meta__row"><dt>Finalised</dt><dd>{formatDateTime(s().finalisedDatetime)}</dd></div>
            </Show>
            <Show when={s().isInitialStocktake}>
              <div class="detail-meta__row"><dt>Type</dt><dd>Initial (opening balance)</dd></div>
            </Show>
          </dl>
        </div>
        <div class="side-actions">
          <Show when={editable()}>
            <Button variant="danger" icon="delete" onClick={() => setConfirmDeleteRecord(true)}>
              Delete stocktake
            </Button>
          </Show>
          <Button variant="secondary" icon="copy" onClick={copyRecord}>
            Copy to clipboard
          </Button>
        </div>
      </div>
    );
  }
}
