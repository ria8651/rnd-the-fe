<script lang="ts">
  // S2 — Create flow (spec stocktakes/05-ui-surface.md#s2--create-flow, J2).
  // Mode choice Full / Filtered / Blank (mutually exclusive; switching resets others);
  // an estimated line count for Full/Filtered; a "blank" notice for Blank. On confirm,
  // create and navigate to the new stocktake (S3).
  import Icon from '../../lib/components/Icon.svelte';
  import Button from '../../lib/components/Button.svelte';
  import Field from '../../lib/components/Field.svelte';
  import Select from '../../lib/components/Select.svelte';
  import TextInput from '../../lib/components/TextInput.svelte';
  import { auth } from '../../lib/state/auth.svelte';
  import { router } from '../../lib/router.svelte';
  import { toasts } from '../../lib/state/toast.svelte';
  import {
    buildInsertInput,
    insertStocktake,
    type CreateMode,
  } from '../../lib/api/stocktakes';
  import { estimateLineCount, getMasterLists, getLocations, type MasterList } from '../../lib/api/catalogue';
  import type { Location } from '../../lib/api/types';

  let storeId = $derived(auth.activeStoreId!);
  let mode = $state<'full' | 'filtered' | 'blank'>('full');

  // Full options
  let includeAllItems = $state(false);
  // Filtered options
  let masterListId = $state<string | null>(null);
  let locationId = $state<string | null>(null);
  let expiresBefore = $state('');
  let includeAllMasterListItems = $state(false);
  // Shared
  let description = $state('');

  let masterLists = $state<MasterList[]>([]);
  let locations = $state<Location[]>([]);
  $effect(() => {
    getMasterLists(storeId).then((m) => (masterLists = m)).catch(() => {});
    getLocations(storeId).then((l) => (locations = l)).catch(() => {});
  });

  // Estimate (debounced by the effect re-running on input change).
  let estimate = $state<number | null>(null);
  let estimating = $state(false);
  $effect(() => {
    if (mode === 'blank') {
      estimate = 0;
      return;
    }
    const opts = {
      full: mode === 'full',
      includeAllItems: mode === 'full' ? includeAllItems : false,
      masterListId: mode === 'filtered' ? masterListId : null,
      locationId: mode === 'filtered' ? locationId : null,
      expiresBefore: mode === 'filtered' && expiresBefore ? expiresBefore : null,
    };
    estimating = true;
    estimateLineCount(storeId, opts)
      .then((n) => (estimate = n))
      .catch(() => (estimate = null))
      .finally(() => (estimating = false));
  });

  function switchMode(m: typeof mode) {
    mode = m;
    // Switching mode resets the other inputs (spec S2).
    includeAllItems = false;
    masterListId = null;
    locationId = null;
    expiresBefore = '';
    includeAllMasterListItems = false;
  }

  let saving = $state(false);
  async function create() {
    let createMode: CreateMode;
    if (mode === 'blank') createMode = { kind: 'blank' };
    else if (mode === 'full') createMode = { kind: 'full', includeAllItems };
    else
      createMode = {
        kind: 'filtered',
        masterListId,
        locationId,
        expiresBefore: expiresBefore || null,
        includeAllMasterListItems,
      };
    const input = buildInsertInput(createMode, { description: description || null });
    saving = true;
    try {
      const res = await insertStocktake(storeId, input);
      toasts.success(`Created stocktake #${res.stocktakeNumber}.`);
      router.navigate(`/${storeId}/inventory/stocktakes/${res.stocktakeNumber}`);
    } catch (e: any) {
      toasts.error(`Could not create stocktake: ${e?.message ?? e}`);
      saving = false;
    }
  }

  const MODES = [
    { key: 'full', label: 'Full', icon: 'stock', desc: 'Count everything I hold.' },
    { key: 'filtered', label: 'Filtered', icon: 'filter', desc: 'Count a subset by list, location, VVM, or expiry.' },
    { key: 'blank', label: 'Blank', icon: 'file', desc: "I'll add lines myself." },
  ] as const;
</script>

<div class="page">
  <div class="toolbar">
    <button class="back" onclick={() => history.back()} aria-label="Back"><Icon name="arrow-left" size={20} /></button>
    <h1>New stocktake</h1>
  </div>

  <div class="body">
    <div class="card">
      <fieldset class="modes">
        <legend>How should lines be generated?</legend>
        {#each MODES as m (m.key)}
          <label class="mode" class:sel={mode === m.key}>
            <input type="radio" name="mode" checked={mode === m.key} onchange={() => switchMode(m.key)} />
            <Icon name={m.icon} size={24} />
            <span class="mode__text">
              <strong>{m.label}</strong>
              <span class="muted">{m.desc}</span>
            </span>
          </label>
        {/each}
      </fieldset>

      {#if mode === 'full'}
        <label class="check">
          <input type="checkbox" bind:checked={includeAllItems} />
          Include items with no stock on hand
        </label>
      {/if}

      {#if mode === 'filtered'}
        <div class="filters">
          <Field label="Master list">
            <Select
              value={masterListId}
              options={masterLists.map((m) => ({ value: m.id, label: `${m.name} (${m.linesCount})` }))}
              placeholder="Any master list"
              onchange={(v) => (masterListId = v)}
            />
          </Field>
          <Field label="Location">
            <Select
              value={locationId}
              options={locations.map((l) => ({ value: l.id, label: `${l.code} — ${l.name}` }))}
              placeholder="Any location"
              onchange={(v) => (locationId = v)}
            />
          </Field>
          <Field label="Expires before">
            <TextInput bind:value={expiresBefore} type="date" />
          </Field>
          {#if masterListId}
            <label class="check">
              <input type="checkbox" bind:checked={includeAllMasterListItems} />
              Include all master-list items (incl. zero stock)
            </label>
          {/if}
        </div>
      {/if}

      <Field label="Description (optional)">
        <TextInput bind:value={description} placeholder="e.g. Monthly count — July" />
      </Field>

      <div class="estimate" aria-live="polite">
        {#if mode === 'blank'}
          <Icon name="info-outline" size={18} />
          A blank stocktake will be created with no lines — add items yourself.
        {:else if estimating}
          <span class="spinner"></span> Estimating lines…
        {:else if estimate != null}
          <Icon name="info-outline" size={18} />
          This will generate approximately <strong>{estimate}</strong> line{estimate === 1 ? '' : 's'}.
        {:else}
          <Icon name="alert" size={18} /> Could not estimate line count.
        {/if}
      </div>
    </div>
  </div>

  <div class="footer">
    <Button variant="ghost" label="Cancel" onclick={() => history.back()} />
    <Button variant="primary" icon="check" label="Create stocktake" busy={saving} onclick={create} />
  </div>
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-3) var(--sp-4);
    flex: none;
  }
  .toolbar h1 {
    font-size: var(--type-heading-size);
  }
  .back {
    border: 0;
    background: transparent;
    cursor: pointer;
    color: var(--text-secondary);
    display: inline-flex;
    padding: var(--sp-1);
    border-radius: var(--radius-sm);
  }
  .back:hover {
    background: var(--hover-overlay);
  }
  .body {
    flex: 1;
    overflow: auto;
    padding: var(--sp-4);
    display: flex;
    justify-content: center;
  }
  .card {
    width: 100%;
    max-width: 560px;
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    background: var(--surface-default);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-control);
    padding: var(--sp-6);
    height: fit-content;
  }
  .modes {
    border: 0;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }
  .modes legend {
    font-size: var(--type-caption-size);
    color: var(--text-secondary);
    margin-bottom: var(--sp-2);
  }
  .mode {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-3);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-control);
    cursor: pointer;
  }
  .mode.sel {
    border-color: var(--brand-primary);
    background: var(--brand-primary-subtle);
  }
  .mode__text {
    display: flex;
    flex-direction: column;
  }
  .muted {
    color: var(--text-secondary);
    font-size: var(--type-caption-size);
  }
  .filters {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }
  .check {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    cursor: pointer;
  }
  .estimate {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-3);
    background: var(--surface-sunken);
    border-radius: var(--radius-control);
    color: var(--text-secondary);
  }
  .footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--sp-2);
    padding: var(--sp-3) var(--sp-4);
    border-top: 1px solid var(--divider);
    flex: none;
  }
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--border-strong);
    border-top-color: var(--brand-primary);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
