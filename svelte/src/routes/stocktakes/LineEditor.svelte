<script lang="ts">
  // S4 — Line editor (spec stocktakes/05-ui-surface.md#s4--line-editor, J3). The single
  // surface for entering line data: counted packs, batch, dates, location, pack size,
  // prices, reason, comment/note. Modal over S3, opened by selecting a line (edit) or
  // Add item (create). A reason is required when the count adjusts stock in a direction
  // that has active reasons (spec 03 › adjustment-reason rules).
  import Modal from '../../lib/components/Modal.svelte';
  import Button from '../../lib/components/Button.svelte';
  import Field from '../../lib/components/Field.svelte';
  import Select from '../../lib/components/Select.svelte';
  import TextInput from '../../lib/components/TextInput.svelte';
  import AsyncSelect from '../../lib/components/AsyncSelect.svelte';
  import Icon from '../../lib/components/Icon.svelte';
  import { auth } from '../../lib/state/auth.svelte';
  import { searchItems } from '../../lib/api/catalogue';
  import { uuid, type LineInsert, type LineUpdate } from '../../lib/api/stocktakes';
  import {
    NEGATIVE_REASON_TYPES,
    VACCINE_WASTAGE_TYPES,
    type ReasonOption,
    type StocktakeLine,
    type Location,
    type CatalogueItem,
  } from '../../lib/api/types';

  type Props = {
    open: boolean;
    // Editing an existing line, or null for a new item.
    line: StocktakeLine | null;
    stocktakeId: string;
    existingItemIds: string[]; // exclude from add-search
    reasons: ReasonOption[];
    locations: Location[];
    // per-line save error keyed to this line, if any
    lineError?: string | null;
    onclose: () => void;
    onsave: (ops: { insert?: LineInsert; update?: LineUpdate }) => Promise<boolean>;
    // navigation between existing lines
    onprev?: () => void;
    onnext?: () => void;
    hasPrev?: boolean;
    hasNext?: boolean;
  };
  let {
    open,
    line,
    stocktakeId,
    existingItemIds,
    reasons,
    locations,
    lineError = null,
    onclose,
    onsave,
    onprev,
    onnext,
    hasPrev = false,
    hasNext = false,
  }: Props = $props();

  let storeId = $derived(auth.activeStoreId!);
  let isEdit = $derived(line !== null);

  // Form state — reset whenever the target line changes.
  let pickedItem = $state<CatalogueItem | null>(null);
  let counted = $state('');
  let batch = $state('');
  let expiry = $state('');
  let packSize = $state('');
  let costPrice = $state('');
  let sellPrice = $state('');
  let locationId = $state<string | null>(null);
  let reasonId = $state<string | null>(null);
  let comment = $state('');
  let note = $state('');
  let saving = $state(false);

  // Re-seed the form when the modal opens or the line changes.
  let seedKey = $derived(open ? (line?.id ?? 'new') : 'closed');
  $effect(() => {
    seedKey; // dependency
    if (!open) return;
    pickedItem = null;
    counted = line?.countedNumberOfPacks != null ? String(line.countedNumberOfPacks) : '';
    batch = line?.batch ?? '';
    expiry = line?.expiryDate ?? '';
    packSize = line?.packSize != null ? String(line.packSize) : '';
    costPrice = line?.costPricePerPack != null ? String(line.costPricePerPack) : '';
    sellPrice = line?.sellPricePerPack != null ? String(line.sellPricePerPack) : '';
    locationId = line?.location?.id ?? null;
    reasonId = line?.reasonOption?.id ?? null;
    comment = line?.comment ?? '';
    note = line?.note ?? '';
  });

  let itemName = $derived(isEdit ? line!.itemName : (pickedItem?.name ?? ''));
  let unitName = $derived(isEdit ? line?.item?.unitName : pickedItem?.unitName);
  let isVaccine = $derived(isEdit ? !!line?.item?.isVaccine : !!pickedItem?.isVaccine);

  // Snapshot for direction/reason logic. New items have snapshot 0.
  let snapshot = $derived(line?.snapshotNumberOfPacks ?? 0);
  let countedNum = $derived(counted.trim() === '' ? null : Number(counted));
  let delta = $derived(countedNum == null ? 0 : countedNum - snapshot);

  // Reasons valid for the current adjustment direction.
  let validReasons = $derived.by(() => {
    if (delta > 0) return reasons.filter((r) => r.type === 'POSITIVE_INVENTORY_ADJUSTMENT');
    if (delta < 0) {
      const types = isVaccine ? NEGATIVE_REASON_TYPES : NEGATIVE_REASON_TYPES.filter((t) => !VACCINE_WASTAGE_TYPES.includes(t));
      return reasons.filter((r) => types.includes(r.type));
    }
    return [];
  });
  let reasonRequired = $derived(countedNum != null && delta !== 0 && validReasons.length > 0);
  let reasonMissing = $derived(reasonRequired && !reasonId);

  let canSave = $derived(
    (isEdit || pickedItem != null) && !reasonMissing && (counted.trim() === '' || !isNaN(Number(counted))),
  );

  async function save() {
    if (!canSave) return;
    saving = true;
    let ok: boolean;
    if (isEdit && line) {
      const update: LineUpdate = {
        id: line.id,
        countedNumberOfPacks: countedNum,
        batch: batch || null,
        expiryDate: expiry || null,
        packSize: packSize ? Number(packSize) : null,
        costPricePerPack: costPrice ? Number(costPrice) : null,
        sellPricePerPack: sellPrice ? Number(sellPrice) : null,
        location: locationId ?? '',
        reasonOptionId: reasonRequired ? reasonId : reasonId, // send chosen reason (or unchanged)
        comment: comment || null,
        note: note || null,
      };
      ok = await onsave({ update });
    } else if (pickedItem) {
      const insert: LineInsert = {
        id: uuid(),
        itemId: pickedItem.id,
        countedNumberOfPacks: countedNum,
        batch: batch || null,
        expiryDate: expiry || null,
        packSize: packSize ? Number(packSize) : pickedItem.defaultPackSize,
        costPricePerPack: costPrice ? Number(costPrice) : null,
        sellPricePerPack: sellPrice ? Number(sellPrice) : null,
        location: locationId,
        reasonOptionId: reasonRequired ? reasonId : null,
        comment: comment || null,
        note: note || null,
      };
      ok = await onsave({ insert });
    } else {
      ok = false;
    }
    saving = false;
    if (ok) onclose();
  }

  async function itemSearch(q: string) {
    const items = await searchItems(storeId, q, existingItemIds);
    return items.map((i) => ({ value: i.id, label: i.name, sublabel: i.code, item: i }));
  }
</script>

<Modal {open} title={isEdit ? `Edit line — ${itemName}` : 'Add item'} size="lg" {onclose}>
  <div class="editor">
    {#if lineError}
      <div class="banner error"><Icon name="circle-alert" size={18} /> {lineError}</div>
    {/if}

    <!-- Item selector -->
    {#if isEdit}
      <Field label="Item">
        <TextInput value={`${line?.item?.code ?? ''}  ${itemName}`.trim()} readonly />
      </Field>
    {:else}
      <Field label="Item" hint="Items already on the stocktake are excluded.">
        <AsyncSelect
          selectedLabel={pickedItem?.name}
          placeholder="Search the catalogue…"
          search={itemSearch}
          onselect={(o: any) => (pickedItem = o.item)}
        />
      </Field>
    {/if}

    {#if isEdit || pickedItem}
      <div class="grid2">
        <Field label="Counted packs" error={reasonMissing ? null : undefined}>
          <TextInput bind:value={counted} type="number" min={0} align="right" placeholder="Not counted" />
        </Field>
        <Field label={unitName ? `Pack size (${unitName})` : 'Pack size'}>
          <TextInput bind:value={packSize} type="number" min={0} align="right" />
        </Field>
        <Field label="Batch">
          <TextInput bind:value={batch} />
        </Field>
        <Field label="Expiry date">
          <TextInput bind:value={expiry} type="date" />
        </Field>
        <Field label="Location">
          <Select
            value={locationId}
            options={locations.map((l) => ({ value: l.id, label: `${l.code} — ${l.name}` }))}
            placeholder="No location"
            onchange={(v) => (locationId = v)}
          />
        </Field>
        <Field
          label="Reason"
          error={reasonMissing ? 'A reason is required for this adjustment.' : null}
        >
          <Select
            value={reasonId}
            required={reasonRequired}
            invalid={reasonMissing}
            disabled={validReasons.length === 0}
            options={validReasons.map((r) => ({ value: r.id, label: r.reason }))}
            placeholder={validReasons.length === 0 ? 'No reason needed' : 'Select a reason…'}
            onchange={(v) => (reasonId = v)}
          />
        </Field>
        <Field label="Cost price / pack">
          <TextInput bind:value={costPrice} type="number" min={0} align="right" />
        </Field>
        <Field label="Sell price / pack">
          <TextInput bind:value={sellPrice} type="number" min={0} align="right" />
        </Field>
      </div>

      <!-- Difference readout -->
      <div class="diff" aria-live="polite">
        Snapshot <strong class="tnum">{snapshot}</strong> · Counted
        <strong class="tnum">{countedNum ?? '—'}</strong> · Difference
        <strong class="tnum" class:pos={delta > 0} class:neg={delta < 0}>
          {countedNum == null ? '—' : delta > 0 ? `+${delta}` : delta < 0 ? `−${Math.abs(delta)}` : '0'}
        </strong>
      </div>

      <div class="grid2">
        <Field label="Comment"><TextInput bind:value={comment} /></Field>
        <Field label="Note (carried to stock)"><TextInput bind:value={note} /></Field>
      </div>
    {/if}
  </div>

  {#snippet footer()}
    {#if isEdit && (hasPrev || hasNext)}
      <div class="nav">
        <Button variant="ghost" icon="arrow-left" iconOnly label="Previous item" disabled={!hasPrev} onclick={() => onprev?.()} />
        <Button variant="ghost" icon="arrow-right" iconOnly label="Next item" disabled={!hasNext} onclick={() => onnext?.()} />
      </div>
    {/if}
    <div class="grow"></div>
    <Button variant="ghost" label="Cancel" onclick={onclose} />
    <Button variant="primary" icon="save" label="Save" busy={saving} disabled={!canSave} onclick={save} />
  {/snippet}
</Modal>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
  }
  .grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--sp-3);
  }
  @media (max-width: 560px) {
    .grid2 {
      grid-template-columns: 1fr;
    }
  }
  .banner {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
    border-radius: var(--radius-control);
  }
  .banner.error {
    background: var(--state-error-subtle);
    color: var(--state-error);
  }
  .diff {
    padding: var(--sp-2) var(--sp-3);
    background: var(--surface-sunken);
    border-radius: var(--radius-control);
    color: var(--text-secondary);
  }
  .diff .pos {
    color: var(--state-success);
  }
  .diff .neg {
    color: var(--state-error);
  }
  .nav {
    display: flex;
    gap: var(--sp-1);
  }
  .grow {
    flex: 1;
  }
</style>
