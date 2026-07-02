import { createResource, createSignal, createMemo, Show, type JSX } from 'solid-js';
import { useParams, useNavigate, useSearchParams } from '@solidjs/router';
import { Table, type Column, type TableState } from '../../ui/Table';
import { FilterBar } from '../../ui/FilterBar';
import { Button } from '../../ui/Button';
import { StatusBadge } from '../../ui/StatusBadge';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { CreateStocktakeModal } from './StocktakeCreateModal';
import { fetchStocktakes, deleteStocktakes } from './api';
import type { StocktakeListItem } from './types';
import { formatDate } from '../../lib/format';
import { toCsv, downloadCsv } from '../../lib/csv';
import { toast } from '../../state/toast';
import './stocktakes.css';

/*
 * S1 — Stocktake list. Paginated, sortable table; a status filter (New / Finalised)
 * added from the filter menu and persisted in the URL (AC-L1); bulk delete (AC-L2);
 * CSV export (AC-L3); rows open the detail by human number (AC-L4). List state
 * (filter/sort/page) lives in the URL and replaces history (urls.md).
 */

const PAGE_SIZE = 25;
const DEFAULT_SORT = 'createdDatetime:desc';

function parseSort(sort: string | undefined): { key: string; desc: boolean } {
  const [key, dir] = (sort ?? DEFAULT_SORT).split(':');
  return { key: key!, desc: dir === 'desc' };
}

export function StocktakeListPage(): JSX.Element {
  const params = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();

  const status = () => (search.status as string | undefined) || undefined;
  const sort = () => parseSort(search.sort as string | undefined);
  const page = () => Number(search.page ?? 1) || 1;

  // Replace history for list-state changes (Back shouldn't unwind each tweak).
  const setListState = (patch: Record<string, string | undefined>) =>
    setSearch(patch, { replace: true });

  const [refreshKey, setRefreshKey] = createSignal(0);
  const source = createMemo(() => ({
    storeId: params.storeId!,
    status: status() as StocktakeListItem['status'] | undefined,
    sortKey: sort().key,
    sortDesc: sort().desc,
    page: page(),
    _k: refreshKey(),
  }));

  const [data] = createResource(source, (s) =>
    fetchStocktakes({
      storeId: s.storeId,
      status: s.status,
      sortKey: s.sortKey,
      sortDesc: s.sortDesc,
      page: s.page,
      pageSize: PAGE_SIZE,
    }),
  );

  const [selected, setSelected] = createSignal<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  const [createOpen, setCreateOpen] = createSignal(false);

  const rows = () => data()?.nodes ?? [];
  const totalCount = () => data()?.totalCount ?? 0;
  const totalPages = () => Math.max(1, Math.ceil(totalCount() / PAGE_SIZE));

  const tableState = (): TableState => {
    if (data.loading && !data()) return 'loading';
    if (data.error) return 'error';
    if (rows().length === 0) return status() ? 'empty-no-matches' : 'empty-no-records';
    return 'normal';
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) => (prev.size === rows().length ? new Set<string>() : new Set(rows().map((r) => r.id))));

  const onSort = (key: string) => {
    const cur = sort();
    const desc = cur.key === key ? !cur.desc : true;
    setListState({ sort: `${key}:${desc ? 'desc' : 'asc'}`, page: undefined });
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await deleteStocktakes(params.storeId!, [...selected()]);
      toast.success(`Deleted ${selected().size} stocktake(s).`);
      setSelected(new Set<string>());
      setConfirmDelete(false);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const exportCsv = () => {
    const headers = ['Number', 'Status', 'Description', 'Comment', 'Created', 'Finalised', 'Locked'];
    const body = rows().map((r) => [
      r.stocktakeNumber,
      r.status,
      r.description ?? '',
      r.comment ?? '',
      formatDate(r.createdDatetime),
      formatDate(r.finalisedDatetime),
      r.isLocked ? 'Yes' : 'No',
    ]);
    downloadCsv('stocktakes.csv', toCsv(headers, body));
  };

  const columns: Column<StocktakeListItem>[] = [
    {
      key: 'stocktakeNumber',
      header: 'Number',
      sortable: true,
      align: 'right',
      width: '90px',
      render: (r) => (
        <span class="tabular st-number">
          #{r.stocktakeNumber}
          <Show when={r.isLocked}>
            <span class="st-held" title="On hold (locked)">held</span>
          </Show>
        </span>
      ),
      cardHidden: true,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (r) => <StatusBadge label={r.status === 'NEW' ? 'New' : 'Finalised'} tone={r.status === 'NEW' ? 'info' : 'success'} />,
      cardHidden: true,
    },
    { key: 'description', header: 'Description', sortable: true, render: (r) => <span class="cell-truncate">{r.description || '—'}</span> },
    { key: 'comment', header: 'Comment', priority: 3, render: (r) => <span class="cell-truncate">{r.comment || '—'}</span> },
    { key: 'createdDatetime', header: 'Created', sortable: true, priority: 2, width: '120px', render: (r) => formatDate(r.createdDatetime) },
    { key: 'finalisedDatetime', header: 'Finalised', sortable: true, priority: 2, width: '120px', render: (r) => formatDate(r.finalisedDatetime) || '—' },
  ];

  const selection = {
    isSelected: (id: string) => selected().has(id),
    onToggle: toggle,
    onToggleAll: toggleAll,
    get allSelected() {
      return rows().length > 0 && selected().size === rows().length;
    },
    get someSelected() {
      return selected().size > 0;
    },
  };

  return (
    <div class="page">
      <div class="page-toolbar">
        <FilterBar
          defs={[
            {
              key: 'status',
              label: 'Status',
              type: 'enum',
              options: [
                { value: 'NEW', label: 'New' },
                { value: 'FINALISED', label: 'Finalised' },
              ],
            },
          ]}
          values={{ status: status() }}
          onChange={(_k, v) => setListState({ status: v, page: undefined })}
        >
          <Show when={selected().size > 0}>
            <Button
              label={`Delete (${selected().size})`}
              variant="destructive"
              icon="delete"
              compact
              onClick={() => setConfirmDelete(true)}
            />
          </Show>
          <Button label="Export" icon="download" variant="secondary" compact onClick={exportCsv} />
          <Button label="New stocktake" icon="plus-circle" variant="primary" compact onClick={() => setCreateOpen(true)} />
        </FilterBar>
      </div>

      <div class="page-body">
        <Table
          caption="Stocktakes"
          columns={columns}
          rows={rows()}
          rowKey={(r) => r.id}
          selection={selection}
          sort={sort()}
          onSort={onSort}
          state={tableState()}
          errorMessage={data.error ? (data.error as Error).message : undefined}
          onRetry={() => setRefreshKey((k) => k + 1)}
          onClearFilters={() => setListState({ status: undefined, page: undefined })}
          onRowClick={(r) => navigate(`/${params.storeId}/inventory/stocktakes/${r.stocktakeNumber}`)}
          cardTitle={(r) => <>#{r.stocktakeNumber} {r.description || ''}</>}
          cardStatus={(r) => <StatusBadge label={r.status === 'NEW' ? 'New' : 'Finalised'} tone={r.status === 'NEW' ? 'info' : 'success'} />}
        />
      </div>

      <div class="page-footer">
        <span class="page-count tabular">
          {totalCount()} stocktake{totalCount() === 1 ? '' : 's'}
        </span>
        <Show when={totalPages() > 1}>
          <div class="pagination">
            <Button
              icon="arrow-left"
              aria-label="Previous page"
              variant="ghost"
              compact
              disabled={page() <= 1}
              onClick={() => setListState({ page: String(page() - 1) })}
            />
            <span class="tabular">
              {page()} / {totalPages()}
            </span>
            <Button
              icon="arrow-right"
              aria-label="Next page"
              variant="ghost"
              compact
              disabled={page() >= totalPages()}
              onClick={() => setListState({ page: String(page() + 1) })}
            />
          </div>
        </Show>
      </div>

      <CreateStocktakeModal
        open={createOpen()}
        storeId={params.storeId!}
        onClose={() => setCreateOpen(false)}
        onCreated={(number) => {
          setCreateOpen(false);
          navigate(`/${params.storeId}/inventory/stocktakes/${number}`);
        }}
      />

      <ConfirmDialog
        open={confirmDelete()}
        title="Delete stocktakes?"
        message={`Permanently delete ${selected().size} selected stocktake(s)?`}
        destructive
        confirmLabel="Delete"
        busy={deleting()}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
