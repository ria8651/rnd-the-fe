// S3 — Detail screen. Views one stocktake, manages its header, and shows its
// lines in a READ-ONLY table (all line entry happens in the S4 line editor,
// opened by selecting a row — AC-D1/AC-D2). Header editing + lock/unlock land
// here; add-item / bulk / finalise are wired in Stage 4.
// Spec: ../../../spec/stocktakes/05-ui-surface.md#s3--detail-screen

import { el, mount } from '../../framework/dom.ts';
import { effect, signal } from '../../framework/signal.ts';
import { table, type Column } from '../../components/table.ts';
import { icon } from '../../components/icon.ts';
import { toast } from '../../components/toast.ts';
import { select } from '../../components/select.ts';
import { statusCrumbs } from '../../components/statusCrumbs.ts';
import { splitButton } from '../../components/splitButton.ts';
import { confirmDialog, openDialog } from '../../components/dialog.ts';
import {
  batchStocktakeLines,
  fetchStocktake,
  fetchStocktakeByNumber,
  fetchStocktakeItemIds,
  fetchStocktakeLines,
  finaliseStocktake,
  updateStocktake,
} from '../../api/stocktakes.ts';
import { fetchLocations, fetchReasonOptions, type Location } from '../../api/reference.ts';
import { fetchPreferences, type StockPreferences } from '../../api/preferences.ts';
import { GraphQLError } from '../../api/client.ts';
import { openLineEditor } from './lineEditor.ts';
import { difference, editBlockReason, hasCountedLine, isEditable, reasonsForDirection, statusLabel } from '../../domain/rules.ts';
import { formatDate, formatNumber, formatSigned, toDateInputValue } from '../../domain/format.ts';
import type { Stocktake, StocktakeLine } from '../../domain/types.ts';
import './detail.css';

const LINE_PAGE_SIZE = 50;

/** Per-line validation errors, keyed by line id (populated after failed finalise). */
export interface LineErrorMap {
  [lineId: string]: { snapshot?: string; counted?: string; general?: string };
}

export function renderStocktakeDetail(
  storeId: string,
  ref: { id?: string; byNumber?: number },
): HTMLElement {
  const st = signal<Stocktake | null>(null);
  const loadError = signal<string>('');
  const prefs = signal<StockPreferences>({ manageVaccinesInDoses: false, allowTrackingOfStockByDonor: false });

  const lines = signal<StocktakeLine[]>([]);
  const lineTotal = signal<number>(0);
  const linesState = signal<'loading' | 'error' | 'ready'>('loading');
  const itemFilter = signal<string>('');
  const linePage = signal<number>(0);
  const lineErrors = signal<LineErrorMap>({});
  const sidePanelOpen = signal<boolean>(false);
  const selectedLineIds = signal<Set<string>>(new Set());
  const finalising = signal<boolean>(false);

  const container = el('div', { style: { display: 'contents' } });

  async function loadHeader() {
    try {
      const found =
        ref.byNumber != null
          ? await fetchStocktakeByNumber(ref.byNumber, storeId)
          : await fetchStocktake(ref.id!, storeId);
      if (!found) loadError.set('Stocktake not found.');
      else st.set(found);
    } catch (e) {
      loadError.set(e instanceof GraphQLError ? e.message : 'Failed to load stocktake.');
    }
  }

  async function loadLines() {
    const current = st();
    if (!current) return;
    linesState.set('loading');
    try {
      const res = await fetchStocktakeLines({
        storeId,
        stocktakeId: current.id,
        first: LINE_PAGE_SIZE,
        offset: linePage() * LINE_PAGE_SIZE,
        itemLike: itemFilter().trim() || undefined,
      });
      lines.set(res.nodes);
      lineTotal.set(res.totalCount);
      linesState.set('ready');
    } catch {
      linesState.set('error');
    }
  }

  // Persist a header field edit, optimistically merging the result.
  async function saveHeader(patch: Partial<Record<'description' | 'comment' | 'countedBy' | 'verifiedBy' | 'stocktakeDate', string>>) {
    const current = st();
    if (!current) return;
    try {
      const res = await updateStocktake({ id: current.id, ...patch }, storeId);
      if (res.ok) st.set(res.value);
      else toast(res.error, 'error');
    } catch (e) {
      toast(e instanceof GraphQLError ? e.message : 'Could not save.', 'error');
    }
  }

  async function toggleLock() {
    const current = st();
    if (!current) return;
    const res = await updateStocktake({ id: current.id, isLocked: !current.isLocked }, storeId);
    if (res.ok) {
      st.set(res.value);
      toast(res.value.isLocked ? 'Stocktake locked.' : 'Stocktake unlocked.', 'success');
    } else {
      toast(res.error, 'error');
    }
  }

  function applyItemFilter(value: string) {
    itemFilter.set(value);
    linePage.set(0);
    loadLines();
  }

  async function afterLineChange() {
    selectedLineIds.set(new Set());
    await loadLines();
  }

  // Distinct items among the loaded lines, for the editor's prev/next navigation.
  function loadedItemSiblings() {
    const seen = new Map<string, { id: string; name: string; unitName?: string | null }>();
    for (const l of lines()) if (!seen.has(l.itemId)) seen.set(l.itemId, { id: l.itemId, name: l.itemName, unitName: l.item.unitName });
    return [...seen.values()];
  }

  async function openAddItem() {
    const current = st();
    if (!current) return;
    let excludeItemIds = new Set<string>();
    try {
      excludeItemIds = await fetchStocktakeItemIds(current.id, storeId);
    } catch { /* fall back to no exclusion */ }
    openLineEditor({ storeId, stocktakeId: current.id, excludeItemIds, onSaved: afterLineChange });
  }

  function openEditLine(line: StocktakeLine) {
    const current = st();
    if (!current || !isEditable(current)) return;
    openLineEditor({
      storeId,
      stocktakeId: current.id,
      item: { id: line.itemId, name: line.itemName, unitName: line.item.unitName },
      excludeItemIds: new Set(),
      siblings: loadedItemSiblings(),
      onSaved: afterLineChange,
    });
  }

  async function bulkReduceToZero() {
    const ids = [...selectedLineIds()];
    if (!ids.length) return;
    // Counting a stocked line to zero is a negative adjustment, which the server
    // requires a reason for when negative reasons are configured. So the dialog
    // offers a reason picker (required when such reasons exist). This is not
    // spelled out in J5/AC-E5 but follows from the reason rules in 03.
    let negativeReasons: ReturnType<typeof reasonsForDirection> = [];
    try {
      negativeReasons = reasonsForDirection(await fetchReasonOptions(), 'negative');
    } catch { /* proceed without */ }

    let chosenReason: string | null = null;
    const proceed = await new Promise<boolean>((resolve) => {
      const picker = negativeReasons.length
        ? select<string | null>({
            options: negativeReasons.map((r) => ({ value: r.id, label: r.reason })),
            value: null,
            placeholder: 'Choose a reason…',
            ariaLabel: 'Reduction reason',
            onChange: (v) => { chosenReason = v; },
          })
        : null;
      const dlg = openDialog({
        title: 'Reduce to zero',
        body: el(
          'div',
          { class: 'field' },
          el('p', { style: { marginTop: '0' } }, `Set counted packs to 0 for ${ids.length} selected line${ids.length > 1 ? 's' : ''}?`),
          picker ? el('label', null, 'Reason (required)') : null,
          picker,
        ),
        footer: el('div', { style: { display: 'contents' } },
          el('button', { class: 'btn btn-secondary', onclick: () => { resolve(false); dlg.close(); } }, 'Cancel'),
          el('button', { class: 'btn btn-primary', onclick: () => {
            if (negativeReasons.length && !chosenReason) { toast('Please choose a reason.', 'warning'); return; }
            resolve(true); dlg.close();
          } }, 'Reduce to zero'),
        ),
        onClose: () => resolve(false),
      });
    });
    if (!proceed) return;

    const res = await batchStocktakeLines(
      { update: ids.map((id) => ({ id, countedNumberOfPacks: 0, reasonOptionId: chosenReason ?? undefined })) },
      storeId,
    );
    if (res.ok) { toast('Lines reduced to zero.', 'success'); await afterLineChange(); }
    else toast(res.lineErrors[0]?.message ?? 'Could not update lines.', 'error');
  }

  async function bulkChangeLocation() {
    const ids = [...selectedLineIds()];
    if (!ids.length) return;
    let locations: Location[] = [];
    try { locations = await fetchLocations(storeId); } catch { /* ignore */ }
    let chosen: string | null = null;
    const picker = select<string | null>({
      options: [{ value: null, label: '(No location)' }, ...locations.map((l) => ({ value: l.id, label: `${l.name} (${l.code})` }))],
      value: null,
      ariaLabel: 'New location',
      onChange: (v) => { chosen = v; },
    });
    const dialog = openDialog({
      title: 'Change location',
      body: el('div', { class: 'field' }, el('label', null, `New location for ${ids.length} line${ids.length > 1 ? 's' : ''}`), picker),
      footer: el('div', { style: { display: 'contents' } },
        el('button', { class: 'btn btn-secondary', onclick: () => dialog.close() }, 'Cancel'),
        el('button', { class: 'btn btn-primary', onclick: async () => {
          dialog.close();
          const res = await batchStocktakeLines({ update: ids.map((id) => ({ id, location: { value: chosen } })) }, storeId);
          if (res.ok) { toast('Location updated.', 'success'); await afterLineChange(); }
          else toast(res.lineErrors[0]?.message ?? 'Could not update location.', 'error');
        } }, 'Apply'),
      ),
    });
  }

  async function bulkDelete() {
    const ids = [...selectedLineIds()];
    if (!ids.length) return;
    const ok = await confirmDialog({
      title: 'Delete lines',
      message: `Delete ${ids.length} selected line${ids.length > 1 ? 's' : ''}? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    const res = await batchStocktakeLines({ deleteIds: ids }, storeId);
    if (res.ok) { toast('Lines deleted.', 'success'); await afterLineChange(); }
    else toast(res.lineErrors[0]?.message ?? 'Could not delete lines.', 'error');
  }

  async function doFinalise() {
    const current = st();
    if (!current) return;
    // UI-side guard mirroring the server: block when nothing counted (S3 notice).
    if (!hasCountedLine(lines()) && lineTotal() > 0) {
      // lines() is only the current page; do a definitive check by asking the server on finalise.
    }
    const ok = await confirmDialog({
      title: 'Finalise stocktake',
      message: 'Finalising applies all counted differences to stock as inventory adjustments. This cannot be undone. Continue?',
      confirmLabel: 'Save and confirm',
    });
    if (!ok) return;
    finalising.set(true);
    lineErrors.set({});
    try {
      const res = await finaliseStocktake(current.id, storeId);
      if (res.ok && res.value) {
        st.set(res.value);
        toast('Stocktake finalised.', 'success');
        await afterLineChange();
      } else {
        if (res.banner) toast(res.banner, 'error');
        // Key per-line errors to their rows (reduced-below-zero maps via stockLine.id).
        const map: LineErrorMap = {};
        const byStockLine = new Map(lines().map((l) => [l.stockLine?.id, l.id] as const));
        for (const lineId of res.mismatchLineIds) map[lineId] = { snapshot: 'Snapshot no longer matches current stock.', general: 'Snapshot mismatch' };
        for (const stockLineId of res.reducedStockLineIds) {
          const lineId = byStockLine.get(stockLineId);
          if (lineId) map[lineId] = { counted: 'Would reduce stock below zero.', general: 'Reduced below zero' };
        }
        lineErrors.set(map);
        if (!res.banner) toast(res.message ?? 'Finalise failed; see highlighted lines.', 'error');
      }
    } catch (e) {
      toast(e instanceof GraphQLError ? e.message : 'Finalise failed.', 'error');
    } finally {
      finalising.set(false);
    }
  }

  // Bootstrap.
  (async () => {
    await loadHeader();
    if (st()) {
      fetchPreferences(storeId).then((p) => prefs.set(p));
      await loadLines();
    }
  })();

  effect(() => {
    if (loadError()) {
      mount(container, el('div', { class: 'banner banner-error' }, loadError()));
      return;
    }
    const s = st();
    if (!s) {
      mount(container, el('div', { class: 'caption' }, 'Loading…'));
      return;
    }

    const editable = isEditable(s);
    const blockReason = editBlockReason(s);

    mount(
      container,
      el(
        'div',
        { class: 'detail-screen' },
        renderHead(s, editable),
        blockReason ? el('div', { class: 'banner banner-info' }, icon('info', 20), blockReason) : null,
        el(
          'div',
          { class: 'detail-body' },
          el(
            'div',
            { class: 'detail-main' },
            renderHeaderForm(s, editable),
            renderLineToolbar(s, editable),
            renderLineTable(),
            renderPager(),
          ),
          sidePanelOpen() ? renderSidePanel(s) : null,
        ),
        renderStatusRegion(s, editable),
      ),
    );
  });

  // ---- sub-renders ----

  function renderHead(s: Stocktake, editable: boolean): Node {
    return el(
      'div',
      { class: 'detail-head' },
      el(
        'div',
        { class: 'detail-title' },
        el('h1', null, `Stocktake #${s.stocktakeNumber}`),
        el('span', { class: `badge ${s.status === 'NEW' ? 'badge-new' : 'badge-finalised'}` }, statusLabel(s.status)),
        s.isLocked ? el('span', { class: 'badge badge-neutral' }, icon('circle-alert', 14), 'Locked') : null,
      ),
      el('div', { class: 'detail-head-spacer' }),
      el(
        'button',
        {
          class: 'btn btn-secondary btn-compact',
          onclick: () => sidePanelOpen.set(!sidePanelOpen()),
          'aria-pressed': () => (sidePanelOpen() ? 'true' : 'false'),
        },
        icon('info', 18),
        'Details',
      ),
      el(
        'button',
        {
          class: 'btn btn-primary btn-compact',
          disabled: !editable,
          title: editable ? 'Add an item to count' : 'Not editable',
          onclick: openAddItem,
        },
        icon('plus', 18),
        'Add item',
      ),
    );
  }

  function renderHeaderForm(s: Stocktake, editable: boolean): Node {
    const field = (
      label: string,
      value: string | null | undefined,
      key: 'description' | 'comment' | 'countedBy' | 'verifiedBy',
      full = false,
    ) =>
      el(
        'div',
        { class: `field ${full ? 'full' : ''}` },
        el('label', null, label),
        el('input', {
          class: 'input',
          type: 'text',
          value: value ?? '',
          disabled: !editable,
          'aria-label': label,
          onchange: (e: Event) => saveHeader({ [key]: (e.target as HTMLInputElement).value }),
        }),
      );

    return el(
      'div',
      { class: 'header-grid' },
      field('Description', s.description, 'description', true),
      el(
        'div',
        { class: 'field' },
        el('label', null, 'Stocktake date'),
        el('input', {
          class: 'input',
          type: 'date',
          value: toDateInputValue(s.stocktakeDate),
          disabled: !editable,
          'aria-label': 'Stocktake date',
          onchange: (e: Event) => saveHeader({ stocktakeDate: (e.target as HTMLInputElement).value }),
        }),
      ),
      el('div', { class: 'field' }, el('label', null, 'Created'), el('div', { class: 'input', style: { display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', paddingLeft: '0' } }, formatDate(s.createdDatetime))),
      field('Counted by', s.countedBy, 'countedBy'),
      field('Verified by', s.verifiedBy, 'verifiedBy'),
      field('Comment', s.comment, 'comment', true),
    );
  }

  function renderLineToolbar(_s: Stocktake, editable: boolean): Node {
    const selCount = selectedLineIds().size;
    const bulk =
      editable && selCount > 0
        ? el(
            'div',
            { class: 'line-toolbar', style: { gap: 'var(--space-2)' } },
            el('span', { class: 'caption' }, `${selCount} selected`),
            el('button', { class: 'btn btn-secondary btn-compact', onclick: bulkReduceToZero }, 'Reduce to zero'),
            el('button', { class: 'btn btn-secondary btn-compact', onclick: bulkChangeLocation }, 'Change location'),
            el('button', { class: 'btn btn-destructive btn-compact', onclick: bulkDelete }, icon('delete', 16), 'Delete'),
          )
        : null;

    return el(
      'div',
      { class: 'line-toolbar' },
      el('div', { class: 'field search' },
        el('input', {
          class: 'input input-compact',
          type: 'search',
          placeholder: 'Filter lines by item…',
          value: itemFilter(),
          'aria-label': 'Filter lines by item',
          onchange: (e: Event) => applyItemFilter((e.target as HTMLInputElement).value),
        }),
      ),
      bulk,
      el('div', { style: { flex: '1' } }),
      el('span', { class: 'caption' }, `${lineTotal()} line${lineTotal() === 1 ? '' : 's'}`),
    );
  }

  function renderLineTable(): Node {
    const errs = lineErrors();
    const p = prefs();
    const editable = st() ? isEditable(st()!) : false;
    const showDoses = p.manageVaccinesInDoses;
    const showDonor = p.allowTrackingOfStockByDonor;

    const errFor = (l: StocktakeLine) => errs[l.id];

    const cols: Column<StocktakeLine>[] = [
      {
        key: 'code', header: 'Code', width: '120px',
        render: (l) =>
          el('span', null,
            l.item.code,
            errFor(l)?.general ? el('span', { class: 'err-indicator', title: errFor(l)!.general }, icon('circle-alert', 16)) : null,
          ),
      },
      { key: 'name', header: 'Item name', render: (l) => el('span', { class: 'clamp-2' }, l.itemName) },
      { key: 'batch', header: 'Batch', priority: 3, render: (l) => l.batch || '—' },
      { key: 'expiry', header: 'Expiry', priority: 2, width: '110px', render: (l) => formatDate(l.expiryDate) || '—' },
      { key: 'manufacture', header: 'Mfr date', priority: 3, width: '110px', render: (l) => formatDate(l.manufactureDate) || '—' },
      { key: 'location', header: 'Location', priority: 3, render: (l) => l.location?.code || '—' },
      { key: 'unit', header: 'Unit', priority: 2, render: (l) => l.item.unitName || '—' },
      { key: 'packSize', header: 'Pack size', align: 'right', priority: 2, width: '90px', render: (l) => formatNumber(l.packSize) },
      ...(showDoses
        ? [{
            key: 'dosesPerUnit', header: 'Doses/unit', align: 'right' as const, priority: 2 as const, width: '90px',
            render: (l: StocktakeLine) => (l.item.isVaccine ? formatNumber(l.item.doses) : '—'),
          }]
        : []),
      {
        key: 'snapshot', header: 'Snapshot', align: 'right', width: '100px',
        render: (l) =>
          el('span', null,
            formatNumber(l.snapshotNumberOfPacks),
            errFor(l)?.snapshot ? el('span', { class: 'cell-error' }, errFor(l)!.snapshot) : null,
          ),
      },
      {
        key: 'counted', header: 'Counted', align: 'right', width: '100px',
        render: (l) =>
          el('span', null,
            l.countedNumberOfPacks == null ? el('span', { class: 'muted' }, '—') : formatNumber(l.countedNumberOfPacks),
            errFor(l)?.counted ? el('span', { class: 'cell-error' }, errFor(l)!.counted) : null,
          ),
      },
      ...(showDoses
        ? [{
            key: 'dosesCounted', header: 'Doses counted', align: 'right' as const, width: '110px',
            render: (l: StocktakeLine) =>
              l.item.isVaccine && l.countedNumberOfPacks != null
                ? formatNumber(l.countedNumberOfPacks * (l.packSize ?? 0) * (l.item.doses ?? 0))
                : '—',
          }]
        : []),
      {
        key: 'difference', header: 'Difference', align: 'right', width: '100px',
        render: (l) => {
          const d = difference(l);
          return el('span', { style: { color: d === 0 ? 'var(--text-secondary)' : d > 0 ? 'var(--state-success-main)' : 'var(--state-error-main)' } }, formatSigned(d));
        },
      },
      { key: 'reason', header: 'Reason', render: (l) => l.reasonOption?.reason || '—' },
      ...(showDonor
        ? [{ key: 'donor', header: 'Donor', priority: 3 as const, render: (l: StocktakeLine) => l.donorName || '—' }]
        : []),
      { key: 'comment', header: 'Comment', priority: 3, render: (l) => el('span', { class: 'truncate', title: l.comment ?? '' }, l.comment || '—') },
    ];

    return table<StocktakeLine>({
      columns: cols,
      rows: lines(),
      rowKey: (l) => l.id,
      selectable: editable,
      selectedIds: selectedLineIds(),
      onSelectionChange: (ids) => selectedLineIds.set(ids),
      onRowClick: editable ? openEditLine : undefined,
      state: linesState() === 'loading' ? 'loading' : linesState() === 'error' ? 'error' : 'normal',
      errorMessage: 'Failed to load lines.',
      onRetry: loadLines,
      isFiltered: itemFilter().trim().length > 0,
      emptyMessage: 'This stocktake has no lines yet.',
      filteredEmptyMessage: 'No lines match your filter.',
      onClearFilters: () => applyItemFilter(''),
      rowClass: (l) => (lineErrors()[l.id] ? 'row-error' : ''),
      ariaLabel: 'Stocktake lines',
    });
  }

  function renderPager(): Node {
    const total = lineTotal();
    const pageCount = Math.max(1, Math.ceil(total / LINE_PAGE_SIZE));
    if (pageCount <= 1) return el('div');
    return el(
      'div',
      { class: 'pager' },
      el('div', { style: { flex: '1' } }),
      el('button', { class: 'icon-btn', 'aria-label': 'Previous page', disabled: linePage() === 0, onclick: () => { linePage.set(linePage() - 1); loadLines(); } }, '‹'),
      el('span', { class: 'caption' }, `Page ${linePage() + 1} of ${pageCount}`),
      el('button', { class: 'icon-btn', 'aria-label': 'Next page', disabled: linePage() + 1 >= pageCount, onclick: () => { linePage.set(linePage() + 1); loadLines(); } }, '›'),
    );
  }

  function renderSidePanel(s: Stocktake): Node {
    const row = (label: string, value: Node | string) => el('div', null, el('dt', null, label), el('dd', null, value));
    return el(
      'aside',
      { class: 'side-panel', 'aria-label': 'Stocktake summary' },
      el('h2', null, 'Summary'),
      el(
        'dl',
        null,
        row('Number', `#${s.stocktakeNumber}`),
        row('Status', statusLabel(s.status)),
        row('Lines', formatNumber(lineTotal())),
        row('Created', formatDate(s.createdDatetime)),
        row('Finalised', s.finalisedDatetime ? formatDate(s.finalisedDatetime) : '—'),
        row('Counted by', s.countedBy || '—'),
        row('Verified by', s.verifiedBy || '—'),
        row('Comment', s.comment || '—'),
      ),
    );
  }

  function renderStatusRegion(s: Stocktake, editable: boolean): Node {
    const crumbs = statusCrumbs(
      [
        { key: 'NEW', label: 'New', reachedAt: s.createdDatetime },
        { key: 'FINALISED', label: 'Finalised', reachedAt: s.finalisedDatetime },
      ],
      s.status,
    );

    const finaliseControl = editable
      ? splitButton({
          options: [
            { key: 'NEW', label: 'New', disabled: true },
            { key: 'FINALISED', label: 'Save and confirm → Finalised' },
          ],
          selectedKey: 'FINALISED',
          onPrimary: doFinalise,
          busy: () => finalising(),
        })
      : null;

    return el(
      'div',
      { class: 'status-region' },
      crumbs,
      el('div', { class: 'spacer' }),
      s.status === 'NEW'
        ? el(
            'button',
            { class: 'btn btn-secondary btn-compact', onclick: toggleLock },
            icon('circle-alert', 18),
            () => (s.isLocked ? 'Unlock' : 'Lock'),
          )
        : null,
      finaliseControl,
    );
  }

  return container;
}
