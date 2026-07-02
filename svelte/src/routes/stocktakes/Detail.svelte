<script lang="ts">
  // S3 — Stocktake detail (spec stocktakes/05-ui-surface.md#s3--detail-screen).
  // App bar: description (in-place) + item filter + add-item + print. Content body: the
  // READ-ONLY line table (row-click opens the editor S4). Action footer: lock toggle ·
  // status crumbs · finalise split button (or bulk-action bar when lines are selected).
  // Side panel: attribution + comment (in-place) + delete/copy. Every editable field is
  // gated by the single editability rule (NEW && !locked).
  import { untrack } from 'svelte';
  import Icon from '../../lib/components/Icon.svelte';
  import Button from '../../lib/components/Button.svelte';
  import Field from '../../lib/components/Field.svelte';
  import Select from '../../lib/components/Select.svelte';
  import TextInput from '../../lib/components/TextInput.svelte';
  import StatusCrumbs from '../../lib/components/StatusCrumbs.svelte';
  import SplitButton from '../../lib/components/SplitButton.svelte';
  import ConfirmDialog from '../../lib/components/ConfirmDialog.svelte';
  import LineEditor from './LineEditor.svelte';
  import { auth } from '../../lib/state/auth.svelte';
  import { viewport } from '../../lib/state/viewport.svelte';
  import { router } from '../../lib/router.svelte';
  import { toasts } from '../../lib/state/toast.svelte';
  import {
    getStocktakeByNumber,
    updateStocktakeHeader,
    finaliseStocktake,
    batchLines,
    deleteStocktakes,
    type LineInsert,
    type LineUpdate,
  } from '../../lib/api/stocktakes';
  import { getActiveReasons, getLocations } from '../../lib/api/catalogue';
  import {
    NEGATIVE_REASON_TYPES,
    VACCINE_WASTAGE_TYPES,
    type ReasonOption,
    type Location,
    type Stocktake,
    type StocktakeLine,
  } from '../../lib/api/types';
  import { formatDate, formatDateTime, formatNumber, formatSigned } from '../../lib/util/format';
  import { createAutosaver, registerFlush } from '../../lib/util/autosave';

  type Props = { number: number };
  let { number: stNumber }: Props = $props();

  let storeId = $derived(auth.activeStoreId!);

  let st = $state<Stocktake | null>(null);
  let loading = $state(true);
  let loadError = $state<string | null>(null);
  let reasons = $state<ReasonOption[]>([]);
  let locations = $state<Location[]>([]);

  // whole-stocktake banner (locked / cannot-edit / finalise banner errors)
  let banner = $state<string | null>(null);
  // per-line finalise errors, keyed by stocktake-line id
  let lineErrors = $state<Map<string, string>>(new Map());

  async function reload() {
    loading = true;
    loadError = null;
    try {
      st = await getStocktakeByNumber(storeId, stNumber);
      if (!st) loadError = `Stocktake #${stNumber} not found.`;
    } catch (e: any) {
      loadError = String(e?.message ?? e);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    stNumber;
    storeId;
    untrack(reload);
  });
  $effect(() => {
    getActiveReasons().then((r) => (reasons = r)).catch(() => {});
    getLocations(storeId).then((l) => (locations = l)).catch(() => {});
  });

  let editable = $derived(!!st && st.status === 'NEW' && !st.isLocked);
  let sidePanelOpen = $state(true);

  // Responsive column hiding by EFFECTIVE table width (viewport minus sidebar and the
  // side panel when open). Keeps the P1 core columns (code/item/snapshot/counted/
  // difference) visible; batch/location (P3) drop first, then expiry/pack size (P2).
  // Spec ui-standards/tables.md#column-priority.
  let effectiveWidth = $derived(
    viewport.width - (viewport.isCompact ? 72 : 240) - (sidePanelOpen ? 300 : 0),
  );
  let hideP3 = $derived(effectiveWidth < 1100);
  let hideP2 = $derived(effectiveWidth < 860);
  let hasReductionReasons = $derived(reasons.some((r) => NEGATIVE_REASON_TYPES.includes(r.type)));

  // ---- In-place header autosave (spec inputs.md, D1/AC-E6/E7) ---------------
  // Local editable copies; queue debounced writes; flush on blur/teardown.
  let fDescription = $state('');
  let fComment = $state('');
  let fCountedBy = $state('');
  let fVerifiedBy = $state('');

  $effect(() => {
    // seed local fields when the record loads/changes
    if (st) {
      fDescription = st.description ?? '';
      fComment = st.comment ?? '';
      fCountedBy = st.countedBy ?? '';
      fVerifiedBy = st.verifiedBy ?? '';
    }
  });

  function makeSaver(field: 'description' | 'comment' | 'countedBy' | 'verifiedBy') {
    const saver = createAutosaver<string>(async (value) => {
      if (!st) return;
      const res = await updateStocktakeHeader(storeId, st.id, { [field]: value });
      if (res.ok) {
        // re-sync canonical value
        if (st) (st as any)[field] = value;
      } else {
        banner = res.description;
        // rollback local field to last saved
        if (st) {
          const prev = (st as any)[field] ?? '';
          if (field === 'description') fDescription = prev;
          if (field === 'comment') fComment = prev;
          if (field === 'countedBy') fCountedBy = prev;
          if (field === 'verifiedBy') fVerifiedBy = prev;
        }
        toasts.error(`Could not save ${field}: ${res.description}`);
      }
    });
    return saver;
  }
  const savers = {
    description: makeSaver('description'),
    comment: makeSaver('comment'),
    countedBy: makeSaver('countedBy'),
    verifiedBy: makeSaver('verifiedBy'),
  };
  $effect(() => {
    // ensure any pending writes are flushed on hard unload / teardown
    const unregs = Object.values(savers).map((s) => registerFlush(s.flush));
    return () => {
      Object.values(savers).forEach((s) => s.flush());
      unregs.forEach((u) => u());
    };
  });

  // ---- Line table -----------------------------------------------------------
  let itemFilter = $state('');
  let visibleLines = $derived.by(() => {
    if (!st) return [];
    const q = itemFilter.trim().toLowerCase();
    if (!q) return st.lines;
    return st.lines.filter(
      (l) => l.itemName.toLowerCase().includes(q) || (l.item?.code ?? '').toLowerCase().includes(q),
    );
  });

  let selectedLines = $state<Set<string>>(new Set());
  let allLinesSelected = $derived(visibleLines.length > 0 && visibleLines.every((l) => selectedLines.has(l.id)));
  function toggleLine(id: string) {
    const n = new Set(selectedLines);
    n.has(id) ? n.delete(id) : n.add(id);
    selectedLines = n;
  }
  function toggleAllLines() {
    selectedLines = allLinesSelected ? new Set() : new Set(visibleLines.map((l) => l.id));
  }

  function diff(l: StocktakeLine): number | null {
    if (l.countedNumberOfPacks == null) return null;
    return l.countedNumberOfPacks - l.snapshotNumberOfPacks;
  }

  // ---- Line editor ----------------------------------------------------------
  let editorOpen = $state(false);
  let editorLine = $state<StocktakeLine | null>(null);
  let editorIndex = $state(-1);

  function openAdd() {
    editorLine = null;
    editorIndex = -1;
    editorOpen = true;
  }
  function openEdit(l: StocktakeLine) {
    editorLine = l;
    editorIndex = st!.lines.findIndex((x) => x.id === l.id);
    editorOpen = true;
  }
  function navEditor(delta: number) {
    if (!st) return;
    const i = editorIndex + delta;
    if (i >= 0 && i < st.lines.length) {
      editorIndex = i;
      editorLine = st.lines[i];
    }
  }

  async function saveLine(ops: { insert?: LineInsert; update?: LineUpdate }): Promise<boolean> {
    if (!st) return false;
    const { errors } = await batchLines(storeId, st.id, {
      inserts: ops.insert ? [ops.insert] : undefined,
      updates: ops.update ? [ops.update] : undefined,
    });
    if (errors.length) {
      toasts.error(errors[0].description);
      return false;
    }
    await reload();
    return true;
  }

  // ---- Bulk line actions ----------------------------------------------------
  let reduceOpen = $state(false);
  let reduceReasonId = $state<string | null>(null);
  let relocateOpen = $state(false);
  let relocateLocationId = $state<string | null>(null);
  let deleteLinesOpen = $state(false);
  let bulkBusy = $state(false);

  // Vaccine-only selection unlocks vaccine-wastage reasons.
  let selectionAllVaccine = $derived.by(() => {
    if (!st || selectedLines.size === 0) return false;
    return [...selectedLines].every((id) => st!.lines.find((l) => l.id === id)?.item?.isVaccine);
  });
  let reduceReasons = $derived.by(() => {
    const types = selectionAllVaccine
      ? NEGATIVE_REASON_TYPES
      : NEGATIVE_REASON_TYPES.filter((t) => !VACCINE_WASTAGE_TYPES.includes(t));
    return reasons.filter((r) => types.includes(r.type));
  });
  let reduceReasonRequired = $derived(reduceReasons.length > 0);

  async function doReduceToZero() {
    if (!st || (reduceReasonRequired && !reduceReasonId)) return;
    bulkBusy = true;
    const updates: LineUpdate[] = [...selectedLines].map((id) => ({
      id,
      countedNumberOfPacks: 0,
      reasonOptionId: reduceReasonRequired ? reduceReasonId : undefined,
    }));
    const { errors } = await batchLines(storeId, st.id, { updates });
    bulkBusy = false;
    reduceOpen = false;
    reduceReasonId = null;
    if (errors.length) toasts.error(errors[0].description);
    else toasts.success(`Reduced ${updates.length} line(s) to zero.`);
    selectedLines = new Set();
    await reload();
  }

  async function doRelocate() {
    if (!st) return;
    bulkBusy = true;
    const updates: LineUpdate[] = [...selectedLines].map((id) => ({ id, location: relocateLocationId || '' }));
    const { errors } = await batchLines(storeId, st.id, { updates });
    bulkBusy = false;
    relocateOpen = false;
    if (errors.length) toasts.error(errors[0].description);
    else toasts.success(`Moved ${updates.length} line(s).`);
    selectedLines = new Set();
    await reload();
  }

  async function doDeleteLines() {
    if (!st) return;
    bulkBusy = true;
    const { errors } = await batchLines(storeId, st.id, { deletes: [...selectedLines] });
    bulkBusy = false;
    deleteLinesOpen = false;
    if (errors.length) toasts.error(errors[0].description);
    else toasts.success(`Deleted ${selectedLines.size} line(s).`);
    selectedLines = new Set();
    await reload();
  }

  // ---- Lock toggle ----------------------------------------------------------
  async function toggleLock() {
    if (!st) return;
    const res = await updateStocktakeHeader(storeId, st.id, { isLocked: !st.isLocked });
    if (res.ok) {
      banner = null;
      await reload();
    } else toasts.error(res.description);
  }

  // ---- Finalise -------------------------------------------------------------
  let finaliseConfirm = $state(false);
  let finalising = $state(false);
  let countedCount = $derived(st?.lines.filter((l) => l.countedNumberOfPacks != null).length ?? 0);

  function requestFinalise() {
    if (!st) return;
    if (countedCount === 0) {
      toasts.push('There are no counted lines to finalise.', 'warning');
      return;
    }
    finaliseConfirm = true;
  }

  async function doFinalise() {
    if (!st) return;
    finalising = true;
    lineErrors = new Map();
    banner = null;
    const res = await finaliseStocktake(storeId, st.id);
    finalising = false;
    finaliseConfirm = false;
    if (res.ok) {
      toasts.success('Stocktake finalised.');
      await reload();
      return;
    }
    if (res.kind === 'banner') {
      banner = res.description;
      toasts.error(res.description);
      return;
    }
    // per-line: map stockLine ids back to stocktake-line ids
    const map = new Map<string, string>();
    for (const l of st.lines) {
      if (res.stockLineIds.includes(l.stockLine?.id ?? '')) map.set(l.id, res.description);
      if (res.stocktakeLineIds.includes(l.id)) map.set(l.id, res.description);
    }
    lineErrors = map;
    banner = res.description;
    toasts.error(res.description);
  }

  // ---- Side panel + record actions ------------------------------------------
  let deleteStOpen = $state(false);

  async function deleteStocktake() {
    if (!st) return;
    const { errors } = await deleteStocktakes(storeId, [st.id]);
    deleteStOpen = false;
    if (errors.length) toasts.error(errors[0].description);
    else {
      toasts.success('Stocktake deleted.');
      router.navigate(`/${storeId}/inventory/stocktakes`);
    }
  }

  function copyToClipboard() {
    if (!st) return;
    const text = [
      `Stocktake #${st.stocktakeNumber}`,
      `Status: ${st.status}`,
      `Description: ${st.description ?? ''}`,
      `Created: ${formatDateTime(st.createdDatetime)}`,
      `Lines: ${st.linesTotalCount}`,
    ].join('\n');
    navigator.clipboard?.writeText(text);
    toasts.success('Copied to clipboard.');
  }

  // status crumbs data
  let crumbs = $derived([
    { key: 'NEW', label: 'New', reachedAt: st?.createdDatetime },
    { key: 'FINALISED', label: 'Finalised', reachedAt: st?.finalisedDatetime },
  ]);
</script>

{#if loading}
  <div class="state"><span class="spinner"></span> Loading…</div>
{:else if loadError}
  <div class="state error">{loadError}<button onclick={reload}>Retry</button></div>
{:else if st}
  <div class="page">
    <!-- App bar -->
    <div class="appbar">
      <button class="back" aria-label="Back to list" onclick={() => router.navigate(`/${storeId}/inventory/stocktakes`)}>
        <Icon name="arrow-left" size={20} />
      </button>
      <div class="appbar__title">
        <span class="num">#{st.stocktakeNumber}</span>
        <input
          class="desc"
          placeholder="Description"
          value={fDescription}
          readonly={!editable}
          aria-label="Description"
          oninput={(e) => { fDescription = e.currentTarget.value; savers.description.queue(fDescription); }}
          onblur={() => savers.description.flush()}
        />
      </div>
      <div class="spacer"></div>
      <div class="item-filter">
        <Icon name="search" size={16} />
        <input placeholder="Filter items…" bind:value={itemFilter} aria-label="Filter lines by item" />
      </div>
      <Button icon="plus-circle" label="Add item" compact disabled={!editable} onclick={openAdd} />
      <Button icon="printer" iconOnly label="Print report" compact onclick={() => toasts.push('Report generation is not part of this build.', 'info')} />
      <Button icon="info" iconOnly label="Toggle details" compact onclick={() => (sidePanelOpen = !sidePanelOpen)} />
    </div>

    {#if banner}
      <div class="banner" role="alert">
        <Icon name="circle-alert" size={18} />
        <span>{banner}</span>
        <button class="banner__x" aria-label="Dismiss" onclick={() => (banner = null)}><Icon name="close" size={14} /></button>
      </div>
    {/if}

    {#if st.status === 'FINALISED'}
      <div class="banner info"><Icon name="info-outline" size={18} /> This stocktake is finalised and read-only.</div>
    {:else if st.isLocked}
      <div class="banner info"><Icon name="clock" size={18} /> This stocktake is locked. Unlock it to edit.</div>
    {/if}

    <div class="main">
      <!-- Content body: line table -->
      <div class="body">
        <table class="grid" class:hide-p2={hideP2} class:hide-p3={hideP3}>
          <thead>
            <tr>
              <th class="col-check">
                <input type="checkbox" checked={allLinesSelected} onchange={toggleAllLines} aria-label="Select all lines" disabled={!editable} />
              </th>
              <th>Code</th>
              <th>Item</th>
              <th class="p3">Batch</th>
              <th class="p2">Expiry</th>
              <th class="p3">Location</th>
              <th class="p2">Pack size</th>
              <th class="num">Snapshot</th>
              <th class="num">Counted</th>
              <th class="num">Difference</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {#if visibleLines.length === 0}
              <tr><td class="state" colspan="11">
                {#if st.lines.length === 0}No lines yet. {#if editable}Use “Add item” to start counting.{/if}
                {:else}No lines match “{itemFilter}”.{/if}
              </td></tr>
            {:else}
              {#each visibleLines as l (l.id)}
                {@const d = diff(l)}
                {@const err = lineErrors.get(l.id)}
                <tr class:selected={selectedLines.has(l.id)} class:has-error={!!err}>
                  <td class="col-check">
                    <input type="checkbox" checked={selectedLines.has(l.id)} onchange={() => toggleLine(l.id)} aria-label="Select line" disabled={!editable} />
                  </td>
                  <td class="code">
                    {#if err}<Icon name="circle-alert" size={14} label="Line error" />{/if}
                    <button class="rowlink" onclick={() => openEdit(l)}>{l.item?.code ?? ''}</button>
                  </td>
                  <td class="ellipsis"><button class="rowlink" onclick={() => openEdit(l)}>{l.itemName}</button></td>
                  <td class="p3">{l.batch ?? ''}</td>
                  <td class="p2">{formatDate(l.expiryDate)}</td>
                  <td class="p3">{l.location?.code ?? ''}</td>
                  <td class="p2 num">{formatNumber(l.packSize)}</td>
                  <td class="num" class:cell-error={!!err}>{formatNumber(l.snapshotNumberOfPacks)}</td>
                  <td class="num" class:cell-error={!!err}>{l.countedNumberOfPacks == null ? '—' : formatNumber(l.countedNumberOfPacks)}</td>
                  <td class="num">{d == null ? '—' : formatSigned(d)}</td>
                  <td class="ellipsis">{l.reasonOption?.reason ?? ''}</td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>

      <!-- Side panel -->
      {#if sidePanelOpen}
        <aside class="side">
          <h3>Details</h3>
          <dl class="ro">
            <dt>Number</dt><dd>#{st.stocktakeNumber}</dd>
            <dt>Status</dt><dd>{st.status === 'NEW' ? 'New' : 'Finalised'}</dd>
            <dt>Entered by</dt><dd>{st.user?.username ?? '—'}{#if st.user?.email} <span class="muted">({st.user.email})</span>{/if}</dd>
            <dt>Created</dt><dd>{formatDateTime(st.createdDatetime)}</dd>
            {#if st.finalisedDatetime}<dt>Finalised</dt><dd>{formatDateTime(st.finalisedDatetime)}</dd>{/if}
          </dl>

          <Field label="Counted by">
            <TextInput value={fCountedBy} readonly={!editable}
              oninput={(v) => { fCountedBy = v; savers.countedBy.queue(v); }}
              onblur={() => savers.countedBy.flush()} />
          </Field>
          <Field label="Verified by">
            <TextInput value={fVerifiedBy} readonly={!editable}
              oninput={(v) => { fVerifiedBy = v; savers.verifiedBy.queue(v); }}
              onblur={() => savers.verifiedBy.flush()} />
          </Field>
          <Field label="Comment">
            <TextInput value={fComment} multiline readonly={!editable}
              oninput={(v) => { fComment = v; savers.comment.queue(v); }}
              onblur={() => savers.comment.flush()} />
          </Field>

          <div class="side__actions">
            <Button variant="ghost" icon="copy" label="Copy" compact onclick={copyToClipboard} />
            {#if editable}
              <Button variant="destructive" icon="delete" label="Delete" compact onclick={() => (deleteStOpen = true)} />
            {/if}
          </div>
        </aside>
      {/if}
    </div>

    <!-- Action footer -->
    <div class="footer">
      {#if selectedLines.size > 0 && editable}
        <div class="bulk">
          <button class="clear-sel" onclick={() => (selectedLines = new Set())} aria-label="Clear selection">
            <Icon name="minus-circle" size={18} /> {selectedLines.size} selected
          </button>
          <Button icon="rewind" label="Reduce to zero" compact onclick={() => { reduceReasonId = null; reduceOpen = true; }} />
          <Button icon="arrow-right" label="Change location" compact onclick={() => { relocateLocationId = null; relocateOpen = true; }} />
          <Button variant="destructive" icon="delete" label="Delete" compact onclick={() => (deleteLinesOpen = true)} />
        </div>
      {:else}
        <div class="lock">
          <button class="lock-toggle" class:on={st.isLocked} onclick={toggleLock} disabled={st.status === 'FINALISED'} aria-pressed={st.isLocked}>
            <Icon name={st.isLocked ? 'clock' : 'circle'} size={16} /> On hold
          </button>
        </div>
        <StatusCrumbs {crumbs} currentKey={st.status} />
        <div class="spacer"></div>
        {#if editable}
          <SplitButton
            options={[
              { value: 'NEW', label: 'New', disabled: true },
              { value: 'FINALISED', label: 'Save and confirm' },
            ]}
            selected="FINALISED"
            icon="arrow-right"
            onprimary={requestFinalise}
            onselect={() => {}}
          />
        {/if}
      {/if}
    </div>
  </div>

  <!-- Line editor -->
  <LineEditor
    open={editorOpen}
    line={editorLine}
    stocktakeId={st.id}
    existingItemIds={st.lines.map((l) => l.itemId)}
    {reasons}
    {locations}
    lineError={editorLine ? lineErrors.get(editorLine.id) ?? null : null}
    onclose={() => (editorOpen = false)}
    onsave={saveLine}
    onprev={() => navEditor(-1)}
    onnext={() => navEditor(1)}
    hasPrev={editorIndex > 0}
    hasNext={editorIndex >= 0 && editorIndex < st.lines.length - 1}
  />

  <!-- Reduce to zero (reason gate) -->
  <ConfirmDialog
    open={reduceOpen}
    title="Reduce to zero?"
    message="Set counted packs to 0 for {selectedLines.size} selected line(s)."
    confirmLabel="Reduce to zero"
    confirmDisabled={reduceReasonRequired && !reduceReasonId}
    busy={bulkBusy}
    onconfirm={doReduceToZero}
    oncancel={() => (reduceOpen = false)}
  >
    {#if reduceReasonRequired}
      <Field label="Reason" hint="Applied to every selected line.">
        <Select
          value={reduceReasonId}
          required
          options={reduceReasons.map((r) => ({ value: r.id, label: r.reason }))}
          placeholder="Select a reason…"
          onchange={(v) => (reduceReasonId = v)}
        />
      </Field>
    {/if}
  </ConfirmDialog>

  <!-- Change location -->
  <ConfirmDialog
    open={relocateOpen}
    title="Change location"
    message="Move {selectedLines.size} selected line(s) to:"
    confirmLabel="Move"
    busy={bulkBusy}
    onconfirm={doRelocate}
    oncancel={() => (relocateOpen = false)}
  >
    <Field label="Location">
      <Select
        value={relocateLocationId}
        options={locations.map((l) => ({ value: l.id, label: `${l.code} — ${l.name}` }))}
        placeholder="No location"
        onchange={(v) => (relocateLocationId = v)}
      />
    </Field>
  </ConfirmDialog>

  <!-- Delete lines -->
  <ConfirmDialog
    open={deleteLinesOpen}
    title="Delete lines?"
    message="Delete {selectedLines.size} selected line(s)?"
    confirmLabel="Delete"
    destructive
    busy={bulkBusy}
    onconfirm={doDeleteLines}
    oncancel={() => (deleteLinesOpen = false)}
  />

  <!-- Finalise -->
  <ConfirmDialog
    open={finaliseConfirm}
    title="Save and confirm?"
    message="Finalising applies all counted differences to stock as inventory adjustments. Uncounted lines are removed. This cannot be undone."
    confirmLabel="Finalise"
    busy={finalising}
    onconfirm={doFinalise}
    oncancel={() => (finaliseConfirm = false)}
  />

  <!-- Delete stocktake -->
  <ConfirmDialog
    open={deleteStOpen}
    title="Delete stocktake?"
    message="Delete stocktake #{st.stocktakeNumber}? This cannot be undone."
    confirmLabel="Delete"
    destructive
    onconfirm={deleteStocktake}
    oncancel={() => (deleteStOpen = false)}
  />
{/if}

<style>
  .page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  .appbar {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-4);
    border-bottom: 1px solid var(--divider);
    flex: none;
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
  .appbar__title {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    min-width: 0;
    flex: 1;
    max-width: 480px;
  }
  .num {
    color: var(--text-secondary);
    font-weight: var(--type-emphasis-weight);
  }
  .desc {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    font-size: var(--type-heading-size);
    font-weight: var(--type-heading-weight);
    color: var(--text-primary);
    padding: var(--sp-1) var(--sp-2);
    border-radius: var(--radius-sm);
  }
  .desc:hover:not(:read-only) {
    background: var(--surface-sunken);
  }
  .desc:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--focus-ring);
  }
  .spacer {
    flex: 1;
  }
  .item-filter {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 var(--sp-2);
    height: 32px;
    background: var(--surface-sunken);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-control);
    color: var(--text-secondary);
  }
  .item-filter input {
    border: 0;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    width: 140px;
  }
  .item-filter input:focus-visible {
    outline: none;
  }

  .banner {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-4);
    background: var(--state-error-subtle);
    color: var(--state-error);
    flex: none;
  }
  .banner.info {
    background: var(--state-info-subtle);
    color: var(--state-info);
  }
  .banner__x {
    margin-inline-start: auto;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    display: inline-flex;
  }

  .main {
    flex: 1;
    min-height: 0;
    display: flex;
    overflow: hidden;
  }
  .body {
    flex: 1;
    min-width: 0;
    overflow: auto;
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
    white-space: nowrap;
  }
  .grid th.num,
  .grid td.num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .grid tbody td {
    padding: var(--sp-1) var(--sp-3);
    border-bottom: 1px solid var(--divider);
    height: 52px;
  }
  .grid tbody tr:hover {
    background: var(--hover-overlay);
  }
  .grid tbody tr.selected {
    background: var(--selected);
  }
  .grid tbody tr.has-error {
    background: var(--state-error-subtle);
  }
  /* Column priority: P3 (batch/location) drop first, then P2 (expiry/pack size).
     Core columns (code/item/snapshot/counted/difference/reason) always stay. */
  .grid.hide-p3 :global(.p3) {
    display: none;
  }
  .grid.hide-p2 :global(.p2) {
    display: none;
  }
  .cell-error {
    color: var(--state-error);
    font-weight: var(--type-emphasis-weight);
  }
  .code {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--state-error);
  }
  .rowlink {
    border: 0;
    background: transparent;
    color: var(--text-link);
    cursor: pointer;
    font: inherit;
    padding: 0;
    text-align: start;
  }
  .rowlink:hover {
    text-decoration: underline;
  }
  .col-check {
    width: 44px;
    text-align: center;
  }
  .col-check input {
    width: 18px;
    height: 18px;
  }
  .ellipsis {
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .side {
    width: 300px;
    flex: none;
    border-inline-start: 1px solid var(--divider);
    background: var(--surface-base);
    padding: var(--sp-4);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }
  .side h3 {
    font-size: var(--type-heading-size);
    margin: 0;
  }
  .ro {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--sp-1) var(--sp-3);
    margin: 0;
    font-size: var(--type-caption-size);
  }
  .ro dt {
    color: var(--text-secondary);
  }
  .ro dd {
    margin: 0;
  }
  .muted {
    color: var(--text-disabled);
  }
  .side__actions {
    display: flex;
    gap: var(--sp-2);
    margin-top: auto;
    padding-top: var(--sp-3);
    border-top: 1px solid var(--divider);
  }

  .footer {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-2) var(--sp-4);
    border-top: 1px solid var(--divider);
    background: var(--surface-base);
    flex: none;
    min-height: 52px;
  }
  .bulk {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    flex-wrap: wrap;
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
  .lock-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 var(--sp-3);
    border: 1px solid var(--border-default);
    background: var(--surface-default);
    border-radius: var(--radius-button);
    cursor: pointer;
    color: var(--text-primary);
    font: inherit;
  }
  .lock-toggle.on {
    background: var(--state-warning-subtle);
    border-color: var(--state-warning);
    color: var(--state-warning);
  }
  .lock-toggle:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .state {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    padding: var(--sp-8);
    color: var(--text-secondary);
    height: 100%;
  }
  .state.error {
    color: var(--state-error);
  }
  .state button {
    margin-inline-start: var(--sp-2);
  }
  .spinner {
    width: 20px;
    height: 20px;
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
