/**
 * S2 — Create flow (spec/stocktakes/05-ui-surface.md › S2, journey J2). Pick a mode
 * (Full / Filtered / Blank, mutually exclusive — switching resets the other inputs), set its
 * parameters, and see an estimated line count (or a blank notice) before confirming. On
 * confirm the stocktake is created (NEW) and the caller navigates to its detail view (S3).
 */
import { type JSX, Show, batch, createMemo, createResource, createSignal } from 'solid-js';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/inputs/TextField';
import { DateField } from '../../ui/inputs/DateField';
import { SelectField, type SelectOption } from '../../ui/inputs/SelectField';
import { Toggle } from '../../ui/inputs/Toggle';
import { toast } from '../../ui/toast';
import { auth } from '../../state/auth';
import { insertStocktake } from './api';
import { listLocations, listMasterLists, listVvmStatuses, estimateLineCount, type Ref } from './reference';
import type { CreateMode, CreateStocktakeInput } from './types';

export function StocktakeCreateModal(props: {
  open: boolean;
  onClose: () => void;
  onCreated: (stocktakeNumber: number) => void;
}): JSX.Element {
  const [mode, setMode] = createSignal<Exclude<CreateMode, 'initial'>>('full');
  const [description, setDescription] = createSignal('');
  const [comment, setComment] = createSignal('');
  const [isAllItems, setIsAllItems] = createSignal(false);
  const [masterListId, setMasterListId] = createSignal('');
  const [locationId, setLocationId] = createSignal('');
  const [vvmStatusId, setVvmStatusId] = createSignal('');
  const [expiresBefore, setExpiresBefore] = createSignal<string | null>(null);
  const [includeAllMaster, setIncludeAllMaster] = createSignal(false);
  const [saving, setSaving] = createSignal(false);

  // Reference data loaded lazily when the modal opens.
  const [refs] = createResource(
    () => (props.open ? auth.storeId : undefined),
    async (storeId) => {
      const [locations, masterLists, vvm] = await Promise.all([
        listLocations(storeId).catch(() => [] as Ref[]),
        listMasterLists(storeId).catch(() => [] as (Ref & { lineCount: number })[]),
        listVvmStatuses(storeId).catch(() => [] as Ref[])
      ]);
      return { locations, masterLists, vvm };
    }
  );

  const opt = (r: Ref): SelectOption => ({ value: r.id, label: r.code ? `${r.name} (${r.code})` : r.name });

  const resetOthers = () => {
    setIsAllItems(false);
    setMasterListId('');
    setLocationId('');
    setVvmStatusId('');
    setExpiresBefore(null);
    setIncludeAllMaster(false);
  };
  const pickMode = (m: Exclude<CreateMode, 'initial'>) => {
    if (m === mode()) return;
    batch(() => {
      setMode(m);
      resetOthers();
    });
  };

  const estimateParams = createMemo(() => ({
    mode: mode(),
    isAllItemsStocktake: isAllItems(),
    locationId: locationId() || undefined,
    masterListId: masterListId() || undefined,
    includeAllMasterListItems: includeAllMaster(),
    expiresBefore: expiresBefore() || undefined
  }));

  const [estimate] = createResource(
    () => (props.open && mode() !== 'blank' ? estimateParams() : undefined),
    (p) => estimateLineCount(auth.storeId, p, refs()?.masterLists ?? [])
  );

  const create = async () => {
    setSaving(true);
    const base: CreateStocktakeInput = {
      description: description() || undefined,
      comment: comment() || undefined
    };
    if (mode() === 'full') base.isAllItemsStocktake = isAllItems();
    else if (mode() === 'blank') base.createBlankStocktake = true;
    else {
      base.masterListId = masterListId() || undefined;
      base.locationId = locationId() || undefined;
      base.vvmStatusId = vvmStatusId() || undefined;
      base.expiresBefore = expiresBefore() || undefined;
      base.includeAllMasterListItems = includeAllMaster();
    }
    try {
      const res = await insertStocktake(auth.storeId, base);
      if (res.ok) {
        toast(`Stocktake #${res.stocktakeNumber} created`, 'success');
        props.onCreated(res.stocktakeNumber);
        reset();
      } else {
        toast(`Could not create stocktake (${res.errorType})`, 'error');
      }
    } catch {
      toast('Could not create stocktake', 'error');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    batch(() => {
      setMode('full');
      setDescription('');
      setComment('');
      resetOthers();
    });
  };
  const close = () => {
    if (saving()) return;
    props.onClose();
  };

  const MODES: { value: Exclude<CreateMode, 'initial'>; label: string }[] = [
    { value: 'full', label: 'Full' },
    { value: 'filtered', label: 'Filtered' },
    { value: 'blank', label: 'Blank' }
  ];

  return (
    <Modal
      open={props.open}
      title="New stocktake"
      onClose={close}
      width="560px"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" busy={saving()} icon="plus-circle" onClick={create}>
            Create
          </Button>
        </>
      }
    >
      <div class="line-editor">
        <div role="group" aria-label="Creation mode" style={{ display: 'flex', gap: '8px' }}>
          {MODES.map((m) => (
            <button
              type="button"
              class={`btn btn--compact ${mode() === m.value ? 'btn--primary' : 'btn--secondary'}`}
              aria-pressed={mode() === m.value}
              onClick={() => pickMode(m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div class="form-grid">
          <div class="form-grid--full">
            <TextField label="Description" value={description()} onInput={setDescription} placeholder="Optional label" full />
          </div>
          <div class="form-grid--full">
            <TextField label="Comment" value={comment()} onInput={setComment} multiline rows={2} full />
          </div>
        </div>

        <Show when={mode() === 'full'}>
          <Toggle checked={isAllItems()} onChange={setIsAllItems} label="Include items with no stock on hand" />
        </Show>

        <Show when={mode() === 'filtered'}>
          <div class="form-grid">
            <SelectField
              label="Master list"
              searchable
              value={masterListId()}
              onChange={setMasterListId}
              options={(refs()?.masterLists ?? []).map(opt)}
              placeholder="Any"
              full
            />
            <SelectField
              label="Location"
              searchable
              value={locationId()}
              onChange={setLocationId}
              options={(refs()?.locations ?? []).map(opt)}
              placeholder="Any"
              full
            />
            <SelectField
              label="VVM status"
              value={vvmStatusId()}
              onChange={setVvmStatusId}
              options={(refs()?.vvm ?? []).map(opt)}
              placeholder="Any"
              full
            />
            <DateField label="Expires before" value={expiresBefore()} onChange={setExpiresBefore} width="100%" />
            <div class="form-grid--full">
              <Toggle
                checked={includeAllMaster()}
                onChange={setIncludeAllMaster}
                disabled={!masterListId()}
                label="Include all master-list items (incl. zero stock)"
              />
            </div>
          </div>
        </Show>

        <Show
          when={mode() !== 'blank'}
          fallback={<p class="hint">A blank stocktake has no lines — you add items yourself.</p>}
        >
          <p class="hint">
            <Show when={estimate.loading} fallback={<>Estimated lines: <strong>{estimate() ?? '—'}</strong></>}>
              Estimating…
            </Show>
          </p>
        </Show>
      </div>
    </Modal>
  );
}
