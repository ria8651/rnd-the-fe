/**
 * S4 — Line editor (spec/stocktakes/05-ui-surface.md › S4, journeys J3/J4). The single surface
 * for entering line data (AC-D2): add/count an item's batches and set reason, batch, expiry,
 * location, pack size, prices, comment/note. A modal over S3. When adding, the item is chosen
 * from the catalogue (items already on the stocktake are excluded — AC-E3) and one or more new
 * batches can be entered; when editing an existing line the item is fixed. Reason requirement
 * and validity are surfaced per the adjustment direction (03 › reason rules) and block save.
 * In edit mode, previous/next move between lines without leaving the editor.
 */
import { type JSX, For, Index, Show, batch as solidBatch, createEffect, createMemo, createSignal, onCleanup } from 'solid-js';
import { Modal } from '../../ui/Modal';
import { Button, IconButton } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Popover } from '../../ui/Popover';
import { TextField } from '../../ui/inputs/TextField';
import { NumericField } from '../../ui/inputs/NumericField';
import { DateField } from '../../ui/inputs/DateField';
import { SelectField } from '../../ui/inputs/SelectField';
import { toast } from '../../ui/toast';
import { auth } from '../../state/auth';
import { batchStocktakeLines, type UpsertLineInput } from './api';
import { searchItems, type ItemSearchResult, type Ref } from './reference';
import { reasonError, adjustmentDirection } from './rules';
import type { ReasonOption, StocktakeLine } from './types';

interface BatchRow {
  key: number;
  lineId?: string;
  counted: number | null;
  batch: string;
  expiry: string | null;
  locationId: string;
  packSize: number | null;
  cost: number | null;
  sell: number | null;
  reasonId: string;
  comment: string;
  note: string;
  /** snapshot for the row (existing line's snapshot, else 0 for a new batch). */
  snapshot: number;
}

export interface LineEditorProps {
  stocktakeId: string;
  existingLine: StocktakeLine | null;
  existingItemIds: string[];
  reasons: ReasonOption[];
  locations: Ref[];
  /** Ordered sibling lines, for prev/next navigation in edit mode. */
  siblings?: StocktakeLine[];
  onNavigate?: (line: StocktakeLine) => void;
  onClose: () => void;
  onSaved: () => void;
}

let keySeq = 1;

function rowFromLine(line: StocktakeLine): BatchRow {
  return {
    key: keySeq++,
    lineId: line.id,
    counted: line.countedNumberOfPacks ?? null,
    batch: line.batch ?? '',
    expiry: line.expiryDate ?? null,
    locationId: line.location?.id ?? '',
    packSize: line.packSize ?? null,
    cost: line.costPricePerPack ?? null,
    sell: line.sellPricePerPack ?? null,
    reasonId: line.reasonOption?.id ?? '',
    comment: line.comment ?? '',
    note: line.note ?? '',
    snapshot: line.snapshotNumberOfPacks
  };
}
function blankRow(packSize: number | null): BatchRow {
  return {
    key: keySeq++,
    counted: null,
    batch: '',
    expiry: null,
    locationId: '',
    packSize,
    cost: null,
    sell: null,
    reasonId: '',
    comment: '',
    note: '',
    snapshot: 0
  };
}

export function StocktakeLineEditor(props: LineEditorProps): JSX.Element {
  const isEdit = () => !!props.existingLine;
  const [item, setItem] = createSignal<{ id: string; code: string; name: string; unitName?: string | null; defaultPackSize: number } | null>(
    props.existingLine ? { id: props.existingLine.itemId, code: props.existingLine.item.code, name: props.existingLine.itemName, unitName: props.existingLine.item.unitName, defaultPackSize: props.existingLine.item.defaultPackSize } : null
  );
  const [rows, setRows] = createSignal<BatchRow[]>(props.existingLine ? [rowFromLine(props.existingLine)] : []);
  const [saving, setSaving] = createSignal(false);

  // React to the edited line changing (prev/next navigation reuses this instance).
  createEffect(() => {
    const line = props.existingLine;
    if (line) {
      solidBatch(() => {
        setItem({ id: line.itemId, code: line.item.code, name: line.itemName, unitName: line.item.unitName, defaultPackSize: line.item.defaultPackSize });
        setRows([rowFromLine(line)]);
      });
    }
  });

  const reasonOptions = () => props.reasons.map((r) => ({ value: r.id, label: r.reason }));
  const locationOptions = () => props.locations.map((l) => ({ value: l.id, label: l.code ? `${l.name} (${l.code})` : l.name }));

  // Update by index. <Index> keys rows by position, so replacing a row object (immutable
  // update) updates the leaf bindings in place without recreating the DOM node — the focused
  // input keeps focus while typing (the alternative, <For>, keys by reference and would
  // recreate the row on every keystroke).
  const updateRow = (i: number, patch: Partial<BatchRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, blankRow(item()?.defaultPackSize ?? null)]);
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  // Reason feedback per row (03 › reason rules).
  const rowReasonError = (r: BatchRow): string | undefined => {
    const pseudo = {
      countedNumberOfPacks: r.counted,
      snapshotNumberOfPacks: r.snapshot,
      reasonOption: props.reasons.find((x) => x.id === r.reasonId) ?? null
    } as StocktakeLine;
    const e = reasonError(pseudo, props.reasons);
    if (e === 'AdjustmentReasonNotProvided') return 'A reason is required for this adjustment';
    if (e === 'AdjustmentReasonNotValid') return 'Reason not valid for this adjustment direction';
    return undefined;
  };
  const directionLabel = (r: BatchRow) => {
    const d = adjustmentDirection({ countedNumberOfPacks: r.counted, snapshotNumberOfPacks: r.snapshot });
    return d === 'positive' ? 'Stock up' : d === 'negative' ? 'Stock down' : '';
  };

  const canSave = createMemo(() => {
    if (!item()) return false;
    if (rows().length === 0) return false;
    return rows().every((r) => !rowReasonError(r));
  });

  const buildUpsert = (r: BatchRow): UpsertLineInput => {
    const u: UpsertLineInput = {
      stocktakeId: props.stocktakeId,
      countedNumberOfPacks: r.counted,
      batch: r.batch || undefined,
      packSize: r.packSize ?? undefined,
      costPricePerPack: r.cost ?? undefined,
      sellPricePerPack: r.sell ?? undefined,
      location: { value: r.locationId || null },
      reasonOptionId: r.reasonId || undefined,
      comment: r.comment || undefined,
      note: r.note || undefined,
      expiryDate: r.expiry ?? undefined
    };
    if (r.lineId) u.id = r.lineId;
    else u.itemId = item()!.id;
    return u;
  };

  const save = async (): Promise<boolean> => {
    if (!canSave()) return false;
    setSaving(true);
    try {
      const res = await batchStocktakeLines(auth.storeId, { upserts: rows().map(buildUpsert) });
      const failed = [...res.inserts, ...res.updates].filter((x) => x.errorType);
      if (failed.length) {
        toast(`Save failed: ${failed[0]!.errorType}`, 'error');
        return false;
      }
      return true;
    } catch {
      toast('Save failed', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const onSaveClose = async () => {
    if (await save()) props.onSaved();
  };

  // Prev/next navigation (edit mode) — save current, then move to the sibling.
  const siblingIndex = createMemo(() => (props.siblings ?? []).findIndex((l) => l.id === props.existingLine?.id));
  const neighbour = (dir: 1 | -1) => (props.siblings ?? [])[siblingIndex() + dir];
  const navigate = async (dir: 1 | -1) => {
    const next = neighbour(dir);
    if (!next) return;
    if (await save()) props.onNavigate?.(next);
  };

  return (
    <Modal
      open
      title={isEdit() ? `Edit ${item()?.name ?? 'line'}` : 'Add item'}
      onClose={props.onClose}
      width="720px"
      footer={
        <>
          <Show when={isEdit() && (props.siblings?.length ?? 0) > 1}>
            <div class="editor-nav" style={{ 'margin-inline-end': 'auto' }}>
              <IconButton icon="arrow-left" label="Previous item" plain disabled={!neighbour(-1)} onClick={() => navigate(-1)} />
              <span class="hint">
                {siblingIndex() + 1} / {props.siblings!.length}
              </span>
              <IconButton icon="arrow-right" label="Next item" plain disabled={!neighbour(1)} onClick={() => navigate(1)} />
            </div>
          </Show>
          <Button variant="ghost" onClick={props.onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon="save" busy={saving()} disabled={!canSave()} onClick={onSaveClose}>
            Save
          </Button>
        </>
      }
    >
      <div class="line-editor">
        {/* Item selector */}
        <Show
          when={!isEdit()}
          fallback={
            <div>
              <div class="field__label">Item</div>
              <div style={{ 'font-weight': 600 }}>
                {item()?.name} <span class="hint">({item()?.code})</span>
              </div>
              <Show when={item()?.unitName}>
                <div class="hint">Unit: {item()!.unitName}</div>
              </Show>
            </div>
          }
        >
          <ItemPicker
            excludeIds={props.existingItemIds}
            onPick={(it) =>
              solidBatch(() => {
                setItem(it);
                setRows([blankRow(it.defaultPackSize)]);
              })
            }
            selected={item()}
          />
        </Show>

        {/* Batch rows */}
        <Show when={item()}>
          <div class="editor-batches">
            <Index each={rows()}>
              {(row, i) => (
                <div class="batch-card">
                  <div class="batch-card__head">
                    <strong>{row().lineId ? `Batch ${row().batch || '—'}` : 'New batch'}</strong>
                    <Show when={!isEdit() && rows().length > 1}>
                      <button class="filter-chip__remove" type="button" aria-label="Remove batch" onClick={() => removeRow(i)}>
                        <Icon name="close" size={16} />
                      </button>
                    </Show>
                  </div>
                  <div class="batch-card__grid">
                    <NumericField label="Counted packs" value={row().counted} onInput={(v) => updateRow(i, { counted: v })} min={0} width="100%" />
                    <NumericField label="Pack size" value={row().packSize} onInput={(v) => updateRow(i, { packSize: v })} min={0} width="100%" />
                    <TextField label="Batch" value={row().batch} onInput={(v) => updateRow(i, { batch: v })} full />
                    <DateField label="Expiry" value={row().expiry} onChange={(v) => updateRow(i, { expiry: v })} width="100%" />
                    <SelectField label="Location" searchable value={row().locationId} onChange={(v) => updateRow(i, { locationId: v })} options={locationOptions()} placeholder="None" full />
                    <NumericField label="Cost / pack" value={row().cost} onInput={(v) => updateRow(i, { cost: v })} min={0} width="100%" />
                    <NumericField label="Sell / pack" value={row().sell} onInput={(v) => updateRow(i, { sell: v })} min={0} width="100%" />
                    <SelectField
                      label={`Reason${directionLabel(row()) ? ` · ${directionLabel(row())}` : ''}`}
                      value={row().reasonId}
                      onChange={(v) => updateRow(i, { reasonId: v })}
                      options={reasonOptions()}
                      placeholder="Select…"
                      error={rowReasonError(row())}
                      full
                    />
                    <div style={{ 'grid-column': '1 / -1' }}>
                      <TextField label="Comment" value={row().comment} onInput={(v) => updateRow(i, { comment: v })} full />
                    </div>
                  </div>
                </div>
              )}
            </Index>
            <Show when={!isEdit()}>
              <Button variant="ghost" icon="plus-circle" onClick={addRow}>
                Add another batch
              </Button>
            </Show>
          </div>
        </Show>
      </div>
    </Modal>
  );
}

/** Async catalogue item picker (S4 › Item selector). Debounced search excluding items already
 *  on the stocktake. */
function ItemPicker(props: {
  excludeIds: string[];
  selected: { id: string; name: string; code: string } | null;
  onPick: (item: ItemSearchResult) => void;
}): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal('');
  const [results, setResults] = createSignal<ItemSearchResult[]>([]);
  const [loading, setLoading] = createSignal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let searchEl: HTMLInputElement | undefined;

  const run = (term: string) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      setLoading(true);
      try {
        const items = await searchItems(auth.storeId, term);
        setResults(items.filter((i) => !props.excludeIds.includes(i.id)));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };
  onCleanup(() => timer && clearTimeout(timer));

  return (
    <div class="field field--full">
      <span class="field__label">Item</span>
      <Popover
        open={open()}
        onClose={() => setOpen(false)}
        matchWidth
        trigger={
          <button
            type="button"
            class="control select-trigger"
            data-popover-trigger
            aria-haspopup="listbox"
            aria-expanded={open()}
            onClick={() => {
              setOpen(!open());
              if (!open()) return;
              queueMicrotask(() => searchEl?.focus());
              if (!results().length) run('');
            }}
          >
            <span class={`select-trigger__value${props.selected ? '' : ' is-placeholder'}`}>
              {props.selected ? `${props.selected.name} (${props.selected.code})` : 'Search the catalogue…'}
            </span>
            <Icon name="search" size={16} class="select-trigger__chevron" />
          </button>
        }
      >
        <div>
          <div class="select-search">
            <input
              ref={searchEl}
              class="control control--compact"
              type="text"
              placeholder="Search by code or name…"
              value={query()}
              onInput={(e) => {
                setQuery(e.currentTarget.value);
                run(e.currentTarget.value);
              }}
            />
          </div>
          <ul class="menu" role="listbox" aria-label="Items">
            <Show when={!loading()} fallback={<li class="menu-item"><span class="spinner" /> Searching…</li>}>
              <Show when={results().length} fallback={<li class="menu-item" style={{ color: 'var(--text-secondary)' }}>No matching items</li>}>
                <For each={results()}>
                  {(it) => (
                    <li role="none">
                      <button
                        type="button"
                        role="option"
                        class="menu-item"
                        onClick={() => {
                          props.onPick(it);
                          setOpen(false);
                        }}
                      >
                        <span class="menu-item__label">
                          {it.name} <span class="hint">({it.code})</span>
                        </span>
                      </button>
                    </li>
                  )}
                </For>
              </Show>
            </Show>
          </ul>
        </div>
      </Popover>
    </div>
  );
}
