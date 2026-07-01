/**
 * S1 — Stocktakes list screen (spec/stocktakes/05-ui-surface.md › S1). A paginated, sortable
 * table with an add-a-filter menu (status: New / Finalised, persisted in the URL — AC-L1),
 * a New-stocktake action opening the create flow (S2), CSV export (AC-L3), and row selection
 * for bulk delete (AC-L2). Deep-linking is by human number (AC-L4): rows open /stocktakes/:number.
 */
import { type JSX, Show, createMemo, createResource, createSignal } from 'solid-js';
import { useNavigate, useSearchParams } from '@solidjs/router';
import { PageLayout } from '../../chrome/PageLayout';
import { Table } from '../../ui/Table';
import type { Column, SortState } from '../../ui/table-model';
import { IconButton, Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { StatusBadge } from '../../ui/StatusBadge';
import { Popover } from '../../ui/Popover';
import { SelectField } from '../../ui/inputs/SelectField';
import { ConfirmDialog } from '../../ui/Modal';
import { toast } from '../../ui/toast';
import { formatDateTime } from '../../format';
import { auth } from '../../state/auth';
import { listStocktakes, deleteStocktakes } from './api';
import type { Stocktake, StocktakeStatus, StocktakeSortKey } from './types';
import { StocktakeCreateModal } from './StocktakeCreateModal';

const PER_PAGE = 25;
const SORTABLE: StocktakeSortKey[] = [
  'stocktakeNumber',
  'status',
  'description',
  'comment',
  'createdDatetime',
  'finalisedDatetime'
];

export function StocktakeListPage(): JSX.Element {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [page, setPage] = createSignal(0);
  const [selected, setSelected] = createSignal<Set<string>>(new Set());
  const [filterMenu, setFilterMenu] = createSignal(false);
  const [statusActive, setStatusActive] = createSignal(!!params.status);
  const [showCreate, setShowCreate] = createSignal(false);
  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);

  const str = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);
  const statusFilter = (): StocktakeStatus | undefined => {
    const v = str(params.status);
    return v === 'NEW' || v === 'FINALISED' ? v : undefined;
  };
  const sortKey = (): StocktakeSortKey => {
    const v = str(params.sort) ?? '';
    return (SORTABLE as string[]).includes(v) ? (v as StocktakeSortKey) : 'createdDatetime';
  };
  const sortDir = (): 'asc' | 'desc' => (str(params.dir) === 'asc' ? 'asc' : 'desc');

  const [data, { refetch }] = createResource(
    () => ({
      storeId: auth.storeId,
      page: page(),
      sortKey: sortKey(),
      sortDir: sortDir(),
      status: statusFilter()
    }),
    (p) => listStocktakes(p.storeId, { page: p.page, perPage: PER_PAGE, sortKey: p.sortKey, sortDir: p.sortDir, status: p.status })
  );

  const rows = () => data()?.nodes ?? [];
  const total = () => data()?.totalCount ?? 0;
  const maxPage = () => Math.max(0, Math.ceil(total() / PER_PAGE) - 1);

  const sortState = createMemo<SortState>(() => ({ key: sortKey(), dir: sortDir() }));
  const onSort = (s: SortState) => {
    setParams({ sort: s.key, dir: s.dir });
    setPage(0);
    setSelected(new Set<string>());
  };

  const setStatus = (v: StocktakeStatus | '') => {
    setParams({ status: v || undefined });
    setPage(0);
    setSelected(new Set<string>());
  };
  const removeStatusFilter = () => {
    setStatusActive(false);
    setStatus('');
  };
  const clearAllFilters = () => {
    setFilterMenu(false);
    removeStatusFilter();
  };

  const columns: Column<Stocktake>[] = [
    {
      key: 'stocktakeNumber',
      header: 'No.',
      role: 'identifier',
      numeric: true,
      sortable: true,
      width: '90px',
      priority: 1,
      accessor: (r) => r.stocktakeNumber,
      format: (r) => String(r.stocktakeNumber)
    },
    {
      key: 'status',
      header: 'Status',
      role: 'status',
      sortable: true,
      width: '130px',
      priority: 1,
      cell: (r) =>
        r.status === 'FINALISED' ? (
          <StatusBadge label="Finalised" tone="success" icon="check-circle" />
        ) : (
          <StatusBadge label="New" tone="info" />
        )
    },
    { key: 'description', header: 'Description', sortable: true, priority: 2, format: (r) => r.description ?? '' },
    { key: 'comment', header: 'Comment', priority: 3, format: (r) => r.comment ?? '' },
    {
      key: 'createdDatetime',
      header: 'Created',
      sortable: true,
      width: '160px',
      priority: 2,
      accessor: (r) => r.createdDatetime,
      format: (r) => formatDateTime(r.createdDatetime)
    },
    {
      key: 'finalisedDatetime',
      header: 'Finalised',
      sortable: true,
      width: '160px',
      priority: 3,
      accessor: (r) => r.finalisedDatetime,
      format: (r) => formatDateTime(r.finalisedDatetime)
    },
    {
      key: 'locked',
      header: 'Locked',
      width: '90px',
      priority: 3,
      cell: (r) => (r.isLocked ? <StatusBadge label="On hold" tone="warning" /> : <span />)
    }
  ];

  const exportCsv = () => {
    const header = ['No.', 'Status', 'Description', 'Comment', 'Created', 'Finalised', 'Locked'];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [header.map(esc).join(',')];
    for (const r of rows()) {
      lines.push(
        [
          String(r.stocktakeNumber),
          r.status,
          r.description ?? '',
          r.comment ?? '',
          formatDateTime(r.createdDatetime),
          formatDateTime(r.finalisedDatetime),
          r.isLocked ? 'yes' : 'no'
        ]
          .map(esc)
          .join(',')
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stocktakes-${auth.currentStore?.code ?? 'store'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doBulkDelete = async () => {
    setDeleting(true);
    try {
      await deleteStocktakes(auth.storeId, [...selected()]);
      toast(`Deleted ${selected().size} stocktake(s)`, 'success');
      setSelected(new Set<string>());
      setConfirmDelete(false);
      void refetch();
    } catch (e) {
      toast('Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageLayout
        title="Stocktakes"
        toolbarStart={
          <div class="filter-bar">
            <Popover
              open={filterMenu()}
              onClose={() => setFilterMenu(false)}
              placement="bottom-start"
              trigger={
                <button
                  class="btn btn--secondary btn--compact"
                  type="button"
                  data-popover-trigger
                  aria-haspopup="menu"
                  aria-expanded={filterMenu()}
                  onClick={() => setFilterMenu(!filterMenu())}
                >
                  <Icon name="filter" size={16} /> Filters
                </button>
              }
            >
              <ul class="menu" role="menu">
                <Show
                  when={!statusActive()}
                  fallback={
                    <li class="menu-item" style={{ color: 'var(--text-secondary)' }}>
                      All filters applied
                    </li>
                  }
                >
                  <li role="none">
                    <button
                      class="menu-item"
                      type="button"
                      onClick={() => {
                        setStatusActive(true);
                        setFilterMenu(false);
                      }}
                    >
                      <span class="menu-check" />
                      <span class="menu-item__label">Status</span>
                    </button>
                  </li>
                </Show>
                <li role="none">
                  <button class="menu-item" type="button" onClick={clearAllFilters}>
                    <span class="menu-check" />
                    <span class="menu-item__label">Remove all filters</span>
                  </button>
                </li>
              </ul>
            </Popover>

            <Show when={statusActive()}>
              <div class="filter-chip">
                <span class="filter-chip__label">Status</span>
                <SelectField
                  compact
                  value={statusFilter() ?? ''}
                  onChange={(v) => setStatus(v as StocktakeStatus | '')}
                  width="150px"
                  options={[
                    { value: 'NEW', label: 'New' },
                    { value: 'FINALISED', label: 'Finalised' }
                  ]}
                  placeholder="Any"
                />
                <button class="filter-chip__remove" type="button" aria-label="Remove status filter" onClick={removeStatusFilter}>
                  <Icon name="close" size={16} />
                </button>
              </div>
            </Show>
          </div>
        }
        toolbar={
          <>
            <IconButton icon="download" label="Export to CSV" text="Export" onClick={exportCsv} />
            <Button variant="primary" icon="plus-circle" onClick={() => setShowCreate(true)}>
              New stocktake
            </Button>
          </>
        }
        footer={
          <Show when={selected().size > 0}>
            <div class="bulk-bar">
              <button class="icon-btn icon-btn--plain" type="button" aria-label="Clear selection" onClick={() => setSelected(new Set<string>())}>
                <Icon name="minus-circle" size={20} />
              </button>
              <span class="bulk-bar__count">{selected().size} selected</span>
              <span class="bulk-bar__spacer" />
              <Button variant="danger" icon="delete" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            </div>
          </Show>
        }
      >
        <Table
          columns={columns}
          rows={rows()}
          getRowId={(r) => r.id}
          selectable
          selected={selected()}
          onSelectedChange={setSelected}
          sort={sortState()}
          onSort={onSort}
          clientSort={false}
          loading={data.loading}
          error={data.error ? 'Could not load stocktakes.' : undefined}
          onRetry={() => refetch()}
          emptyText="No stocktakes yet. Create one to get started."
          emptyFiltered={!!statusFilter()}
          onClearFilters={clearAllFilters}
          onRowClick={(r) => navigate(`/stocktakes/${r.stocktakeNumber}`)}
          caption="Stocktakes"
        />
        <Show when={total() > PER_PAGE}>
          <div class="pager">
            <span>
              {page() * PER_PAGE + 1}–{Math.min((page() + 1) * PER_PAGE, total())} of {total()}
            </span>
            <div class="pager__btns">
              <button
                class="icon-btn icon-btn--plain"
                type="button"
                aria-label="Previous page"
                disabled={page() === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <Icon name="arrow-left" size={18} flipRtl />
              </button>
              <button
                class="icon-btn icon-btn--plain"
                type="button"
                aria-label="Next page"
                disabled={page() >= maxPage()}
                onClick={() => setPage((p) => Math.min(maxPage(), p + 1))}
              >
                <Icon name="arrow-right" size={18} flipRtl />
              </button>
            </div>
          </div>
        </Show>
      </PageLayout>

      <StocktakeCreateModal
        open={showCreate()}
        onClose={() => setShowCreate(false)}
        onCreated={(number) => {
          setShowCreate(false);
          navigate(`/stocktakes/${number}`);
        }}
      />

      <ConfirmDialog
        open={confirmDelete()}
        title="Delete stocktakes?"
        message={`Delete ${selected().size} selected stocktake(s)? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={deleting()}
        onConfirm={doBulkDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
