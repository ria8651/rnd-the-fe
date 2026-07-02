import { h } from '../../core/dom';
import { icon } from '../../icons';
import { signal, effect, type Getter } from '../../core/signal';
import { route, setQuery, navigate } from '../../core/router';
import { button } from '../../components/button';
import { dataTable, type Column, type TableState } from '../../components/table';
import { filterMenu, type FilterDef } from '../../components/filterMenu';
import { confirmDialog } from '../../components/modal';
import { toast } from '../../components/toast';
import { fetchStocktakes, deleteStocktakes } from '../../api/stocktakes';
import type { Stocktake, StocktakeStatus } from '../../api/types';
import { formatDate } from '../../core/format';
import { currentStoreId } from '../../context/auth';
import { t } from '../../context/i18n';
import { openCreateFlow } from './create';

const STATUS_FILTER: FilterDef = {
  key: 'status',
  label: 'Status',
  type: 'enum',
  options: [
    { value: 'NEW', label: 'New' },
    { value: 'FINALISED', label: 'Finalised' },
  ],
};

const DEFAULT_SORT = 'stocktakeNumber:desc';

function parseSort(param: string | null): { key: string; desc: boolean } {
  const raw = param || DEFAULT_SORT;
  const [key, dir] = raw.split(':');
  return { key, desc: dir === 'desc' };
}

function statusBadge(status: StocktakeStatus): HTMLElement {
  return h('span', { class: `badge ${status === 'NEW' ? 'badge--new' : 'badge--finalised'}` }, status === 'NEW' ? t('New') : t('Finalised'));
}

export function stocktakesList(): HTMLElement {
  const [rows, setRows] = signal<Stocktake[]>([]);
  const [state, setState] = signal<TableState>('loading');
  const [selected, setSelected] = signal<Set<string>>(new Set());
  const [total, setTotal] = signal(0);

  const query = () => route().query;
  const statusParam = (): StocktakeStatus | null => (query().get('status') as StocktakeStatus) || null;
  const sort: Getter<{ key: string; desc: boolean }> = () => parseSort(query().get('sort'));
  const page = () => Number(query().get('page') || '1');
  const filterValues = () => {
    const v: Record<string, string> = {};
    const s = query().get('status');
    if (s) v.status = s;
    return v;
  };

  // Reload whenever store / filter / sort / page change (URL is source of truth).
  effect(() => {
    const store = currentStoreId();
    const st = statusParam();
    const s = sort();
    const p = page();
    if (!store) return;
    setState('loading');
    fetchStocktakes(store, { statusEq: st, sortKey: s.key, sortDesc: s.desc, page: p })
      .then((res) => {
        setRows(res.nodes);
        setTotal(res.totalCount);
        setSelected(new Set());
        setState(res.nodes.length ? 'normal' : st ? 'empty-filtered' : 'empty-none');
      })
      .catch(() => setState('error'));
  });

  const onSort = (key: string) => {
    const s = sort();
    const desc = s.key === key ? !s.desc : false;
    const value = `${key}:${desc ? 'desc' : 'asc'}`;
    setQuery({ sort: value === DEFAULT_SORT ? null : value, page: null });
  };

  const columns: Column<Stocktake>[] = [
    { key: 'stocktakeNumber', header: 'No.', num: true, sortable: true, width: '80px', render: (r) => String(r.stocktakeNumber) },
    { key: 'status', header: t('Status'), sortable: true, render: (r) => statusBadge(r.status) },
    { key: 'description', header: t('Description'), sortable: true, ellipsis: true, render: (r) => r.description || '' },
    { key: 'comment', header: t('Comment'), priority: 3, ellipsis: true, render: (r) => r.comment || '' },
    { key: 'createdDatetime', header: 'Created', sortable: true, priority: 2, width: '120px', render: (r) => formatDate(r.createdDatetime) },
    { key: 'finalisedDatetime', header: 'Finalised', priority: 3, width: '120px', render: (r) => formatDate(r.finalisedDatetime) },
    { key: 'isLocked', header: 'Locked', priority: 2, width: '80px', render: (r) => (r.isLocked ? icon('info-outline', { size: 16, title: 'Locked' }) : '') },
  ];

  const toggleRow = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  const toggleAll = (checked: boolean) => setSelected(checked ? new Set(rows().map((r) => r.id)) : new Set());

  const exportCsv = () => {
    const header = ['Number', 'Status', 'Description', 'Comment', 'Created', 'Finalised', 'Locked'];
    const lines = rows().map((r) =>
      [r.stocktakeNumber, r.status, r.description ?? '', r.comment ?? '', formatDate(r.createdDatetime), formatDate(r.finalisedDatetime), r.isLocked]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = [header.join(','), ...lines].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stocktakes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const bulkDelete = () => {
    const ids = [...selected()];
    confirmDialog({
      title: `Delete ${ids.length} stocktake${ids.length === 1 ? '' : 's'}?`,
      message: 'This cannot be undone.',
      danger: true,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        const store = currentStoreId();
        if (!store) return;
        await deleteStocktakes(store, ids);
        toast(`Deleted ${ids.length} stocktake${ids.length === 1 ? '' : 's'}.`, 'success');
        setSelected(new Set());
        setQuery({ _r: String(Date.now()) }); // force reload
      },
    });
  };

  const appbar = h(
    'div',
    { class: 'appbar' },
    h('h1', { style: { font: 'var(--type-heading)', margin: '0' } }, t('Stocktakes')),
    filterMenu({
      defs: [STATUS_FILTER],
      values: filterValues,
      onChange: (key, value) => setQuery({ [key]: value, page: null }),
      onClearAll: () => setQuery({ status: null, page: null }),
    }),
    h('div', { class: 'appbar__spacer' }),
    () =>
      selected().size > 0
        ? button({ label: `Delete (${selected().size})`, icon: 'delete', variant: 'destructive', onClick: bulkDelete })
        : h('div', { class: 'row' },
            button({ label: 'Export', icon: 'download', variant: 'secondary', onClick: exportCsv }),
            button({ label: t('New stocktake'), icon: 'plus-circle', variant: 'primary', onClick: () => openCreateFlow() }),
          ),
  );

  const table = dataTable<Stocktake>({
    columns,
    rows,
    rowKey: (r) => r.id,
    state,
    selectable: true,
    selected,
    onToggleRow: toggleRow,
    onToggleAll: toggleAll,
    sort,
    onSort,
    onRowClick: (r) => {
      const store = currentStoreId();
      if (store) navigate(`/${store}/inventory/stocktakes/${r.stocktakeNumber}`);
    },
    onClearFilters: () => setQuery({ status: null, page: null }),
    onRetry: () => setQuery({ _r: String(Date.now()) }),
    emptyNoneMessage: 'No stocktakes yet. Create one to get started.',
  });

  const footer = h('div', { class: 'footer' },
    h('span', { class: 'muted small' }, () => `${total()} stocktake${total() === 1 ? '' : 's'}`),
  );

  return h('div', { class: 'page' }, appbar, h('div', { class: 'page__body', style: { padding: '0' } }, table), footer);
}
