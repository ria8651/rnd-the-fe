import { createMemo, createSignal, For, Show, type JSX } from 'solid-js';
import { A, useParams } from '@solidjs/router';
import { createQuery, useQueryClient } from '@tanstack/solid-query';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../components/ui/Toast';
import {
  batchStocktakeLines,
  fetchLocations,
  fetchReasonOptions,
  fetchStocktake,
  fetchStocktakeLines,
  finaliseStocktake,
  setLinesLocation,
  updateStocktake,
} from '../../api/stocktakes';
import type { ReasonOption, StocktakeLine } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Checkbox } from '../../components/ui/Checkbox';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { SplitButton } from '../../components/ui/SplitButton';
import { StatusCrumbs } from '../../components/ui/StatusCrumbs';
import { LineEditor } from './LineEditor';
import { formatDate, formatDateTime, formatNumber, formatSigned } from '../../lib/format';
import { reasonState } from '../../lib/reasons';
import '../../components/ui/table.css';
import './detail.css';

const PAGE_SIZE = 50;

interface LineError {
  counted?: string;
  snapshot?: string;
  reason?: string;
}

export function StocktakeDetail(): JSX.Element {
  const params = useParams();
  const stocktakeId = () => params.id!;
  const store = useStore();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [itemFilter, setItemFilter] = createSignal('');
  const [page, setPage] = createSignal(0);
  const [selected, setSelected] = createSignal<Set<string>>(new Set());
  const [lineErrors, setLineErrors] = createSignal<Record<string, LineError>>({});
  const [banner, setBanner] = createSignal<string | null>(null);

  // Line editor (S4): the only surface that edits line data.
  const [editorMode, setEditorMode] = createSignal<'create' | 'edit' | null>(null);
  const [editingLine, setEditingLine] = createSignal<StocktakeLine | null>(null);

  const [confirmFinalise, setConfirmFinalise] = createSignal(false);
  const [confirmReduce, setConfirmReduce] = createSignal(false);
  const [confirmDeleteLines, setConfirmDeleteLines] = createSignal(false);
  const [showLocation, setShowLocation] = createSignal(false);
  const [locationChoice, setLocationChoice] = createSignal<string | null>(null);
  const [busy, setBusy] = createSignal(false);

  const headerQ = createQuery(() => ({
    queryKey: ['stocktake', store.storeId(), stocktakeId()],
    queryFn: () => fetchStocktake(store.storeId(), stocktakeId()),
  }));
  const reasonsQ = createQuery(() => ({ queryKey: ['reasonOptions'], queryFn: fetchReasonOptions, staleTime: 5 * 60_000 }));
  const locationsQ = createQuery(() => ({ queryKey: ['locations', store.storeId()], queryFn: () => fetchLocations(store.storeId()), staleTime: 5 * 60_000 }));
  const linesQ = createQuery(() => ({
    queryKey: ['stocktakeLines', store.storeId(), stocktakeId(), page(), itemFilter()],
    queryFn: () =>
      fetchStocktakeLines({
        storeId: store.storeId(),
        stocktakeId: stocktakeId(),
        first: PAGE_SIZE,
        offset: page() * PAGE_SIZE,
        itemCodeOrName: itemFilter() || undefined,
      }),
  }));

  const header = () => headerQ.data;
  const reasons = (): ReasonOption[] => reasonsQ.data ?? [];
  const lines = () => linesQ.data?.nodes ?? [];
  const totalLines = () => linesQ.data?.totalCount ?? 0;
  const pageCount = () => Math.max(1, Math.ceil(totalLines() / PAGE_SIZE));

  const editable = () => header()?.status === 'NEW' && !header()?.isLocked;

  const differenceOf = (l: StocktakeLine): number | null =>
    l.countedNumberOfPacks == null ? null : l.countedNumberOfPacks - l.snapshotNumberOfPacks;

  // A row needs attention if a reason is required for its adjustment but missing.
  const reasonMissing = (l: StocktakeLine): boolean =>
    editable() && reasonState(reasons(), l.snapshotNumberOfPacks, l.countedNumberOfPacks, l.reasonOption?.id) === 'missing';

  const invalidateLines = () => {
    queryClient.invalidateQueries({ queryKey: ['stocktakeLines', store.storeId(), stocktakeId()] });
    queryClient.invalidateQueries({ queryKey: ['stocktake', store.storeId(), stocktakeId()] });
  };

  const presentItemIds = createMemo(() => new Set(lines().map((l) => l.itemId)));

  // ---- Editing opens the line editor (AC-D2) ----
  const openEdit = (line: StocktakeLine) => {
    if (!editable()) return;
    setEditingLine(line);
    setEditorMode('edit');
  };
  const openCreate = () => {
    setEditingLine(null);
    setEditorMode('create');
  };
  const closeEditor = () => setEditorMode(null);

  const toggleLock = async () => {
    const h = header();
    if (!h) return;
    setBusy(true);
    try {
      const res = await updateStocktake(store.storeId(), { id: h.id, isLocked: !h.isLocked });
      if (!res.ok) toast.show(res.errorMessage ?? 'Could not change lock', 'error');
      else {
        toast.show(h.isLocked ? 'Unlocked' : 'Locked', 'success');
        queryClient.invalidateQueries({ queryKey: ['stocktake', store.storeId(), stocktakeId()] });
      }
    } finally {
      setBusy(false);
    }
  };

  const doFinalise = async () => {
    setBusy(true);
    setBanner(null);
    try {
      const res = await finaliseStocktake(store.storeId(), stocktakeId());
      if (res.ok) {
        toast.show('Stocktake finalised', 'success');
        setConfirmFinalise(false);
        invalidateLines();
        return;
      }
      const errs: Record<string, LineError> = {};
      if (res.reducedStockLineIds?.length) {
        for (const line of lines()) {
          if (line.stockLine && res.reducedStockLineIds.includes(line.stockLine.id)) {
            errs[line.id] = { counted: 'Would reduce stock below zero' };
          }
        }
      }
      if (res.mismatchStocktakeLineIds?.length) {
        for (const id of res.mismatchStocktakeLineIds) {
          errs[id] = { ...errs[id], snapshot: 'Stock changed since count was generated' };
        }
      }
      setLineErrors(errs);
      setBanner(res.message ?? 'Finalise failed');
      setConfirmFinalise(false);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Finalise failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const onFinaliseClick = () => {
    if (totalLines() === 0) {
      toast.show('Nothing counted to finalise', 'info');
      return;
    }
    setConfirmFinalise(true);
  };

  // ---- Selection + bulk actions ----
  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set<string>(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const allSelected = () => lines().length > 0 && lines().every((l) => selected().has(l.id));
  const someSelected = () => selected().size > 0;
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set<string>(prev);
      if (allSelected()) lines().forEach((l) => next.delete(l.id));
      else lines().forEach((l) => next.add(l.id));
      return next;
    });

  const reduceToZero = async () => {
    setBusy(true);
    try {
      const res = await batchStocktakeLines(store.storeId(), {
        update: [...selected()].map((id) => ({ id, countedNumberOfPacks: 0 })),
      });
      if (!res.ok) {
        const errs: Record<string, LineError> = {};
        for (const e of res.perLineErrors) errs[e.lineId] = { reason: e.message };
        setLineErrors(errs);
        toast.show('Set to 0 — some lines still need a reason (open them to set it)', 'info');
      } else {
        toast.show(`Reduced ${selected().size} line(s) to 0`, 'success');
      }
      setSelected(new Set<string>());
      setConfirmReduce(false);
      invalidateLines();
    } finally {
      setBusy(false);
    }
  };

  const changeLocation = async () => {
    setBusy(true);
    try {
      const res = await setLinesLocation(store.storeId(), [...selected()], locationChoice());
      if (!res.ok) toast.show(res.perLineErrors[0]?.message ?? 'Could not change location', 'error');
      else {
        toast.show('Location updated', 'success');
        setSelected(new Set<string>());
        invalidateLines();
      }
      setShowLocation(false);
    } finally {
      setBusy(false);
    }
  };

  const deleteLines = async () => {
    setBusy(true);
    try {
      const res = await batchStocktakeLines(store.storeId(), { deleteIds: [...selected()] });
      if (!res.ok) toast.show(res.perLineErrors[0]?.message ?? 'Could not delete lines', 'error');
      else {
        toast.show(`Deleted ${selected().size} line(s)`, 'success');
        setSelected(new Set<string>());
        invalidateLines();
      }
      setConfirmDeleteLines(false);
    } finally {
      setBusy(false);
    }
  };

  const setDescription = async (value: string) => {
    const h = header();
    if (!h || value === (h.description ?? '')) return;
    await updateStocktake(store.storeId(), { id: h.id, description: value });
    queryClient.invalidateQueries({ queryKey: ['stocktake', store.storeId(), stocktakeId()] });
  };

  return (
    <div class="page">
      <div class="detail-header">
        <A href="/stocktakes" class="detail-back">
          <Icon name="arrow-left" size={16} /> Stocktakes
        </A>

        <Show when={header()} fallback={<div class="table-state"><span class="spinner" style={{ margin: '0 auto' }} /></div>}>
          <div class="detail-title-row">
            <h1 class="page__title">Stocktake #{header()!.stocktakeNumber}</h1>
            <StatusBadge status={header()!.status} />
            <Show when={header()!.isLocked}>
              <span class="badge badge--neutral"><Icon name="lock" size={14} /> Locked</span>
            </Show>
            <div class="grow" />
            <div class="detail-actions">
              <Show when={editable()}>
                <Button variant="secondary" onClick={openCreate}>
                  <Icon name="plus-circle" size={18} /> Add item
                </Button>
              </Show>
            </div>
          </div>

          {/* Editability / status messaging (S3, colour-independent) */}
          <Show when={header()!.status === 'FINALISED'}>
            <div class="banner banner--info">
              <Icon name="info" size={18} />
              <span>This stocktake is finalised and read-only. Finalised {formatDateTime(header()!.finalisedDatetime)}.</span>
            </div>
          </Show>
          <Show when={header()!.status === 'NEW' && header()!.isLocked}>
            <div class="banner banner--warning">
              <Icon name="lock" size={18} />
              <span>This stocktake is locked. Unlock it to make changes.</span>
            </div>
          </Show>
          <Show when={banner()}>
            <div class="banner banner--error">
              <Icon name="alert" size={18} />
              <span>{banner()}</span>
            </div>
          </Show>

          {/* Header meta */}
          <div class="detail-meta">
            <div class="detail-meta__item">
              <span class="detail-meta__label">Description</span>
              <Show when={editable()} fallback={<span>{header()!.description || '—'}</span>}>
                <input class="input input--sm" value={header()!.description ?? ''} onChange={(e) => setDescription(e.currentTarget.value)} />
              </Show>
            </div>
            <div class="detail-meta__item">
              <span class="detail-meta__label">Created</span>
              <span class="tnum">{formatDateTime(header()!.createdDatetime)}</span>
            </div>
            <div class="detail-meta__item">
              <span class="detail-meta__label">Comment</span>
              <span>{header()!.comment || '—'}</span>
            </div>
            <div class="detail-meta__item">
              <span class="detail-meta__label">Lines</span>
              <span class="tnum">{formatNumber(totalLines())}</span>
            </div>
          </div>

          {/* Status region: lifecycle crumbs + lock + status-change split button */}
          <div class="detail-status-region">
            <StatusCrumbs
              steps={[
                { value: 'NEW', label: 'New', reachedAt: header()!.createdDatetime },
                { value: 'FINALISED', label: 'Finalised', reachedAt: header()!.finalisedDatetime },
              ]}
              current={header()!.status}
              formatTime={formatDateTime}
            />
            <div class="grow" />
            <Show when={header()!.status === 'NEW'}>
              <Button variant="secondary" onClick={toggleLock} busy={busy()}>
                <Icon name={header()!.isLocked ? 'unlock' : 'lock'} size={18} />
                {header()!.isLocked ? 'Unlock' : 'Lock'}
              </Button>
            </Show>
            <Show when={editable()}>
              <SplitButton
                icon="arrow-right"
                options={[
                  { value: 'NEW', label: 'New', disabled: true },
                  { value: 'FINALISED', label: 'Save & confirm → Finalised' },
                ]}
                selected="FINALISED"
                onSelect={() => {}}
                onActivate={onFinaliseClick}
                busy={busy()}
              />
            </Show>
          </div>
        </Show>
      </div>

      {/* Line table toolbar */}
      <div class="toolbar">
        <div class="row" style={{ gap: 'var(--sp-2)', 'min-width': '260px' }}>
          <Icon name="search" size={18} />
          <input
            class="input input--sm"
            placeholder="Filter by item code or name…"
            value={itemFilter()}
            onInput={(e) => {
              setItemFilter(e.currentTarget.value);
              setPage(0);
            }}
          />
        </div>
        <div class="grow" />
        <Show when={editable() && someSelected()}>
          <span class="muted">{selected().size} selected</span>
          <Button variant="secondary" size="sm" onClick={() => setConfirmReduce(true)}>Reduce to 0</Button>
          <Button variant="secondary" size="sm" onClick={() => setShowLocation(true)}>Change location</Button>
          <Button variant="destructive" size="sm" onClick={() => setConfirmDeleteLines(true)}>
            <Icon name="delete" size={16} /> Delete
          </Button>
        </Show>
      </div>

      {/* Read-only review table — selecting a row opens the editor (AC-D1/D2) */}
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <Show when={editable()}>
                <th class="center" style={{ width: '48px' }}>
                  <Checkbox checked={allSelected()} indeterminate={!allSelected() && someSelected()} onChange={toggleAll} aria-label="Select all lines" />
                </th>
              </Show>
              <th style={{ width: '120px' }}>Item code</th>
              <th>Item name</th>
              <th class="p3">Batch</th>
              <th class="p2" style={{ width: '120px' }}>Expiry</th>
              <th class="p3">Location</th>
              <th class="p2 num" style={{ width: '90px' }}>Pack size</th>
              <th class="num" style={{ width: '110px' }}>Snapshot</th>
              <th class="num" style={{ width: '110px' }}>Counted</th>
              <th class="num" style={{ width: '100px' }}>Difference</th>
              <th style={{ width: '180px' }}>Reason</th>
              <Show when={editable()}><th class="center" style={{ width: '56px' }}>Edit</th></Show>
            </tr>
          </thead>
          <tbody>
            <Show when={!linesQ.isLoading} fallback={<tr><td colSpan={12} class="table-state"><span class="spinner" style={{ margin: '0 auto' }} /></td></tr>}>
              <Show when={lines().length > 0} fallback={
                <tr><td colSpan={12} class="table-state">
                  <Show when={itemFilter()} fallback={<span>This stocktake has no lines yet.</span>}>
                    No lines match “{itemFilter()}”.
                  </Show>
                </td></tr>
              }>
                <For each={lines()}>
                  {(line) => {
                    const err = () => lineErrors()[line.id];
                    const rowError = () => !!err() || reasonMissing(line);
                    return (
                      <tr
                        class={editable() ? 'row-select' : ''}
                        data-selected={selected().has(line.id)}
                        data-error={rowError()}
                        onClick={() => openEdit(line)}
                      >
                        <Show when={editable()}>
                          <td class="center" onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={selected().has(line.id)} onChange={() => toggleRow(line.id)} aria-label={`Select ${line.itemName}`} />
                          </td>
                        </Show>
                        <td>
                          <div class="row" style={{ gap: 'var(--sp-1)' }}>
                            <Show when={rowError()}><span title="Line needs attention"><Icon name="alert" size={14} /></span></Show>
                            <span class="tnum">{line.item.code}</span>
                          </div>
                        </td>
                        <td><div class="truncate" style={{ 'max-width': '280px' }} title={line.itemName}>{line.itemName}</div></td>
                        <td class="p3">{line.batch}</td>
                        <td class="p2 tnum">{formatDate(line.expiryDate)}</td>
                        <td class="p3">{line.location?.code ?? '—'}</td>
                        <td class="p2 num tnum">{formatNumber(line.packSize)}</td>
                        <td class="num tnum">
                          {formatNumber(line.snapshotNumberOfPacks)}
                          <Show when={err()?.snapshot}><div class="cell-error"><Icon name="alert" size={14} /> {err()!.snapshot}</div></Show>
                        </td>
                        <td class="num tnum">
                          {line.countedNumberOfPacks == null ? <span class="muted">—</span> : formatNumber(line.countedNumberOfPacks)}
                          <Show when={err()?.counted}><div class="cell-error"><Icon name="alert" size={14} /> {err()!.counted}</div></Show>
                        </td>
                        <td class="num tnum" style={{ color: 'var(--text-secondary)' }}>{formatSigned(differenceOf(line))}</td>
                        <td>
                          <Show when={line.reasonOption} fallback={<span class={reasonMissing(line) ? '' : 'muted'} style={reasonMissing(line) ? { color: 'var(--state-error-main)' } : undefined}>{reasonMissing(line) ? 'Reason required' : '—'}</span>}>
                            <span>{line.reasonOption!.reason}</span>
                          </Show>
                          <Show when={err()?.reason}><div class="cell-error" style={{ 'justify-content': 'flex-start' }}><Icon name="alert" size={14} /> {err()!.reason}</div></Show>
                        </td>
                        <Show when={editable()}>
                          <td class="center" onClick={(e) => e.stopPropagation()}>
                            <button class="btn btn--ghost btn--icon btn--sm" aria-label={`Edit ${line.itemName}`} onClick={() => openEdit(line)}>
                              <Icon name="edit" size={16} />
                            </button>
                          </td>
                        </Show>
                      </tr>
                    );
                  }}
                </For>
              </Show>
            </Show>
          </tbody>
        </table>
      </div>

      <Show when={pageCount() > 1}>
        <div class="pagination">
          <span>{totalLines() === 0 ? 0 : page() * PAGE_SIZE + 1}–{Math.min((page() + 1) * PAGE_SIZE, totalLines())} of {totalLines()}</span>
          <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page() === 0}><Icon name="arrow-left" size={16} /></Button>
          <span>{page() + 1} / {pageCount()}</span>
          <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(pageCount() - 1, p + 1))} disabled={page() + 1 >= pageCount()}><Icon name="arrow-right" size={16} /></Button>
        </div>
      </Show>

      {/* Line editor (S4) */}
      <Show when={editorMode()}>
        <LineEditor
          stocktakeId={stocktakeId()}
          mode={editorMode()!}
          line={editingLine() ?? undefined}
          lines={lines()}
          reasons={reasons()}
          locations={locationsQ.data ?? []}
          excludeItemIds={presentItemIds()}
          onClose={closeEditor}
          onSaved={invalidateLines}
        />
      </Show>

      {/* Finalise confirmation */}
      <Show when={confirmFinalise()}>
        <Modal
          title="Save & confirm stocktake?"
          maxWidth={460}
          onClose={() => setConfirmFinalise(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmFinalise(false)} disabled={busy()}>Cancel</Button>
              <Button variant="primary" busy={busy()} onClick={doFinalise}>Finalise</Button>
            </>
          }
        >
          <p>Finalising applies all counted differences as inventory adjustments and makes this stocktake read-only. Uncounted lines are removed. This cannot be undone.</p>
        </Modal>
      </Show>

      <Show when={confirmReduce()}>
        <Modal
          title="Reduce to zero?"
          maxWidth={440}
          onClose={() => setConfirmReduce(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmReduce(false)} disabled={busy()}>Cancel</Button>
              <Button variant="primary" busy={busy()} onClick={reduceToZero}>Set to 0</Button>
            </>
          }
        >
          <p>Set counted packs to 0 for {selected().size} selected line(s)? Lines that need an adjustment reason will be flagged to open and complete.</p>
        </Modal>
      </Show>

      <Show when={confirmDeleteLines()}>
        <Modal
          title="Delete lines?"
          maxWidth={440}
          onClose={() => setConfirmDeleteLines(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmDeleteLines(false)} disabled={busy()}>Cancel</Button>
              <Button variant="destructive" busy={busy()} onClick={deleteLines}>Delete</Button>
            </>
          }
        >
          <p>Delete {selected().size} selected line(s) from this stocktake?</p>
        </Modal>
      </Show>

      <Show when={showLocation()}>
        <Modal
          title="Change location"
          maxWidth={440}
          onClose={() => setShowLocation(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowLocation(false)} disabled={busy()}>Cancel</Button>
              <Button variant="primary" busy={busy()} onClick={changeLocation}>Apply</Button>
            </>
          }
        >
          <div class="field">
            <label class="field__label">Location for {selected().size} line(s)</label>
            <Select
              value={locationChoice()}
              options={(locationsQ.data ?? []).map((l) => ({ value: l.id, label: `${l.code} · ${l.name}` }))}
              onChange={setLocationChoice}
              placeholder="Select location"
              searchable
            />
          </div>
        </Modal>
      </Show>
    </div>
  );
}
