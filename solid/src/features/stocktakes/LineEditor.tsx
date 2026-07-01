import { createMemo, createSignal, For, Show, type JSX } from 'solid-js';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Select } from '../../components/ui/Select';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../components/ui/Toast';
import {
  batchStocktakeLines,
  searchItems,
  type ItemSearchResult,
  type LineFields,
} from '../../api/stocktakes';
import type { ReasonOption, StocktakeLine } from '../../api/types';
import { adjustmentDirection, reasonsForDirection, reasonState } from '../../lib/reasons';
import { formatNumber, formatSigned } from '../../lib/format';
import { uuid } from '../../lib/uuid';

// S4 — the single surface for entering stocktake-line data (counted, reason,
// batch, dates, location, prices, notes). Opened from S3 by selecting a line
// (edit) or via Add item (create). The S3 table never edits inline.

interface Form {
  counted: string;
  reasonId: string | null;
  batch: string;
  expiryDate: string;
  manufactureDate: string;
  locationId: string | null;
  packSize: string;
  costPricePerPack: string;
  sellPricePerPack: string;
  comment: string;
  note: string;
}

const emptyForm = (): Form => ({
  counted: '',
  reasonId: null,
  batch: '',
  expiryDate: '',
  manufactureDate: '',
  locationId: null,
  packSize: '1',
  costPricePerPack: '',
  sellPricePerPack: '',
  comment: '',
  note: '',
});

const formFromLine = (l: StocktakeLine): Form => ({
  counted: l.countedNumberOfPacks == null ? '' : String(l.countedNumberOfPacks),
  reasonId: l.reasonOption?.id ?? null,
  batch: l.batch ?? '',
  expiryDate: l.expiryDate ?? '',
  manufactureDate: l.manufactureDate ?? '',
  locationId: l.location?.id ?? null,
  packSize: l.packSize == null ? '' : String(l.packSize),
  costPricePerPack: l.costPricePerPack == null ? '' : String(l.costPricePerPack),
  sellPricePerPack: l.sellPricePerPack == null ? '' : String(l.sellPricePerPack),
  comment: l.comment ?? '',
  note: l.note ?? '',
});

const num = (s: string): number | null => (s.trim() === '' ? null : Number(s));

export function LineEditor(props: {
  stocktakeId: string;
  mode: 'create' | 'edit';
  line?: StocktakeLine;
  lines: StocktakeLine[]; // sibling lines for prev/next (edit mode)
  reasons: ReasonOption[];
  locations: { id: string; name: string; code: string }[];
  excludeItemIds: Set<string>;
  onClose: () => void;
  onSaved: () => void;
}): JSX.Element {
  const store = useStore();
  const toast = useToast();

  // Create-mode item search
  const [query, setQuery] = createSignal('');
  const [results, setResults] = createSignal<ItemSearchResult[]>([]);
  const [searching, setSearching] = createSignal(false);
  const [pickedItem, setPickedItem] = createSignal<ItemSearchResult | null>(null);

  // Edit-mode active line index (for prev/next)
  const startIndex = props.line ? props.lines.findIndex((l) => l.id === props.line!.id) : -1;
  const [index, setIndex] = createSignal(startIndex);
  const activeLine = () => (props.mode === 'edit' ? props.lines[index()] ?? props.line : undefined);

  const [form, setForm] = createSignal<Form>(props.line ? formFromLine(props.line) : emptyForm());
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Snapshot the editor is adjusting against (existing line) or 0 (new batch).
  const snapshot = () => activeLine()?.snapshotNumberOfPacks ?? 0;
  const difference = () => {
    const c = num(form().counted);
    return c == null ? null : c - snapshot();
  };

  const direction = () => adjustmentDirection(snapshot(), num(form().counted));
  const reasonOpts = () => reasonsForDirection(props.reasons, direction()).map((r) => ({ value: r.id, label: r.reason }));
  const rState = () => reasonState(props.reasons, snapshot(), num(form().counted), form().reasonId);

  const title = () => {
    if (props.mode === 'create') return 'Add item';
    const l = activeLine();
    return l ? `${l.item.code} · ${l.itemName}` : 'Edit line';
  };

  let debounce: ReturnType<typeof setTimeout>;
  const onSearch = (v: string) => {
    setQuery(v);
    clearTimeout(debounce);
    debounce = setTimeout(async () => {
      if (!v.trim()) return setResults([]);
      setSearching(true);
      try {
        const items = await searchItems(store.storeId(), v.trim());
        setResults(items.filter((i) => !props.excludeItemIds.has(i.id)));
      } catch (e) {
        toast.show(e instanceof Error ? e.message : 'Search failed', 'error');
      } finally {
        setSearching(false);
      }
    }, 250);
  };

  const pickItem = (item: ItemSearchResult) => {
    setPickedItem(item);
    setForm({ ...emptyForm(), packSize: String(item.defaultPackSize ?? 1) });
  };

  const fieldsFromForm = (): LineFields => ({
    countedNumberOfPacks: num(form().counted),
    reasonOptionId: form().reasonId ?? null,
    batch: form().batch.trim() || null,
    expiryDate: form().expiryDate || null,
    manufactureDate: form().manufactureDate || null,
    locationId: form().locationId,
    packSize: num(form().packSize) ?? undefined,
    costPricePerPack: num(form().costPricePerPack),
    sellPricePerPack: num(form().sellPricePerPack),
    comment: form().comment.trim() || null,
    note: form().note.trim() || null,
  });

  // Persist the current form. Returns true on success.
  const persist = async (): Promise<boolean> => {
    setError(null);
    if (rState() !== 'ok') {
      setError(rState() === 'missing' ? 'A reason is required for this adjustment.' : 'The chosen reason does not match the adjustment direction.');
      return false;
    }
    const fields = fieldsFromForm();
    try {
      let res;
      if (props.mode === 'create') {
        const item = pickedItem();
        if (!item) return false;
        res = await batchStocktakeLines(store.storeId(), {
          insert: [{ id: uuid(), stocktakeId: props.stocktakeId, itemId: item.id, ...fields }],
        });
      } else {
        const l = activeLine();
        if (!l) return false;
        res = await batchStocktakeLines(store.storeId(), { update: [{ id: l.id, ...fields }] });
      }
      if (!res.ok) {
        setError(res.perLineErrors[0]?.message ?? 'Could not save the line.');
        return false;
      }
      props.onSaved();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the line.');
      return false;
    }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      if (await persist()) {
        toast.show('Line saved', 'success');
        props.onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  // Rapid counting: save the current line, then move to a sibling (edit mode).
  const move = async (delta: 1 | -1) => {
    const next = index() + delta;
    if (next < 0 || next >= props.lines.length) return;
    setSaving(true);
    try {
      if (!(await persist())) return;
      setIndex(next);
      setForm(formFromLine(props.lines[next]));
      setError(null);
    } finally {
      setSaving(false);
    }
  };

  const locationOpts = createMemo(() => props.locations.map((l) => ({ value: l.id, label: `${l.code} · ${l.name}` })));

  const NumField = (p: { label: string; key: keyof Form; step?: string }) => (
    <div class="field">
      <label class="field__label">{p.label}</label>
      <input
        class="input input--sm"
        type="number"
        min="0"
        step={p.step ?? '1'}
        value={form()[p.key] as string}
        onInput={(e) => set(p.key, e.currentTarget.value as Form[typeof p.key])}
      />
    </div>
  );

  const TextField = (p: { label: string; key: keyof Form }) => (
    <div class="field">
      <label class="field__label">{p.label}</label>
      <input class="input input--sm" value={form()[p.key] as string} onInput={(e) => set(p.key, e.currentTarget.value as Form[typeof p.key])} />
    </div>
  );

  const DateField = (p: { label: string; key: keyof Form }) => (
    <div class="field">
      <label class="field__label">{p.label}</label>
      <input class="input input--sm" type="date" value={form()[p.key] as string} onInput={(e) => set(p.key, e.currentTarget.value as Form[typeof p.key])} />
    </div>
  );

  const editorBody = () => (
    <div class="col" style={{ gap: 'var(--sp-4)' }}>
      <Show when={error()}>
        <div class="banner banner--error"><Icon name="alert" size={18} /><span>{error()}</span></div>
      </Show>

      {/* Count summary */}
      <div class="detail-meta" style={{ 'grid-template-columns': 'repeat(3, 1fr)' }}>
        <div class="detail-meta__item">
          <span class="detail-meta__label">Snapshot</span>
          <span class="tnum">{formatNumber(snapshot())}</span>
        </div>
        <div class="field">
          <label class="field__label">Counted packs</label>
          <input
            class="input input--sm"
            type="number"
            min="0"
            autofocus
            value={form().counted}
            onInput={(e) => set('counted', e.currentTarget.value)}
          />
        </div>
        <div class="detail-meta__item">
          <span class="detail-meta__label">Difference</span>
          <span class="tnum">{formatSigned(difference())}</span>
        </div>
      </div>

      {/* Reason (gated by adjustment direction) */}
      <Show when={direction() !== 'none' && reasonOpts().length > 0}>
        <div class="field">
          <label class="field__label">Reason{rState() === 'missing' ? ' (required)' : ''}</label>
          <Select
            size="sm"
            value={form().reasonId}
            options={reasonOpts()}
            onChange={(v) => set('reasonId', v)}
            placeholder="Select reason"
            invalid={rState() !== 'ok'}
            aria-label="Adjustment reason"
          />
        </div>
      </Show>

      {/* Batch details */}
      <div class="detail-meta" style={{ 'grid-template-columns': 'repeat(2, 1fr)' }}>
        {TextField({ label: 'Batch', key: 'batch' })}
        {NumField({ label: 'Pack size', key: 'packSize' })}
        {DateField({ label: 'Expiry date', key: 'expiryDate' })}
        {DateField({ label: 'Manufacture date', key: 'manufactureDate' })}
        <div class="field">
          <label class="field__label">Location</label>
          <Select size="sm" value={form().locationId} options={locationOpts()} onChange={(v) => set('locationId', v)} placeholder="None" searchable aria-label="Location" />
        </div>
        {NumField({ label: 'Cost price / pack', key: 'costPricePerPack', step: '0.01' })}
        {NumField({ label: 'Sell price / pack', key: 'sellPricePerPack', step: '0.01' })}
      </div>
      {TextField({ label: 'Comment', key: 'comment' })}
      {TextField({ label: 'Note (carried to stock)', key: 'note' })}
    </div>
  );

  return (
    <Modal
      title={title()}
      onClose={props.onClose}
      footer={
        <>
          <Show when={props.mode === 'edit' && props.lines.length > 1}>
            <Button variant="ghost" onClick={() => move(-1)} disabled={saving() || index() <= 0} aria-label="Previous item">
              <Icon name="arrow-left" size={18} /> Prev
            </Button>
            <Button variant="ghost" onClick={() => move(1)} disabled={saving() || index() >= props.lines.length - 1} aria-label="Next item">
              Next <Icon name="arrow-right" size={18} />
            </Button>
            <div class="grow" />
          </Show>
          <Button variant="ghost" onClick={props.onClose} disabled={saving()}>Cancel</Button>
          <Button variant="primary" busy={saving()} disabled={props.mode === 'create' && !pickedItem()} onClick={onSave}>
            <Icon name="check" size={18} /> Save
          </Button>
        </>
      }
    >
      <Show
        when={props.mode === 'edit' || pickedItem()}
        fallback={
          <div class="col" style={{ gap: 'var(--sp-3)' }}>
            <div class="field">
              <label class="field__label">Search the catalogue</label>
              <input class="input" placeholder="Item code or name…" value={query()} autofocus onInput={(e) => onSearch(e.currentTarget.value)} />
            </div>
            <Show when={searching()}><span class="muted">Searching…</span></Show>
            <div class="col" style={{ 'max-height': '320px', 'overflow-y': 'auto' }}>
              <For each={results()}>
                {(item) => (
                  <div class="item-result" onClick={() => pickItem(item)}>
                    <span>{item.name}</span>
                    <span class="item-result__code">{item.code}{item.unitName ? ` · ${item.unitName}` : ''}</span>
                  </div>
                )}
              </For>
              <Show when={!searching() && query().trim() && results().length === 0}>
                <span class="muted" style={{ padding: 'var(--sp-2)' }}>No matching items (items already on this stocktake are excluded).</span>
              </Show>
            </div>
          </div>
        }
      >
        <Show when={props.mode === 'create' && pickedItem()}>
          <div class="row" style={{ 'justify-content': 'space-between', 'margin-bottom': 'var(--sp-3)' }}>
            <div class="col">
              <strong>{pickedItem()!.name}</strong>
              <span class="item-result__code">{pickedItem()!.code}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPickedItem(null)}>Change item</Button>
          </div>
        </Show>
        {editorBody()}
      </Show>
    </Modal>
  );
}
