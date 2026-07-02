<script lang="ts">
  // S1 — Stocktakes list (spec stocktakes/05-ui-surface.md#s1--list-screen).
  // Paginated/sortable table; add-a-filter menu (status) persisted in the URL; bulk
  // delete; CSV export; rows deep-link by stocktake number.
  import { untrack } from 'svelte';
  import Icon from '../../lib/components/Icon.svelte';
  import Button from '../../lib/components/Button.svelte';
  import Popover from '../../lib/components/Popover.svelte';
  import Select from '../../lib/components/Select.svelte';
  import StatusBadge from '../../lib/components/StatusBadge.svelte';
  import ConfirmDialog from '../../lib/components/ConfirmDialog.svelte';
  import { auth } from '../../lib/state/auth.svelte';
  import { router } from '../../lib/router.svelte';
  import { toasts } from '../../lib/state/toast.svelte';
  import { listStocktakes, deleteStocktakes, type SortKey } from '../../lib/api/stocktakes';
  import type { StocktakeHeader, StocktakeStatus } from '../../lib/api/types';
  import { formatDate } from '../../lib/util/format';

  const PAGE_SIZE = 25;

  let storeId = $derived(auth.activeStoreId!);

  // ---- URL-bound view state -------------------------------------------------
  let status = $derived((router.query.get('status') as StocktakeStatus | null) ?? null);
  let sortParam = $derived(router.query.get('sort') ?? 'createdDatetime:desc');
  let sortKey = $derived(sortParam.split(':')[0] as SortKey);
  let sortDesc = $derived(sortParam.endsWith(':desc'));
  let page = $derived(Number(router.query.get('page') ?? '1'));

  function updateQuery(mut: (q: URLSearchParams) => void, resetPage = false) {
    const q = new URLSearchParams(router.query);
    mut(q);
    if (resetPage) q.delete('page');
    router.setQuery(q);
  }

  function setSort(key: SortKey) {
    const desc = sortKey === key ? !sortDesc : false;
    updateQuery((q) => q.set('sort', `${key}:${desc ? 'desc' : 'asc'}`));
  }
  function goPage(p: number) {
    updateQuery((q) => (p === 1 ? q.delete('page') : q.set('page', String(p))));
  }

  // ---- Data -----------------------------------------------------------------
  let rows = $state<StocktakeHeader[]>([]);
  let totalCount = $state(0);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let selected = $state<Set<string>>(new Set());

  $effect(() => {
    // Re-query whenever store or URL view-state changes.
    const args = { storeId, status, sortKey, sortDesc, page, pageSize: PAGE_SIZE };
    loading = true;
    error = null;
    listStocktakes(args)
      .then((res) => {
        rows = res.nodes;
        totalCount = res.totalCount;
        untrack(() => (selected = new Set()));
      })
      .catch((e) => (error = String(e?.message ?? e)))
      .finally(() => (loading = false));
  });

  let pageCount = $derived(Math.max(1, Math.ceil(totalCount / PAGE_SIZE)));
  let allSelected = $derived(rows.length > 0 && rows.every((r) => selected.has(r.id)));

  function toggleRow(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    selected = next;
  }
  function toggleAll() {
    selected = allSelected ? new Set() : new Set(rows.map((r) => r.id));
  }

  // ---- Filter menu ----------------------------------------------------------
  let filterBtn = $state<HTMLElement | null>(null);
  let filterMenuOpen = $state(false);
  let statusActive = $derived(status !== null);

  function addStatusFilter() {
    updateQuery((q) => q.set('status', 'NEW'), true);
    filterMenuOpen = false;
  }
  function removeStatusFilter() {
    updateQuery((q) => q.delete('status'), true);
  }
  function removeAllFilters() {
    updateQuery((q) => q.delete('status'), true);
    filterMenuOpen = false;
  }

  // ---- Bulk delete ----------------------------------------------------------
  let confirmDelete = $state(false);
  let deleting = $state(false);
  async function doDelete() {
    deleting = true;
    const { errors } = await deleteStocktakes(storeId, [...selected]);
    deleting = false;
    confirmDelete = false;
    if (errors.length) toasts.error(`${errors.length} could not be deleted: ${errors[0].description}`);
    else toasts.success(`Deleted ${selected.size} stocktake(s).`);
    selected = new Set();
    // refresh
    updateQuery((q) => q);
  }

  // ---- CSV export -----------------------------------------------------------
  function exportCsv() {
    const headers = ['Number', 'Status', 'Description', 'Comment', 'Created', 'Finalised', 'Locked'];
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      headers.join(','),
      ...rows.map((r) =>
        [r.stocktakeNumber, r.status, r.description, r.comment, formatDate(r.createdDatetime), formatDate(r.finalisedDatetime), r.isLocked ? 'Yes' : 'No']
          .map(escape)
          .join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stocktakes.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function rowHref(r: StocktakeHeader) {
    return `/${storeId}/inventory/stocktakes/${r.stocktakeNumber}`;
  }

  const SORT_COLS: { key: SortKey; label: string; align?: 'right' }[] = [
    { key: 'stocktakeNumber', label: 'No.', align: 'right' },
    { key: 'status', label: 'Status' },
    { key: 'description', label: 'Description' },
    { key: 'comment', label: 'Comment' },
    { key: 'createdDatetime', label: 'Created' },
    { key: 'finalisedDatetime', label: 'Finalised' },
  ];
</script>

<div class="page">
  <!-- App bar / toolbar -->
  <div class="toolbar">
    <h1>Stocktakes</h1>
    <div class="toolbar__filters">
      <button class="filter-add" bind:this={filterBtn} onclick={() => (filterMenuOpen = !filterMenuOpen)}>
        <Icon name="filter" size={16} /> Filters
      </button>
      {#if statusActive}
        <div class="filter-chip">
          <span class="filter-chip__label">Status</span>
          <Select
            value={status}
            compact
            options={[
              { value: 'NEW', label: 'New' },
              { value: 'FINALISED', label: 'Finalised' },
            ]}
            onchange={(v) => updateQuery((q) => (v ? q.set('status', v) : q.delete('status')), true)}
          />
          <button class="chip-x" aria-label="Remove status filter" onclick={removeStatusFilter}>
            <Icon name="close" size={14} />
          </button>
        </div>
      {/if}
    </div>
    <div class="spacer"></div>
    <Button icon="download" label="Export" compact onclick={exportCsv} />
    <Button variant="primary" icon="plus-circle" label="New stocktake" onclick={() => router.navigate(`/${storeId}/inventory/stocktakes/new`)} />
  </div>

  <Popover anchor={filterBtn} open={filterMenuOpen} onclose={() => (filterMenuOpen = false)} minWidth={200} label="Add filter">
    <ul class="filter-menu">
      {#if !statusActive}
        <li><button onclick={addStatusFilter}>Status</button></li>
      {:else}
        <li class="muted">All filters added</li>
      {/if}
      <li class="sep"></li>
      <li><button onclick={removeAllFilters}>Remove all filters</button></li>
    </ul>
  </Popover>

  <!-- Bulk-action bar or content -->
  {#if selected.size > 0}
    <div class="bulkbar" role="toolbar" aria-label="Selection actions">
      <button class="clear-sel" onclick={() => (selected = new Set())} aria-label="Clear selection">
        <Icon name="minus-circle" size={18} /> {selected.size} selected
      </button>
      <Button variant="destructive" icon="delete" label="Delete" onclick={() => (confirmDelete = true)} />
    </div>
  {/if}

  <!-- Content body -->
  <div class="body">
    <table class="grid">
      <thead>
        <tr>
          <th class="col-check">
            <input type="checkbox" checked={allSelected} onchange={toggleAll} aria-label="Select all" />
          </th>
          {#each SORT_COLS as col (col.key)}
            <th class:num={col.align === 'right'}>
              <button class="sort" onclick={() => setSort(col.key)}>
                {col.label}
                {#if sortKey === col.key}
                  <Icon name={sortDesc ? 'sort-desc' : 'sort-asc'} size={14} />
                {/if}
              </button>
            </th>
          {/each}
          <th class="col-lock">Locked</th>
        </tr>
      </thead>
      <tbody>
        {#if loading}
          <tr><td class="state" colspan="8"><span class="spinner"></span> Loading…</td></tr>
        {:else if error}
          <tr><td class="state error" colspan="8">
            {error}
            <button onclick={() => updateQuery((q) => q)}>Retry</button>
          </td></tr>
        {:else if rows.length === 0}
          <tr><td class="state" colspan="8">
            {#if statusActive}
              No stocktakes match the current filter.
              <button onclick={removeAllFilters}>Clear filters</button>
            {:else}
              No stocktakes yet.
            {/if}
          </td></tr>
        {:else}
          {#each rows as r (r.id)}
            <tr class:selected={selected.has(r.id)}>
              <td class="col-check">
                <input type="checkbox" checked={selected.has(r.id)} onchange={() => toggleRow(r.id)} aria-label="Select {r.stocktakeNumber}" />
              </td>
              <td class="num"><a href={rowHref(r)}>{r.stocktakeNumber}</a></td>
              <td><StatusBadge status={r.status} /></td>
              <td class="ellipsis"><a href={rowHref(r)}>{r.description ?? ''}</a></td>
              <td class="ellipsis">{r.comment ?? ''}</td>
              <td>{formatDate(r.createdDatetime)}</td>
              <td>{formatDate(r.finalisedDatetime)}</td>
              <td class="col-lock">{#if r.isLocked}<Icon name="clock" size={16} label="Locked" />{/if}</td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Action footer: pagination -->
  <div class="footer">
    <span class="count">{totalCount} stocktake{totalCount === 1 ? '' : 's'}</span>
    <div class="spacer"></div>
    {#if pageCount > 1}
      <div class="pager">
        <button disabled={page <= 1} onclick={() => goPage(page - 1)} aria-label="Previous page"><Icon name="arrow-left" size={16} /></button>
        <span class="tnum">Page {page} / {pageCount}</span>
        <button disabled={page >= pageCount} onclick={() => goPage(page + 1)} aria-label="Next page"><Icon name="arrow-right" size={16} /></button>
      </div>
    {/if}
  </div>
</div>

<ConfirmDialog
  open={confirmDelete}
  title="Delete stocktakes?"
  message="Delete {selected.size} selected stocktake(s)? This cannot be undone."
  confirmLabel="Delete"
  destructive
  busy={deleting}
  onconfirm={doDelete}
  oncancel={() => (confirmDelete = false)}
/>

<style>
  .page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-3) var(--sp-4);
    flex: none;
    flex-wrap: wrap;
  }
  .toolbar h1 {
    font-size: var(--type-heading-size);
  }
  .toolbar__filters {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }
  .spacer {
    flex: 1;
  }
  .filter-add {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 var(--sp-3);
    border: 1px solid var(--border-default);
    background: var(--surface-default);
    border-radius: var(--radius-control);
    cursor: pointer;
    color: var(--text-primary);
    font: inherit;
  }
  .filter-add:hover {
    background: var(--hover-overlay);
  }
  .filter-chip {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    background: var(--surface-default);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-control);
    padding: 2px var(--sp-2);
  }
  .filter-chip__label {
    font-size: var(--type-caption-size);
    color: var(--text-secondary);
  }
  .chip-x {
    border: 0;
    background: transparent;
    cursor: pointer;
    color: var(--text-secondary);
    display: inline-flex;
  }
  .filter-menu {
    list-style: none;
    margin: 0;
    padding: 0;
    min-width: 180px;
  }
  .filter-menu button {
    width: 100%;
    text-align: start;
    border: 0;
    background: transparent;
    padding: var(--sp-2) var(--sp-3);
    cursor: pointer;
    font: inherit;
    color: var(--text-primary);
    border-radius: var(--radius-sm);
  }
  .filter-menu button:hover {
    background: var(--hover-overlay);
  }
  .filter-menu .sep {
    height: 1px;
    background: var(--divider);
    margin: var(--sp-1) 0;
  }
  .filter-menu .muted {
    padding: var(--sp-2) var(--sp-3);
    color: var(--text-disabled);
    font-size: var(--type-caption-size);
  }

  .bulkbar {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-2) var(--sp-4);
    background: var(--selected);
    border-top: 1px solid var(--border-default);
    border-bottom: 1px solid var(--border-default);
    flex: none;
  }
  .clear-sel {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 0;
    background: transparent;
    cursor: pointer;
    font: inherit;
    font-weight: var(--type-emphasis-weight);
    color: var(--text-primary);
  }

  .body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 0 var(--sp-4);
  }
  .grid {
    width: 100%;
    border-collapse: collapse;
    background: var(--surface-default);
  }
  .grid thead th {
    position: sticky;
    top: 0;
    background: var(--surface-default);
    text-align: left;
    padding: var(--sp-2) var(--sp-3);
    border-bottom: 1px solid var(--border-strong);
    font-size: var(--type-caption-size);
    color: var(--text-secondary);
    z-index: 1;
  }
  .grid th.num,
  .grid td.num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .sort {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: 0;
    background: transparent;
    cursor: pointer;
    font: inherit;
    font-weight: var(--type-emphasis-weight);
    color: inherit;
  }
  .grid tbody td {
    padding: var(--sp-2) var(--sp-3);
    border-bottom: 1px solid var(--divider);
    height: 52px;
  }
  .grid tbody tr:hover {
    background: var(--hover-overlay);
  }
  .grid tbody tr.selected {
    background: var(--selected);
  }
  .grid tbody tr.selected:hover {
    background: var(--selected-hover);
  }
  .col-check {
    width: 44px;
    text-align: center;
  }
  .col-check input {
    width: 18px;
    height: 18px;
  }
  .col-lock {
    text-align: center;
    width: 80px;
  }
  .ellipsis {
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .state {
    text-align: center;
    padding: var(--sp-8);
    color: var(--text-secondary);
  }
  .state.error {
    color: var(--state-error);
  }
  .state button {
    margin-inline-start: var(--sp-2);
  }

  .footer {
    display: flex;
    align-items: center;
    padding: var(--sp-2) var(--sp-4);
    border-top: 1px solid var(--divider);
    flex: none;
    font-size: var(--type-caption-size);
    color: var(--text-secondary);
  }
  .pager {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
  }
  .pager button {
    display: inline-flex;
    border: 1px solid var(--border-default);
    background: var(--surface-default);
    border-radius: var(--radius-sm);
    cursor: pointer;
    padding: 6px;
    color: var(--text-primary);
  }
  .pager button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .spinner {
    display: inline-block;
    width: 18px;
    height: 18px;
    border: 2px solid var(--border-strong);
    border-top-color: var(--brand-primary);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    vertical-align: middle;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
