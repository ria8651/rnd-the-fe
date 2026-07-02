import { h, when } from '../../core/dom';
import { icon } from '../../icons';
import { signal, effect, onCleanup } from '../../core/signal';
import { navigate } from '../../core/router';
import { button, iconButton } from '../../components/button';
import { textField } from '../../components/input';
import { dataTable, type Column, type TableState } from '../../components/table';
import { statusCrumbs } from '../../components/statusCrumbs';
import { splitButton } from '../../components/splitButton';
import { combobox } from '../../components/combobox';
import { openModal, modalShell, confirmDialog } from '../../components/modal';
import { toast } from '../../components/toast';
import {
  fetchStocktakeByNumber, fetchStocktakeLines, updateStocktake, batchLines, deleteStocktakes,
} from '../../api/stocktakes';
import { fetchReasonOptions, fetchLocations } from '../../api/reference';
import type { LocationRef, ReasonOption, Stocktake, StocktakeLine } from '../../api/types';
import { formatDate, formatDateTime, formatSigned } from '../../core/format';
import { currentStoreId } from '../../context/auth';
import { createAutosave } from './autosave';
import { openLineEditor } from './lineEditor';
import { reasonsForDirection } from './reasons';

export function stocktakeDetail(stocktakeNumber: string): HTMLElement {
  const store = currentStoreId()!;
  const [header, setHeader] = signal<Stocktake | null>(null);
  const [notFound, setNotFound] = signal(false);
  const [lines, setLines] = signal<StocktakeLine[]>([]);
  const [linesState, setLinesState] = signal<TableState>('loading');
  const [selected, setSelected] = signal<Set<string>>(new Set());
  const [itemFilter, setItemFilter] = signal('');
  const [panelOpen, setPanelOpen] = signal(window.innerWidth > 800);
  const [banner, setBanner] = signal<{ kind: 'error'; message: string } | null>(null);
  const [lineErrors] = signal<Map<string, string>>(new Map());

  let reasons: ReasonOption[] = [];
  let locations: LocationRef[] = [];
  fetchReasonOptions().then((r) => (reasons = r)).catch(() => {});
  fetchLocations(store).then((l) => (locations = l)).catch(() => {});

  const editable = () => {
    const h2 = header();
    return !!h2 && h2.status === 'NEW' && !h2.isLocked;
  };
  const stId = () => header()?.id ?? null;

  // Load header once for this number.
  fetchStocktakeByNumber(store, Number(stocktakeNumber))
    .then((st) => {
      if (!st) { setNotFound(true); return; }
      setHeader(st);
    })
    .catch(() => setNotFound(true));

  let filterTimer: number | undefined;
  const reloadLines = () => {
    const id = stId();
    if (!id) return;
    setLinesState('loading');
    fetchStocktakeLines(store, id, { itemCodeOrName: itemFilter() || undefined })
      .then((res) => {
        setLines(res.nodes);
        setSelected(new Set());
        setLinesState(res.nodes.length ? 'normal' : itemFilter() ? 'empty-filtered' : 'empty-none');
      })
      .catch(() => setLinesState('error'));
  };

  // Reload lines when the header id resolves or the view filter changes (debounced).
  effect(() => {
    const id = stId();
    const q = itemFilter();
    if (!id) return;
    window.clearTimeout(filterTimer);
    filterTimer = window.setTimeout(reloadLines, q ? 300 : 0);
  });

  const reloadHeader = async () => {
    const st = await fetchStocktakeByNumber(store, Number(stocktakeNumber));
    if (st) setHeader(st);
  };

  // ---------- In-place metadata fields ----------
  const flushers: Array<() => Promise<void>> = [];
  function metaField(key: 'description' | 'comment' | 'countedBy' | 'verifiedBy', label: string, multiline = false): HTMLElement {
    const initial = (header()?.[key] as string) ?? '';
    const [val, setVal] = signal(initial);
    let lastSaved = initial;
    const auto = createAutosave(async (value) => {
      const id = stId();
      if (!id) return;
      const res = await updateStocktake(store, { id, [key]: value });
      if (res.ok) { lastSaved = value; }
      else { setVal(lastSaved); toast(res.errorMessage || 'Could not save', 'error'); }
    });
    // Keep in sync if header (re)loads with a different value and field is idle.
    effect(() => {
      const hv = (header()?.[key] as string) ?? '';
      if (!auto.hasPending() && hv !== val()) { setVal(hv); lastSaved = hv; }
    });
    flushers.push(auto.flush);
    return textField({
      label,
      multiline,
      value: val,
      disabled: () => !editable(),
      onInput: (v) => { setVal(v); auto.schedule(v); },
      onCommit: () => void auto.flush(),
      maxWidth: multiline ? undefined : '600px',
    });
  }
  // Flush pending writes on teardown / navigation (AC-E7) and on refresh.
  const onBeforeUnload = () => { void Promise.all(flushers.map((f) => f())); };
  window.addEventListener('beforeunload', onBeforeUnload);
  onCleanup(() => {
    window.removeEventListener('beforeunload', onBeforeUnload);
    void Promise.all(flushers.map((f) => f()));
  });

  // ---------- Lines table ----------
  const diff = (l: StocktakeLine): number | null => (l.countedNumberOfPacks == null ? null : l.countedNumberOfPacks - l.snapshotNumberOfPacks);
  const columns: Column<StocktakeLine>[] = [
    { key: 'itemCode', header: 'Code', width: '110px', ellipsis: true, render: (l) => l.item.code },
    { key: 'itemName', header: 'Item', ellipsis: true, render: (l) => l.itemName },
    { key: 'batch', header: 'Batch', priority: 3, render: (l) => l.batch || '' },
    { key: 'expiry', header: 'Expiry', priority: 2, width: '110px', render: (l) => formatDate(l.expiryDate) },
    { key: 'location', header: 'Location', priority: 3, render: (l) => l.location?.name || '' },
    { key: 'packSize', header: 'Pack', num: true, priority: 2, width: '80px', render: (l) => (l.packSize ?? '') === '' ? '' : String(l.packSize) },
    { key: 'snapshot', header: 'Snapshot', num: true, width: '100px', render: (l) => String(l.snapshotNumberOfPacks) },
    { key: 'counted', header: 'Counted', num: true, width: '100px', render: (l) => (l.countedNumberOfPacks == null ? h('span', { class: 'muted' }, '—') : String(l.countedNumberOfPacks)) },
    { key: 'difference', header: 'Difference', num: true, width: '100px', render: (l) => { const d = diff(l); return d == null ? '' : formatSigned(d); } },
    { key: 'reason', header: 'Reason', priority: 2, render: (l) => l.reasonOption?.reason || '' },
    { key: 'comment', header: 'Comment', priority: 3, ellipsis: true, render: (l) => l.comment || '' },
  ];

  const toggleRow = (key: string) => setSelected((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const toggleAll = (checked: boolean) => setSelected(checked ? new Set(lines().map((l) => l.id)) : new Set());

  const table = dataTable<StocktakeLine>({
    columns,
    rows: lines,
    rowKey: (l) => l.id,
    state: linesState,
    selectable: true,
    selected,
    onToggleRow: toggleRow,
    onToggleAll: toggleAll,
    rowError: (l) => lineErrors().has(l.id),
    onRowClick: (l) => { if (editable()) openEditor(l); },
    onClearFilters: () => setItemFilter(''),
    onRetry: reloadLines,
    emptyNoneMessage: 'No lines yet. Use “Add item” to count a batch.',
  });

  const openEditor = (line?: StocktakeLine) => {
    if (!stId()) return;
    openLineEditor({
      storeId: store,
      stocktakeId: stId()!,
      reasons,
      locations,
      existingItemIds: lines().map((l) => l.itemId),
      line,
      onSaved: () => { reloadLines(); },
    });
  };

  // ---------- Finalise ----------
  const hasCountedLines = () => lines().some((l) => l.countedNumberOfPacks != null);
  const [statusChoice, setStatusChoice] = signal('FINALISED');
  const finalise = () => {
    if (!hasCountedLines()) { toast('Nothing counted to finalise.', 'info'); return; }
    confirmDialog({
      title: 'Save and confirm?',
      message: 'Finalising applies all counted differences as inventory adjustments. This cannot be undone.',
      confirmLabel: 'Finalise',
      onConfirm: async () => {
        setBanner(null);
        const res = await updateStocktake(store, { id: stId()!, status: 'FINALISED' });
        if (res.ok) { toast('Stocktake finalised.', 'success'); await reloadHeader(); reloadLines(); }
        else { setBanner({ kind: 'error', message: res.errorMessage || res.errorType || 'Could not finalise.' }); }
      },
    });
  };

  const toggleLock = async () => {
    const st = header();
    if (!st) return;
    const res = await updateStocktake(store, { id: st.id, isLocked: !st.isLocked });
    if (res.ok) await reloadHeader();
    else toast(res.errorMessage || 'Could not change lock', 'error');
  };

  // ---------- Bulk line actions ----------
  const clearSelection = () => setSelected(new Set());
  const selectedLines = () => lines().filter((l) => selected().has(l.id));

  const bulkReduceToZero = () => {
    const count = selected().size;
    // Reducing to zero is a reduction: capture a reason when reduction reasons exist.
    const negReasons = reasonsForDirection(reasons, 'negative');
    const [reasonId, setReasonId] = signal<string | null>(null);
    const [reasonLabel, setReasonLabel] = signal('');
    openModal((close) => {
      const needReason = negReasons.length > 0;
      const body = h('div', { class: 'stack' },
        h('p', { style: { margin: 0 } }, `Set counted to zero for ${count} line${count === 1 ? '' : 's'}?`),
        needReason
          ? h('div', { class: 'field' },
              h('label', { class: 'field__label' }, 'Reason *'),
              combobox<ReasonOption>({
                value: reasonId, selectedLabel: reasonLabel, required: true, placeholder: 'Select a reason',
                loadOptions: () => negReasons.map((r) => ({ value: r.id, label: r.reason })),
                onSelect: (v, opt) => { setReasonId(v); setReasonLabel(opt?.label ?? ''); },
              }))
          : null,
      );
      const confirmBtn = button({
        label: 'Reduce to zero', icon: 'rewind', variant: 'primary',
        disabled: () => needReason && !reasonId(),
        onClick: async () => {
          const updates = selectedLines().map((l) => ({ id: l.id, countedNumberOfPacks: 0, reasonOptionId: needReason ? reasonId() : undefined }));
          const res = await batchLines(store, { updates });
          if (!res.ok) toast('Some lines could not be updated.', 'error');
          else toast(`Reduced ${count} line${count === 1 ? '' : 's'} to zero.`, 'success');
          close();
          reloadLines();
        },
      });
      const footer = h('div', { class: 'row' }, button({ label: 'Cancel', variant: 'secondary', onClick: close }), confirmBtn);
      return modalShell({ title: 'Reduce to zero', body, footer, size: 'sm', close });
    });
  };

  const bulkChangeLocation = () => {
    const [locId, setLocId] = signal<string | null>(null);
    const [locLabel, setLocLabel] = signal('');
    openModal((close) => {
      const body = h('div', { class: 'field' },
        h('label', { class: 'field__label' }, 'Location'),
        combobox<LocationRef>({
          value: locId, selectedLabel: locLabel, required: false, placeholder: 'Select a location',
          loadOptions: (q) => locations.filter((l) => l.name.toLowerCase().includes(q.toLowerCase())).map((l) => ({ value: l.id, label: l.name, disabled: l.onHold })),
          onSelect: (v, opt) => { setLocId(v); setLocLabel(opt?.label ?? ''); },
        }),
      );
      const footer = h('div', { class: 'row' },
        button({ label: 'Cancel', variant: 'secondary', onClick: close }),
        button({ label: 'Change location', variant: 'primary', disabled: () => !locId(), onClick: async () => {
          const updates = selectedLines().map((l) => ({ id: l.id, locationId: locId() }));
          const res = await batchLines(store, { updates });
          if (!res.ok) toast('Some lines could not be updated.', 'error');
          close(); reloadLines();
        } }),
      );
      return modalShell({ title: 'Change location', body, footer, size: 'sm', close });
    });
  };

  const bulkDelete = () => {
    const ids = [...selected()];
    confirmDialog({
      title: `Delete ${ids.length} line${ids.length === 1 ? '' : 's'}?`, danger: true, confirmLabel: 'Delete',
      onConfirm: async () => { await batchLines(store, { deletes: ids }); reloadLines(); },
    });
  };

  // ---------- Rendering ----------
  const statusBanner = () => {
    const st = header();
    if (!st) return null;
    if (banner()) return h('div', { class: 'banner banner--error' }, icon('circle-alert'), banner()!.message);
    if (st.status === 'FINALISED') return h('div', { class: 'banner banner--info' }, icon('info-outline'), 'This stocktake is finalised and read-only.');
    if (st.isLocked) return h('div', { class: 'banner banner--warning' }, icon('info-outline'), 'This stocktake is locked. Unlock it below to edit.');
    return null;
  };

  const appbar = h('div', { class: 'appbar' },
    h('div', { style: { 'min-width': '260px', flex: '1' } }, () => (header() ? metaField('description', 'Description') : h('div', { class: 'muted' }, 'Loading…'))),
    h('div', { class: 'appbar__spacer' }),
    textField({ placeholder: 'Filter items…', ariaLabel: 'Filter items', compact: true, value: itemFilter, onInput: setItemFilter, maxWidth: '220px' }),
    button({ label: 'Add item', icon: 'plus-circle', variant: 'primary', disabled: () => !editable(), onClick: () => openEditor() }),
    iconButton({ icon: 'printer', label: 'Generate report', onClick: () => toast('Report generation is not implemented in this build.', 'info') }),
    iconButton({ icon: 'menu-dots', label: 'Details panel', onClick: () => setPanelOpen((v) => !v) }),
  );

  const footer = h('div', { class: 'footer' }, () => {
    const st = header();
    if (!st) return null;
    if (selected().size > 0) {
      // Bulk line-action bar takes over the footer while a selection exists.
      return h('div', { class: 'row', style: { width: '100%', gap: 'var(--sp-3)' } },
        iconButton({ icon: 'minus-circle', label: 'Clear selection', onClick: clearSelection }),
        h('span', { class: 'small' }, `${selected().size} selected`),
        h('div', { class: 'spacer' }),
        button({ label: 'Reduce to zero', icon: 'rewind', variant: 'secondary', disabled: () => !editable(), onClick: bulkReduceToZero }),
        button({ label: 'Change location', icon: 'arrow-right', variant: 'secondary', disabled: () => !editable(), onClick: bulkChangeLocation }),
        button({ label: 'Delete', icon: 'delete', variant: 'destructive', disabled: () => !editable(), onClick: bulkDelete }),
      );
    }
    return h('div', { class: 'row', style: { width: '100%', gap: 'var(--sp-4)' } },
      // Lock / unlock — a text "On hold" toggle (icons.md: this control is text, not an icon).
      h('button', {
        class: () => `btn btn--compact${st.isLocked ? ' btn--secondary' : ' btn--ghost'}`,
        'aria-pressed': st.isLocked ? 'true' : 'false',
        disabled: st.status === 'FINALISED',
        onclick: toggleLock,
      }, 'On hold'),
      statusCrumbs({
        steps: [
          { key: 'NEW', label: 'New', reachedAt: () => header()?.createdDatetime },
          { key: 'FINALISED', label: 'Finalised', reachedAt: () => header()?.finalisedDatetime },
        ],
        current: () => header()?.status ?? 'NEW',
      }),
      h('div', { class: 'spacer' }),
      // Finalise split button — hidden when not editable.
      editable()
        ? splitButton({
            options: [
              { value: 'NEW', label: 'New', disabled: true },
              { value: 'FINALISED', label: 'Save and confirm → Finalised' },
            ],
            selected: statusChoice,
            onSelectOption: setStatusChoice,
            onPrimary: finalise,
          })
        : null,
    );
  });

  const panel = when(panelOpen, () => {
    const st = header();
    return h('aside', { class: 'detail__panel', 'aria-label': 'Details' },
      h('div', { class: 'stack' },
        h('div', null, h('div', { class: 'field__label' }, 'Stocktake number'), h('div', null, () => String(header()?.stocktakeNumber ?? ''))),
        h('div', null, h('div', { class: 'field__label' }, 'Status'), h('div', null, () => header()?.status ?? '')),
        h('div', null, h('div', { class: 'field__label' }, 'Entered by'), h('div', null, () => header()?.user?.username || '—'), h('div', { class: 'small muted' }, () => header()?.user?.email || '')),
        h('div', null, h('div', { class: 'field__label' }, 'Created'), h('div', null, () => formatDateTime(header()?.createdDatetime))),
        () => (header()?.finalisedDatetime ? h('div', null, h('div', { class: 'field__label' }, 'Finalised'), h('div', null, formatDateTime(header()!.finalisedDatetime))) : null),
        () => (st ? metaField('countedBy', 'Counted by') : null),
        () => (st ? metaField('verifiedBy', 'Verified by') : null),
        () => (st ? metaField('comment', 'Comment', true) : null),
        h('div', { class: 'row', style: { 'margin-top': 'var(--sp-3)' } },
          iconButton({ icon: 'delete', label: 'Delete stocktake', danger: true, disabled: () => !editable(), onClick: () => {
            confirmDialog({ title: 'Delete this stocktake?', danger: true, confirmLabel: 'Delete', onConfirm: async () => { await deleteStocktakes(store, [stId()!]); toast('Stocktake deleted.', 'success'); navigate(`/${store}/inventory/stocktakes`); } });
          } }),
          iconButton({ icon: 'copy', label: 'Copy record to clipboard', onClick: () => {
            const st2 = header(); if (!st2) return;
            navigator.clipboard?.writeText(`Stocktake #${st2.stocktakeNumber} (${st2.status})\n${st2.description ?? ''}`);
            toast('Copied to clipboard.', 'success');
          } }),
        ),
      ),
    );
  });

  const notFoundView = () =>
    h('div', { class: 'page' }, h('div', { class: 'table-state' }, h('p', null, 'Stocktake not found.'), h('a', { onclick: () => navigate(`/${store}/inventory/stocktakes`) }, 'Back to list')));

  const contentView = () =>
    h('div', { class: 'page' },
      appbar,
      h('div', { style: { padding: 'var(--sp-3) var(--sp-4) 0' } }, statusBanner),
      h('div', { class: 'detail' },
        h('div', { class: 'detail__main' }, h('div', { class: 'tablewrap' }, table)),
        panel,
      ),
      footer,
    );

  return h('div', { style: { display: 'contents' } }, when(notFound, notFoundView, contentView));
}
