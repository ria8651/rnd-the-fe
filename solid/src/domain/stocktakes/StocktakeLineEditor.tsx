import { createSignal, createEffect, createMemo, Show, on, type JSX } from 'solid-js';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { AsyncSelect, Select, type Option } from '../../ui/Select';
import { NumericInput, TextInput, TextArea, DateInput } from '../../ui/inputs';
import { Icon } from '../../ui/Icon';
import { batchLines, type LineUpsert } from './api';
import { searchItems } from './reference';
import type { LocationRef } from './reference';
import type { ReasonOption, StocktakeLine } from './types';
import { adjustmentDirection, reasonsForDirection, validReasonTypes } from './rules';
import { debounce } from '../../lib/debounce';
import { uuid } from '../../lib/uuid';
import { toIsoDate } from '../../lib/format';
import { toast } from '../../state/toast';

/*
 * S4 — Line editor (J3): the single surface for entering line data. A modal over S3,
 * opened by selecting a line (edit) or Add item (create). The item selector is an
 * async catalogue-lookup single-select that excludes items already on the stocktake
 * and locks to the chosen item when editing. Reason is required by adjustment
 * direction (03) and offered only as valid types. Save upserts in one batch call and
 * surfaces per-line errors (mismatch / reduced-below-zero / reason). Explicit save;
 * leaving with unsaved changes is guarded.
 */

export interface LineEditorProps {
  open: boolean;
  storeId: string;
  stocktakeId: string;
  reasons: ReasonOption[];
  locations: LocationRef[];
  /** The line to edit; null to add a new item/batch. */
  line: StocktakeLine | null;
  existingItemIds: string[];
  onClose: () => void;
  onSaved: () => void;
  /** Move to the adjacent line without leaving the editor. */
  onNavigate?: (delta: -1 | 1) => void;
  navPrevDisabled?: boolean;
  navNextDisabled?: boolean;
}

export function LineEditor(props: LineEditorProps): JSX.Element {
  const isEdit = () => props.line != null;

  const [item, setItem] = createSignal<Option | null>(null);
  const [snapshot, setSnapshot] = createSignal(0);
  const [counted, setCounted] = createSignal<number | null>(null);
  const [batch, setBatch] = createSignal('');
  const [expiry, setExpiry] = createSignal('');
  const [locationId, setLocationId] = createSignal<string | null>(null);
  const [packSize, setPackSize] = createSignal<number | null>(null);
  const [cost, setCost] = createSignal<number | null>(null);
  const [sell, setSell] = createSignal<number | null>(null);
  const [reasonId, setReasonId] = createSignal<string | null>(null);
  const [comment, setComment] = createSignal('');
  const [note, setNote] = createSignal('');
  const [dirty, setDirty] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [lineError, setLineError] = createSignal<string | undefined>();
  const [reasonError, setReasonError] = createSignal<string | undefined>();

  // (Re)load the form whenever the target line (or open) changes.
  createEffect(
    on(
      () => [props.open, props.line?.id] as const,
      () => {
        const l = props.line;
        setItem(l ? { value: l.itemId, label: `${l.item.code} — ${l.itemName}` } : null);
        setSnapshot(l?.snapshotNumberOfPacks ?? 0);
        setCounted(l?.countedNumberOfPacks ?? null);
        setBatch(l?.batch ?? '');
        setExpiry(l?.expiryDate ? toIsoDate(l.expiryDate) : '');
        setLocationId(l?.location?.id ?? null);
        setPackSize(l?.packSize ?? l?.item.defaultPackSize ?? null);
        setCost(l?.costPricePerPack ?? null);
        setSell(l?.sellPricePerPack ?? null);
        setReasonId(l?.reasonOption?.id ?? null);
        setComment(l?.comment ?? '');
        setNote(l?.note ?? '');
        setDirty(false);
        setLineError(undefined);
        setReasonError(undefined);
      },
    ),
  );

  const touch = () => setDirty(true);

  // Async item search (excludes items already on the stocktake).
  const [results, setResults] = createSignal<Option[]>([]);
  const [searchLoading, setSearchLoading] = createSignal(false);
  const [searchError, setSearchError] = createSignal<string | undefined>();
  const runSearch = debounce((q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearchLoading(true);
    setSearchError(undefined);
    searchItems(props.storeId, q)
      .then((items) =>
        setResults(
          items
            .filter((i) => !props.existingItemIds.includes(i.id))
            .map((i) => ({ value: i.id, label: `${i.code} — ${i.name}` })),
        ),
      )
      .catch((e) => setSearchError((e as Error).message))
      .finally(() => setSearchLoading(false));
  }, 300);

  // Adjustment direction drives the reason field.
  const direction = createMemo(() =>
    adjustmentDirection({ countedNumberOfPacks: counted(), snapshotNumberOfPacks: snapshot() }),
  );
  const reasonOptions = createMemo<Option[]>(() =>
    reasonsForDirection(props.reasons, direction()).map((r) => ({ value: r.id, label: r.reason })),
  );
  const reasonRequired = createMemo(() => reasonOptions().length > 0 && direction() !== 'none');
  const diff = () => (counted() == null ? 0 : counted()! - snapshot());

  const invalidLocation = createMemo(() => {
    const loc = props.locations.find((l) => l.id === locationId());
    return loc?.onHold ? 'This location is on hold.' : undefined;
  });

  const close = () => {
    if (dirty() && !confirm('Discard unsaved changes to this line?')) return;
    props.onClose();
  };

  const save = async () => {
    setLineError(undefined);
    setReasonError(undefined);
    // Client-side reason guard (mirrors server AC-R1/R2).
    if (reasonRequired() && !reasonId()) {
      setReasonError('A reason is required for this adjustment.');
      return;
    }
    if (!isEdit() && !item()) {
      setLineError('Choose an item.');
      return;
    }
    setSaving(true);
    const upsert: LineUpsert = {
      id: props.line?.id ?? uuid(),
      countedNumberOfPacks: counted(),
      batch: batch() || null,
      expiryDate: expiry() || null,
      locationId: locationId(),
      packSize: packSize(),
      costPricePerPack: cost(),
      sellPricePerPack: sell(),
      reasonOptionId: reasonId(),
      comment: comment() || null,
      note: note() || null,
    };
    if (!isEdit()) upsert.itemId = item()!.value;

    try {
      const errors = await batchLines(
        props.storeId,
        props.stocktakeId,
        isEdit() ? [] : [upsert],
        isEdit() ? [upsert] : [],
        [],
      );
      if (errors.length) {
        const e = errors[0]!;
        if (e.typename === 'AdjustmentReasonNotProvided' || e.typename === 'AdjustmentReasonNotValid') {
          setReasonError(e.message);
        } else {
          setLineError(e.message);
        }
        return;
      }
      toast.success('Line saved.');
      setDirty(false);
      props.onSaved();
    } catch (e) {
      setLineError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={props.open}
      onClose={close}
      title={isEdit() ? `Edit ${props.line?.itemName ?? 'line'}` : 'Add item'}
      size="lg"
      disableDismiss={saving()}
      headerActions={
        <Show when={props.onNavigate}>
          <div class="editor-nav">
            <Button icon="arrow-left" aria-label="Previous item" variant="ghost" compact disabled={props.navPrevDisabled} onClick={() => props.onNavigate!(-1)} />
            <Button icon="arrow-right" aria-label="Next item" variant="ghost" compact disabled={props.navNextDisabled} onClick={() => props.onNavigate!(1)} />
          </div>
        </Show>
      }
      footer={
        <>
          <Button label="Cancel" variant="ghost" onClick={close} disabled={saving()} />
          <Button label="Save" variant="primary" icon="save" busy={saving()} onClick={save} />
        </>
      }
    >
      <div class="line-editor">
        <Show
          when={isEdit()}
          fallback={
            <AsyncSelect
              label="Item"
              placeholder="Search the catalogue…"
              promptText="Type at least 2 characters…"
              selected={item()}
              results={results()}
              loading={searchLoading()}
              error={searchError()}
              onQuery={(q) => runSearch(q)}
              onChange={(o) => {
                setItem(o);
                touch();
              }}
              required
            />
          }
        >
          <TextInput label="Item" value={item()?.label ?? ''} disabled />
        </Show>

        <div class="line-editor-grid">
          <NumericInput
            label="Snapshot packs"
            value={snapshot()}
            onValue={() => {}}
            disabled
          />
          <NumericInput
            label="Counted packs"
            value={counted()}
            min={0}
            onValue={(v) => {
              setCounted(v);
              touch();
            }}
            error={lineError() && /below zero|reduced/i.test(lineError()!) ? lineError() : undefined}
          />
          <div class="field">
            <span class="field-label">Difference</span>
            <div class={`diff-readout tabular ${diff() > 0 ? 'diff-pos' : diff() < 0 ? 'diff-neg' : ''}`}>
              {diff() > 0 ? '+' : ''}
              {diff()}
            </div>
          </div>
        </div>

        <div class="line-editor-grid">
          <TextInput label="Batch" value={batch()} onInput={(e) => { setBatch(e.currentTarget.value); touch(); }} />
          <DateInput label="Expiry date" value={expiry()} onValue={(v) => { setExpiry(v); touch(); }} />
          <NumericInput label="Pack size" value={packSize()} min={1} onValue={(v) => { setPackSize(v); touch(); }} />
        </div>

        <div class="line-editor-grid">
          <Select
            label="Location"
            placeholder="No location"
            options={props.locations.map((l) => ({ value: l.id, label: `${l.code} — ${l.name}` }))}
            value={locationId()}
            onChange={(v) => { setLocationId(v); touch(); }}
          />
          <Select
            label={reasonRequired() ? 'Reason (required)' : 'Reason'}
            placeholder={direction() === 'none' ? 'No adjustment' : 'Choose a reason'}
            options={reasonOptions()}
            value={reasonId()}
            onChange={(v) => { setReasonId(v); touch(); }}
            required={reasonRequired()}
            disabled={direction() === 'none'}
            error={reasonError()}
          />
        </div>

        <div class="line-editor-grid">
          <NumericInput label="Cost price / pack" value={cost()} min={0} onValue={(v) => { setCost(v); touch(); }} />
          <NumericInput label="Sell price / pack" value={sell()} min={0} onValue={(v) => { setSell(v); touch(); }} />
        </div>

        <TextArea label="Comment" value={comment()} onInput={(e) => { setComment(e.currentTarget.value); touch(); }} />
        <TextInput label="Note (carried onto stock line)" value={note()} onInput={(e) => { setNote(e.currentTarget.value); touch(); }} />

        <Show when={invalidLocation()}>
          <div class="editor-warning">
            <Icon name="alert" size={16} />
            <span>{invalidLocation()}</span>
          </div>
        </Show>
        <Show when={lineError() && !/below zero|reduced/i.test(lineError()!)}>
          <div class="editor-error">
            <Icon name="circle-alert" size={16} />
            <span>{lineError()}</span>
          </div>
        </Show>
        <Show when={validReasonTypes(direction()).length > 0 && reasonOptions().length === 0 && direction() !== 'none'}>
          <div class="editor-hint">No active reasons are configured for this direction, so none is required.</div>
        </Show>
      </div>
    </Modal>
  );
}
