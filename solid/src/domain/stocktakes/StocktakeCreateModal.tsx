import { createSignal, createResource, createMemo, Show, For, type JSX } from 'solid-js';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Select } from '../../ui/Select';
import { TextInput, TextArea, DateInput } from '../../ui/inputs';
import { Checkbox } from '../../ui/Checkbox';
import { insertStocktake } from './api';
import { estimateLineCount, fetchMasterLists, fetchLocations, fetchVvmStatuses } from './reference';
import type { CreateMode, CreateStocktakeParams } from './types';
import { uuid } from '../../lib/uuid';
import { toIsoDate } from '../../lib/format';
import { toast } from '../../state/toast';

/*
 * S2 — Create flow (J2). Full / Filtered / Blank (mutually exclusive); switching mode
 * resets other inputs. Shows an estimated line count for Full/Filtered and a blank
 * notice for Blank. On confirm, creates a NEW stocktake and hands the number back to
 * navigate to its detail (S3).
 */

const MODES: { value: CreateMode; label: string }[] = [
  { value: 'full', label: 'Full' },
  { value: 'filtered', label: 'Filtered' },
  { value: 'blank', label: 'Blank' },
];

export interface CreateStocktakeModalProps {
  open: boolean;
  storeId: string;
  onClose: () => void;
  onCreated: (stocktakeNumber: number) => void;
}

export function CreateStocktakeModal(props: CreateStocktakeModalProps): JSX.Element {
  const [mode, setMode] = createSignal<CreateMode>('full');
  const [description, setDescription] = createSignal('');
  const [comment, setComment] = createSignal('');
  const [isInitial, setIsInitial] = createSignal(false);
  // Full
  const [allItems, setAllItems] = createSignal(false);
  // Filtered
  const [masterListId, setMasterListId] = createSignal<string | null>(null);
  const [locationId, setLocationId] = createSignal<string | null>(null);
  const [vvmStatusId, setVvmStatusId] = createSignal<string | null>(null);
  const [expiresBefore, setExpiresBefore] = createSignal('');
  const [includeAllMl, setIncludeAllMl] = createSignal(false);
  const [saving, setSaving] = createSignal(false);

  const resetMode = (m: CreateMode) => {
    setMode(m);
    setAllItems(false);
    setMasterListId(null);
    setLocationId(null);
    setVvmStatusId(null);
    setExpiresBefore('');
    setIncludeAllMl(false);
  };

  // Reference data (loaded lazily when the modal is open).
  const [masterLists] = createResource(() => (props.open ? props.storeId : undefined), fetchMasterLists, { initialValue: [] });
  const [locations] = createResource(() => (props.open ? props.storeId : undefined), fetchLocations, { initialValue: [] });
  const [vvmStatuses] = createResource(() => (props.open ? props.storeId : undefined), fetchVvmStatuses, { initialValue: [] });

  const buildParams = (): CreateStocktakeParams => ({
    mode: mode(),
    description: description() || undefined,
    comment: comment() || undefined,
    isInitialStocktake: isInitial() || undefined,
    isAllItemsStocktake: allItems() || undefined,
    masterListId: masterListId() ?? undefined,
    locationId: locationId() ?? undefined,
    vvmStatusId: vvmStatusId() ?? undefined,
    expiresBefore: expiresBefore() || undefined,
    includeAllMasterListItems: includeAllMl() || undefined,
  });

  // Debounced-ish estimate keyed on the current parameters.
  const estimateSource = createMemo(() =>
    props.open ? { storeId: props.storeId, params: buildParams() } : undefined,
  );
  const [estimate] = createResource(estimateSource, (s) => estimateLineCount(s.storeId, s.params));

  const create = async () => {
    setSaving(true);
    try {
      const res = await insertStocktake(props.storeId, uuid(), buildParams());
      toast.success(`Stocktake #${res.stocktakeNumber} created.`);
      props.onCreated(res.stocktakeNumber);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={props.open}
      onClose={() => props.onClose()}
      title="New stocktake"
      disableDismiss={saving()}
      footer={
        <>
          <Button label="Cancel" variant="ghost" onClick={() => props.onClose()} disabled={saving()} />
          <Button label="Create" variant="primary" icon="plus-circle" busy={saving()} onClick={create} />
        </>
      }
    >
      <div class="create-form">
        <div class="field">
          <span class="field-label">Mode</span>
          <div class="segmented" role="radiogroup" aria-label="Creation mode">
            <For each={MODES}>
              {(m) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={mode() === m.value}
                  class={`segmented-option${mode() === m.value ? ' segmented-option-active' : ''}`}
                  onClick={() => resetMode(m.value)}
                >
                  {m.label}
                </button>
              )}
            </For>
          </div>
        </div>

        <Show when={mode() === 'full'}>
          <label class="check-row">
            <Checkbox aria-label="Include items with no stock on hand" checked={allItems()} onChange={setAllItems} />
            <span>Include items with no stock on hand</span>
          </label>
        </Show>

        <Show when={mode() === 'filtered'}>
          <div class="create-filters">
            <Select
              label="Master list"
              placeholder="Any master list"
              options={masterLists().map((m) => ({ value: m.id, label: m.name }))}
              value={masterListId()}
              onChange={setMasterListId}
            />
            <Select
              label="Location"
              placeholder="Any location"
              options={locations().map((l) => ({ value: l.id, label: `${l.code} — ${l.name}` }))}
              value={locationId()}
              onChange={setLocationId}
            />
            <Select
              label="VVM status"
              placeholder="Any VVM status"
              options={vvmStatuses().map((v) => ({ value: v.id, label: v.description }))}
              value={vvmStatusId()}
              onChange={setVvmStatusId}
            />
            <DateInput label="Expires before" value={expiresBefore()} onValue={(v) => setExpiresBefore(toIsoDate(v))} />
            <Show when={masterListId()}>
              <label class="check-row">
                <Checkbox
                  aria-label="Include all master-list items (incl. zero stock)"
                  checked={includeAllMl()}
                  onChange={setIncludeAllMl}
                />
                <span>Include all master-list items (incl. zero stock)</span>
              </label>
            </Show>
          </div>
        </Show>

        <TextInput label="Description" value={description()} onInput={(e) => setDescription(e.currentTarget.value)} />
        <TextArea label="Comment" value={comment()} onInput={(e) => setComment(e.currentTarget.value)} />

        <label class="check-row">
          <Checkbox aria-label="Opening-balance (initial) stocktake" checked={isInitial()} onChange={setIsInitial} />
          <span>Opening-balance (initial) stocktake — one per store</span>
        </label>

        <div class="create-estimate">
          <Show
            when={mode() !== 'blank'}
            fallback={<span>Blank stocktake — no lines will be generated.</span>}
          >
            <Show when={!estimate.loading} fallback={<span>Estimating…</span>}>
              <span>≈ {estimate() ?? 0} item(s) will be counted.</span>
            </Show>
          </Show>
        </div>
      </div>
    </Modal>
  );
}
