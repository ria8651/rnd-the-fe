import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/app/layout/PageLayout';
import { DataTable, type Column, type SortState } from '@/components/DataTable';
import { Button } from '@/components/Button';
import { FilterBar, type FilterDef } from '@/components/FilterBar';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Icon } from '@/icons/Icon';
import { useToast } from '@/components/Toast';
import { useStoreId } from '@/app/auth/AuthContext';
import { useTranslation } from '@/app/i18n/i18n';
import { formatDate } from '@/lib/format';
import { deleteStocktakes, fetchStocktakes } from './api';
import { CreateStocktakeDialog } from './CreateStocktakeDialog';
import { toCsv, downloadCsv } from './csv';
import type { Stocktake, StocktakeSortField, StocktakeStatus } from './types';
import './StocktakeListPage.css';

const PAGE_SIZE = 25;

const STATUS_FILTER: FilterDef = {
  key: 'status',
  label: 'Status',
  type: 'enum',
  options: [
    { value: 'NEW', label: 'New' },
    { value: 'FINALISED', label: 'Finalised' },
  ],
};

export function StocktakeListPage() {
  const storeId = useStoreId();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const t = useTranslation();
  const [params, setParams] = useSearchParams();

  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ---- URL-bound state (shareable, survives reload) ----
  const status = (params.get('status') as StocktakeStatus | null) ?? null;
  const sortField = (params.get('sort') as StocktakeSortField) ?? 'createdDatetime';
  const sortDesc = params.get('dir') !== 'asc';
  const page = Math.max(0, Number(params.get('page') ?? '0'));

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value == null || value === '') next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page'); // changing filter/sort resets paging
    setParams(next, { replace: true });
  };

  const listQuery = useQuery({
    queryKey: ['stocktakes', storeId, status, sortField, sortDesc, page],
    queryFn: ({ signal }) =>
      fetchStocktakes(
        storeId!,
        { status, page, pageSize: PAGE_SIZE, sortField, sortDesc },
        signal,
      ),
    enabled: !!storeId,
    placeholderData: (prev) => prev, // keep rows visible during refetch
  });

  const rows = listQuery.data?.nodes ?? [];
  const totalCount = listQuery.data?.totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const del = useMutation({
    mutationFn: (ids: string[]) => deleteStocktakes(storeId!, ids),
    onSuccess: (results) => {
      const ok = results.filter((r) => r.ok).length;
      const failed = results.filter((r) => !r.ok);
      if (ok) toast.success(`Deleted ${ok} stocktake${ok === 1 ? '' : 's'}`);
      if (failed.length) toast.error(`${failed.length} could not be deleted`);
      setSelected(new Set());
      setConfirmDelete(false);
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
    },
    onError: (e) => {
      toast.error((e as Error).message);
      setConfirmDelete(false);
    },
  });

  const columns = useMemo<Column<Stocktake>[]>(
    () => [
      {
        key: 'stocktakeNumber',
        header: '#',
        priority: 1,
        sortable: true,
        align: 'right',
        width: 80,
        render: (r) => r.stocktakeNumber,
      },
      {
        key: 'status',
        header: 'Status',
        priority: 1,
        sortable: true,
        width: 120,
        render: (r) => (
          <StatusBadge
            label={r.status === 'NEW' ? 'New' : 'Finalised'}
            tone={r.status === 'NEW' ? 'info' : 'success'}
          />
        ),
      },
      {
        key: 'description',
        header: 'Description',
        priority: 2,
        sortable: true,
        render: (r) => r.description || <span className="oms-muted">—</span>,
      },
      {
        key: 'comment',
        header: 'Comment',
        priority: 3,
        render: (r) =>
          r.comment ? (
            <span className="oms-truncate" title={r.comment}>
              {r.comment}
            </span>
          ) : (
            <span className="oms-muted">—</span>
          ),
      },
      {
        key: 'createdDatetime',
        header: 'Created',
        priority: 2,
        sortable: true,
        width: 120,
        render: (r) => formatDate(r.createdDatetime),
      },
      {
        key: 'finalisedDatetime',
        header: 'Finalised',
        priority: 3,
        sortable: true,
        width: 120,
        render: (r) =>
          r.finalisedDatetime ? formatDate(r.finalisedDatetime) : <span className="oms-muted">—</span>,
      },
      {
        key: 'isLocked',
        header: 'Locked',
        priority: 2,
        align: 'center',
        width: 80,
        render: (r) =>
          r.isLocked ? (
            <Icon name="eye-off" size={18} title="Locked" />
          ) : (
            <span className="oms-muted">—</span>
          ),
      },
    ],
    [],
  );

  const sort: SortState = { key: sortField, desc: sortDesc };
  const onSortChange = (s: SortState) => {
    const next = new URLSearchParams(params);
    next.set('sort', s.key);
    next.set('dir', s.desc ? 'desc' : 'asc');
    next.delete('page');
    setParams(next, { replace: true });
  };

  const [exporting, setExporting] = useState(false);
  const exportCsv = async () => {
    if (!storeId) return;
    setExporting(true);
    try {
      // Export the whole filtered list, not just the current page.
      const all = await fetchStocktakes(storeId, {
        status,
        page: 0,
        pageSize: Math.max(totalCount, PAGE_SIZE),
        sortField,
        sortDesc,
      });
      const csv = toCsv(
        ['Number', 'Status', 'Description', 'Comment', 'Created', 'Finalised', 'Locked'],
        all.nodes.map((r) => [
          r.stocktakeNumber,
          r.status === 'NEW' ? 'New' : 'Finalised',
          r.description ?? '',
          r.comment ?? '',
          formatDate(r.createdDatetime),
          r.finalisedDatetime ? formatDate(r.finalisedDatetime) : '',
          r.isLocked ? 'Yes' : 'No',
        ]),
      );
      downloadCsv('stocktakes.csv', csv);
      toast.success(`Exported ${all.nodes.length} stocktakes to CSV`);
    } catch (e) {
      toast.error(`Export failed: ${(e as Error).message}`);
    } finally {
      setExporting(false);
    }
  };

  const appBar = (
    <div className="oms-listbar">
      <h1 className="oms-listbar__title">{t('stocktakes.title')}</h1>
      <div className="oms-listbar__filters">
        <FilterBar
          filters={[STATUS_FILTER]}
          values={{ status }}
          onChange={(k, v) => setParam(k, v)}
          onRemoveAll={() => setParam('status', null)}
        />
      </div>
      <div className="oms-listbar__actions">
        <Button
          variant="secondary"
          size="compact"
          icon="download"
          onClick={exportCsv}
          busy={exporting}
        >
          Export
        </Button>
        <Button variant="primary" size="compact" icon="plus-circle" onClick={() => setCreateOpen(true)}>
          {t('action.newStocktake')}
        </Button>
      </div>
    </div>
  );

  const selectionFooter =
    selected.size > 0 ? (
      <div className="oms-selection-bar">
        <Button
          variant="ghost"
          size="compact"
          icon="minus-circle"
          onClick={() => setSelected(new Set())}
        >
          Clear
        </Button>
        <span className="oms-selection-bar__count">{selected.size} selected</span>
        <div style={{ flex: 1 }} />
        <Button
          variant="destructive"
          size="compact"
          icon="delete"
          onClick={() => setConfirmDelete(true)}
        >
          Delete
        </Button>
      </div>
    ) : undefined;

  return (
    <PageLayout appBar={appBar} footer={selectionFooter}>
      <DataTable
        caption="Stocktakes"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        sort={sort}
        onSortChange={onSortChange}
        onRowClick={(r) => navigate(`/inventory/stocktakes/${r.stocktakeNumber}`)}
        loading={listQuery.isLoading || listQuery.isFetching}
        error={listQuery.isError ? (listQuery.error as Error).message : undefined}
        onRetry={() => listQuery.refetch()}
        isFiltered={!!status}
        onClearFilters={() => setParam('status', null)}
        emptyMessage="No stocktakes yet — create one to get started"
        emptyFilteredMessage="No stocktakes match the current filter"
      />

      {totalCount > PAGE_SIZE && (
        <div className="oms-pager">
          <Button
            variant="secondary"
            size="compact"
            icon="arrow-left"
            disabled={page === 0}
            onClick={() => setParam('page', String(page - 1))}
          >
            Previous
          </Button>
          <span className="oms-pager__info tabular">
            Page {page + 1} of {pageCount} · {totalCount} total
          </span>
          <Button
            variant="secondary"
            size="compact"
            icon="arrow-right"
            iconTrailing
            disabled={page + 1 >= pageCount}
            onClick={() => setParam('page', String(page + 1))}
          >
            Next
          </Button>
        </div>
      )}

      <CreateStocktakeDialog
        storeId={storeId!}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(result) => {
          setCreateOpen(false);
          toast.success(`Created stocktake #${result.stocktakeNumber}`);
          qc.invalidateQueries({ queryKey: ['stocktakes'] });
          navigate(`/inventory/stocktakes/${result.stocktakeNumber}`);
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => del.mutate([...selected])}
        title={`Delete ${selected.size} stocktake${selected.size === 1 ? '' : 's'}?`}
        message="This cannot be undone."
        confirmLabel="Delete"
        destructive
        busy={del.isPending}
      />
    </PageLayout>
  );
}
