import { createEffect, createMemo, createSignal, For, on, Show, type JSX } from 'solid-js';
import { useNavigate, useSearchParams } from '@solidjs/router';
import { createQuery, useQueryClient } from '@tanstack/solid-query';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../components/ui/Toast';
import {
  deleteStocktakes,
  fetchStocktakes,
  type StocktakeSortField,
} from '../../api/stocktakes';
import type { Stocktake, StocktakeStatus } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Checkbox } from '../../components/ui/Checkbox';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { FilterBar, type FilterDef } from '../../components/ui/FilterBar';
import { CreateStocktakeModal } from './CreateStocktakeModal';
import { formatDate, formatDateTime } from '../../lib/format';
import { downloadCsv, toCsv } from '../../lib/csv';
import '../../components/ui/table.css';

const FILTERS: FilterDef[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'enum',
    options: [
      { value: 'NEW', label: 'New' },
      { value: 'FINALISED', label: 'Finalised' },
    ],
  },
];

const PAGE_SIZE = 25;

export function StocktakeList(): JSX.Element {
  const store = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter state lives in the URL (tables.md#filtering) so the view is shareable.
  const statusFilter = (): StocktakeStatus | undefined => {
    const s = Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status;
    return s === 'NEW' || s === 'FINALISED' ? s : undefined;
  };

  const [page, setPage] = createSignal(0);
  const [sortKey, setSortKey] = createSignal<StocktakeSortField>('createdDatetime');
  const [sortDesc, setSortDesc] = createSignal(true);
  const [selected, setSelected] = createSignal<Set<string>>(new Set());
  const [showCreate, setShowCreate] = createSignal(false);
  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);

  // Changing the filter resets paging to the first page and clears selection.
  createEffect(on(statusFilter, () => {
    setPage(0);
    setSelected(new Set<string>());
  }, { defer: true }));

  const queryKey = createMemo(() => [
    'stocktakes',
    store.storeId(),
    statusFilter(),
    page(),
    sortKey(),
    sortDesc(),
  ]);

  const query = createQuery(() => ({
    queryKey: queryKey(),
    queryFn: () =>
      fetchStocktakes({
        storeId: store.storeId(),
        first: PAGE_SIZE,
        offset: page() * PAGE_SIZE,
        sortKey: sortKey(),
        sortDesc: sortDesc(),
        status: statusFilter(),
      }),
  }));

  const rows = () => query.data?.nodes ?? [];
  const total = () => query.data?.totalCount ?? 0;
  const pageCount = () => Math.max(1, Math.ceil(total() / PAGE_SIZE));

  const toggleSort = (key: StocktakeSortField) => {
    if (sortKey() === key) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
    setPage(0);
  };

  const clearFilters = () => setSearchParams({ status: undefined });

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set<string>(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allOnPageSelected = () => rows().length > 0 && rows().every((r) => selected().has(r.id));
  const someSelected = () => rows().some((r) => selected().has(r.id));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set<string>(prev);
      if (allOnPageSelected()) rows().forEach((r) => next.delete(r.id));
      else rows().forEach((r) => next.add(r.id));
      return next;
    });
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await deleteStocktakes(store.storeId(), [...selected()]);
      toast.show(`Deleted ${selected().size} stocktake(s)`, 'success');
      setSelected(new Set<string>());
      setConfirmDelete(false);
      queryClient.invalidateQueries({ queryKey: ['stocktakes'] });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const exportCsv = () => {
    const headers = ['Number', 'Status', 'Description', 'Comment', 'Created', 'Finalised', 'Locked'];
    const data = rows().map((s: Stocktake) => [
      s.stocktakeNumber,
      s.status === 'NEW' ? 'New' : 'Finalised',
      s.description ?? '',
      s.comment ?? '',
      formatDateTime(s.createdDatetime),
      formatDate(s.finalisedDatetime),
      s.isLocked ? 'Yes' : 'No',
    ]);
    downloadCsv(`stocktakes-${store.activeStore()?.code ?? 'store'}.csv`, toCsv(headers, data));
  };

  const SortHeader = (p: { field: StocktakeSortField; label: string; num?: boolean }) => (
    <button
      class="th-sort"
      data-active={sortKey() === p.field}
      onClick={() => toggleSort(p.field)}
      aria-label={`Sort by ${p.label}`}
    >
      {p.label}
      <Show when={sortKey() === p.field}>
        <Icon name={sortDesc() ? 'sort-desc' : 'sort-asc'} size={14} />
      </Show>
    </button>
  );

  return (
    <div class="page">
      <div class="page__header">
        <h1 class="page__title">Stocktakes</h1>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          <Icon name="plus-circle" size={18} /> New stocktake
        </Button>
      </div>

      <div class="toolbar">
        <FilterBar filters={FILTERS} />

        <div class="grow" />

        <Show when={someSelected()}>
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Icon name="delete" size={18} /> Delete ({[...selected()].length})
          </Button>
        </Show>
        <Button variant="secondary" onClick={exportCsv} disabled={rows().length === 0}>
          <Icon name="download" size={18} /> Export
        </Button>
      </div>

      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th class="center" style={{ width: '48px' }}>
                <Checkbox
                  checked={allOnPageSelected()}
                  indeterminate={!allOnPageSelected() && someSelected()}
                  onChange={toggleAll}
                  aria-label="Select all on page"
                />
              </th>
              <th class="num" style={{ width: '90px' }}>
                <SortHeader field="stocktakeNumber" label="Number" />
              </th>
              <th style={{ width: '120px' }}>
                <SortHeader field="status" label="Status" />
              </th>
              <th>
                <SortHeader field="description" label="Description" />
              </th>
              <th class="p2">
                <SortHeader field="comment" label="Comment" />
              </th>
              <th class="p2" style={{ width: '170px' }}>
                <SortHeader field="createdDatetime" label="Created" />
              </th>
              <th class="p3" style={{ width: '130px' }}>
                <SortHeader field="finalisedDatetime" label="Finalised" />
              </th>
              <th class="center p3" style={{ width: '80px' }}>
                Locked
              </th>
            </tr>
          </thead>
          <tbody>
            <Show when={!query.isLoading} fallback={<tr><td colSpan={8} class="table-state"><span class="spinner" style={{ margin: '0 auto' }} /></td></tr>}>
              <Show
                when={rows().length > 0}
                fallback={
                  <tr>
                    <td colSpan={8} class="table-state">
                      <Show when={query.isError} fallback={
                        <Show when={statusFilter()} fallback={<span>No stocktakes yet. Create one to get started.</span>}>
                          <div class="col" style={{ gap: 'var(--sp-2)', 'align-items': 'center' }}>
                            <span>No stocktakes match this filter.</span>
                            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filter</Button>
                          </div>
                        </Show>
                      }>
                        <div class="col" style={{ gap: 'var(--sp-2)', 'align-items': 'center' }}>
                          <span style={{ color: 'var(--state-error-main)' }}>Failed to load stocktakes.</span>
                          <Button variant="ghost" size="sm" onClick={() => query.refetch()}>
                            <Icon name="refresh" size={16} /> Retry
                          </Button>
                        </div>
                      </Show>
                    </td>
                  </tr>
                }
              >
                <For each={rows()}>
                  {(s) => (
                    <tr
                      class="row-select"
                      data-selected={selected().has(s.id)}
                      onClick={() => navigate(`/stocktakes/${s.id}`)}
                    >
                      <td class="center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selected().has(s.id)} onChange={() => toggleRow(s.id)} aria-label={`Select stocktake ${s.stocktakeNumber}`} />
                      </td>
                      <td class="num tnum">{s.stocktakeNumber}</td>
                      <td><StatusBadge status={s.status} /></td>
                      <td>
                        <div class="truncate" style={{ 'max-width': '360px' }} title={s.description ?? ''}>
                          {s.description}
                        </div>
                      </td>
                      <td class="p2">
                        <div class="truncate" style={{ 'max-width': '240px' }} title={s.comment ?? ''}>
                          {s.comment}
                        </div>
                      </td>
                      <td class="p2 tnum">{formatDateTime(s.createdDatetime)}</td>
                      <td class="p3 tnum">{formatDate(s.finalisedDatetime)}</td>
                      <td class="center">
                        <Show when={s.isLocked}>
                          <span title="Locked"><Icon name="lock" size={16} /></span>
                        </Show>
                      </td>
                    </tr>
                  )}
                </For>
              </Show>
            </Show>
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <span>
          {total() === 0 ? 0 : page() * PAGE_SIZE + 1}–{Math.min((page() + 1) * PAGE_SIZE, total())} of {total()}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page() === 0}>
          <Icon name="arrow-left" size={16} />
        </Button>
        <span>
          {page() + 1} / {pageCount()}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(pageCount() - 1, p + 1))} disabled={page() + 1 >= pageCount()}>
          <Icon name="arrow-right" size={16} />
        </Button>
      </div>

      <Show when={showCreate()}>
        <CreateStocktakeModal
          onClose={() => setShowCreate(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['stocktakes'] })}
        />
      </Show>

      <Show when={confirmDelete()}>
        <Modal
          title="Delete stocktakes?"
          maxWidth={440}
          onClose={() => setConfirmDelete(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting()}>
                Cancel
              </Button>
              <Button variant="destructive" busy={deleting()} onClick={doDelete}>
                Delete
              </Button>
            </>
          }
        >
          <p>
            Permanently delete {[...selected()].length} selected stocktake(s)? This cannot be
            undone.
          </p>
        </Modal>
      </Show>
    </div>
  );
}
