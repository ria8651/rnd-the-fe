// S1 — Stocktake list screen. Paginated, sortable table; status filter via the
// add-a-filter menu with state in the URL; bulk delete; CSV export.
// Spec: ../../../spec/stocktakes/05-ui-surface.md#s1--list-screen and journeys J1/J7/J8.

import { el, mount } from '../../framework/dom.ts';
import { effect, signal } from '../../framework/signal.ts';
import { currentRoute, navigate, setQuery } from '../../framework/router.ts';
import { table, type Column } from '../../components/table.ts';
import { icon } from '../../components/icon.ts';
import { toast } from '../../components/toast.ts';
import { confirmDialog } from '../../components/dialog.ts';
import { select } from '../../components/select.ts';
import { deleteStocktakes, fetchStocktakes } from '../../api/stocktakes.ts';
import { GraphQLError } from '../../api/client.ts';
import { statusLabel } from '../../domain/rules.ts';
import { formatDate } from '../../domain/format.ts';
import type { Stocktake, StocktakeSortField, StocktakeListResult } from '../../domain/types.ts';
import { exportStocktakesCsv } from './csv.ts';
import './list.css';

const PAGE_SIZE = 25;

type Status = 'NEW' | 'FINALISED';

export function renderStocktakeList(storeId: string): HTMLElement {
  const q = currentRoute().query;

  const status = signal<Status | null>((q.get('status') as Status) || null);
  const sortField = signal<StocktakeSortField>((q.get('sort') as StocktakeSortField) || 'createdDatetime');
  const sortDesc = signal<boolean>(q.get('dir') !== 'asc');
  const page = signal<number>(Math.max(0, Number(q.get('page') ?? '0')));

  const result = signal<StocktakeListResult | null>(null);
  const loadState = signal<'loading' | 'error' | 'ready'>('loading');
  const errorMsg = signal<string>('');
  const selected = signal<Set<string>>(new Set());
  const busy = signal<boolean>(false);

  // Persist filter/sort/page to the URL so the view is shareable (AC-L1).
  function syncUrl() {
    const p = new URLSearchParams();
    if (status()) p.set('status', status()!);
    if (sortField() !== 'createdDatetime' || !sortDesc()) {
      p.set('sort', sortField());
      p.set('dir', sortDesc() ? 'desc' : 'asc');
    }
    if (page() > 0) p.set('page', String(page()));
    setQuery(p);
  }

  async function load() {
    loadState.set('loading');
    try {
      const res = await fetchStocktakes({
        storeId,
        first: PAGE_SIZE,
        offset: page() * PAGE_SIZE,
        status: status() ?? undefined,
        sortField: sortField(),
        sortDesc: sortDesc(),
      });
      result.set(res);
      loadState.set('ready');
    } catch (e) {
      errorMsg.set(e instanceof GraphQLError ? e.message : 'Failed to load stocktakes.');
      loadState.set('error');
    }
  }

  function toggleSort(field: string) {
    if (sortField() === field) sortDesc.set(!sortDesc());
    else {
      sortField.set(field as StocktakeSortField);
      sortDesc.set(true);
    }
    page.set(0);
    syncUrl();
    load();
  }

  function setStatus(next: Status | null) {
    status.set(next);
    page.set(0);
    selected.set(new Set());
    syncUrl();
    load();
  }

  function gotoPage(next: number) {
    page.set(next);
    selected.set(new Set());
    syncUrl();
    load();
  }

  async function onBulkDelete() {
    const ids = [...selected()];
    if (!ids.length) return;
    const ok = await confirmDialog({
      title: 'Delete stocktakes',
      message: `Delete ${ids.length} stocktake${ids.length > 1 ? 's' : ''}? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    busy.set(true);
    try {
      const res = await deleteStocktakes(ids, storeId);
      if (res.ok) {
        toast(`Deleted ${ids.length} stocktake${ids.length > 1 ? 's' : ''}.`, 'success');
        selected.set(new Set());
        await load();
      } else {
        toast(res.error, 'error');
      }
    } catch (e) {
      toast(e instanceof GraphQLError ? e.message : 'Delete failed.', 'error');
    } finally {
      busy.set(false);
    }
  }

  function onExport() {
    const rows = result()?.nodes ?? [];
    if (!rows.length) {
      toast('Nothing to export.', 'info');
      return;
    }
    exportStocktakesCsv(rows);
  }

  const columns: Column<Stocktake>[] = [
    {
      key: 'stocktakeNumber',
      header: 'Number',
      align: 'right',
      sortable: true,
      width: '96px',
      render: (r) => `#${r.stocktakeNumber}`,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '120px',
      render: (r) =>
        el(
          'span',
          { class: `badge ${r.status === 'NEW' ? 'badge-new' : 'badge-finalised'}` },
          statusLabel(r.status),
        ),
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      render: (r) => el('span', { class: 'clamp-2' }, r.description || el('span', { class: 'muted' }, '—')),
    },
    {
      key: 'comment',
      header: 'Comment',
      priority: 3,
      render: (r) => el('span', { class: 'truncate', title: r.comment ?? '' }, r.comment || '—'),
    },
    {
      key: 'createdDatetime',
      header: 'Created',
      sortable: true,
      priority: 2,
      width: '120px',
      render: (r) => formatDate(r.createdDatetime),
    },
    {
      key: 'finalisedDatetime',
      header: 'Finalised',
      sortable: true,
      priority: 2,
      width: '120px',
      render: (r) => (r.finalisedDatetime ? formatDate(r.finalisedDatetime) : el('span', { class: 'muted' }, '—')),
    },
    {
      key: 'isLocked',
      header: 'Locked',
      align: 'center',
      priority: 3,
      width: '80px',
      render: (r) => (r.isLocked ? icon('circle-alert', 18, 'Locked') : ''),
    },
  ];

  const container = el('div', { style: { display: 'contents' } });

  effect(() => {
    const res = result();
    const st = loadState();
    const total = res?.totalCount ?? 0;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const sel = selected();

    const toolbar = el(
      'div',
      { class: 'list-toolbar' },
      el('h1', null, 'Stocktakes'),
      el('div', { class: 'toolbar-spacer' }),
      // Bulk delete appears only with a selection.
      sel.size > 0
        ? el(
            'button',
            { class: 'btn btn-destructive btn-compact', onclick: onBulkDelete, disabled: () => busy() },
            icon('delete', 18),
            `Delete (${sel.size})`,
          )
        : null,
      el('button', { class: 'btn btn-secondary btn-compact', onclick: onExport }, icon('download', 18), 'Export'),
      el(
        'button',
        { class: 'btn btn-primary btn-compact', onclick: () => navigate('/stocktakes/new') },
        icon('plus', 18),
        'New stocktake',
      ),
    );

    // Add-a-filter row (tables.md#filtering). One filter available: status.
    const filterBar = el(
      'div',
      { class: 'filter-bar' },
      status() == null
        ? select({
            options: [
              { value: '__add_status', label: 'Status' },
            ],
            value: null,
            placeholder: 'Filters',
            compact: true,
            ariaLabel: 'Add a filter',
            onChange: () => setStatus('NEW'),
          })
        : el(
            'div',
            { class: 'active-filter' },
            el('span', { class: 'caption' }, 'Status'),
            select<Status>({
              options: [
                { value: 'NEW', label: 'New' },
                { value: 'FINALISED', label: 'Finalised' },
              ],
              value: status(),
              compact: true,
              ariaLabel: 'Status filter',
              onChange: (v) => setStatus(v),
            }),
            el(
              'button',
              { class: 'icon-btn', 'aria-label': 'Remove status filter', onclick: () => setStatus(null) },
              icon('close', 16),
            ),
          ),
      status() != null
        ? el('button', { class: 'btn btn-ghost btn-compact', onclick: () => setStatus(null) }, 'Remove all filters')
        : null,
    );

    const grid = table<Stocktake>({
      columns,
      rows: res?.nodes ?? [],
      rowKey: (r) => r.id,
      selectable: true,
      selectedIds: sel,
      onSelectionChange: (ids) => selected.set(ids),
      onRowClick: (r) => navigate(`/stocktakes/${r.id}`),
      sort: { field: sortField(), desc: sortDesc() },
      onSort: toggleSort,
      state: st === 'loading' ? 'loading' : st === 'error' ? 'error' : 'normal',
      errorMessage: errorMsg(),
      onRetry: load,
      isFiltered: status() != null,
      onClearFilters: () => setStatus(null),
      ariaLabel: 'Stocktakes',
    });

    const pager = el(
      'div',
      { class: 'pager' },
      el('span', { class: 'caption' }, total ? `${total} stocktake${total === 1 ? '' : 's'}` : ''),
      el('div', { class: 'toolbar-spacer' }),
      el(
        'button',
        { class: 'icon-btn', 'aria-label': 'Previous page', disabled: page() === 0, onclick: () => gotoPage(page() - 1) },
        '‹',
      ),
      el('span', { class: 'caption' }, `Page ${page() + 1} of ${pageCount}`),
      el(
        'button',
        {
          class: 'icon-btn',
          'aria-label': 'Next page',
          disabled: page() + 1 >= pageCount,
          onclick: () => gotoPage(page() + 1),
        },
        '›',
      ),
    );

    mount(container, el('div', { class: 'list-screen' }, toolbar, filterBar, grid, pager));
  });

  load();
  return container;
}
