import { h, when, each } from '../../core/dom';
import { icon } from '../../icons';
import { signal, type Getter } from '../../core/signal';
import { openModal, modalShell } from '../../components/modal';
import { button, iconButton } from '../../components/button';
import { combobox } from '../../components/combobox';
import { textField } from '../../components/input';
import { toast } from '../../components/toast';
import { batchLines, type LineInput } from '../../api/stocktakes';
import { fetchStockLinesForItem, searchItems } from '../../api/reference';
import { formatSigned } from '../../core/format';
import { direction, reasonsForDirection, reasonRequired } from './reasons';
import type { ItemRef, LocationRef, ReasonOption, StocktakeLine } from '../../api/types';

interface BatchRow {
  key: string;
  lineId?: string;
  stockLineId?: string;
  snapshot: number;
  isExisting: boolean;
  counted: ReturnType<typeof signal<number | null>>;
  reasonId: ReturnType<typeof signal<string | null>>;
  reasonLabel: ReturnType<typeof signal<string>>;
  batch: ReturnType<typeof signal<string>>;
  expiry: ReturnType<typeof signal<string>>;
  packSize: ReturnType<typeof signal<number | null>>;
  cost: ReturnType<typeof signal<number | null>>;
  sell: ReturnType<typeof signal<number | null>>;
  locationId: ReturnType<typeof signal<string | null>>;
  comment: ReturnType<typeof signal<string>>;
  note: ReturnType<typeof signal<string>>;
  error: ReturnType<typeof signal<string | null>>;
}

export interface LineEditorOpts {
  storeId: string;
  stocktakeId: string;
  reasons: ReasonOption[];
  locations: LocationRef[];
  existingItemIds: string[];
  line?: StocktakeLine; // edit mode
  onSaved: () => void;
}

let rowSeq = 0;

function makeRow(init: Partial<{
  lineId: string; stockLineId: string; snapshot: number; isExisting: boolean;
  counted: number | null; reasonId: string | null; reasonLabel: string;
  batch: string; expiry: string; packSize: number | null; cost: number | null; sell: number | null;
  locationId: string | null; comment: string; note: string;
}> = {}): BatchRow {
  return {
    key: `row-${++rowSeq}`,
    lineId: init.lineId,
    stockLineId: init.stockLineId,
    snapshot: init.snapshot ?? 0,
    isExisting: init.isExisting ?? false,
    counted: signal<number | null>(init.counted ?? null),
    reasonId: signal<string | null>(init.reasonId ?? null),
    reasonLabel: signal<string>(init.reasonLabel ?? ''),
    batch: signal<string>(init.batch ?? ''),
    expiry: signal<string>(init.expiry ?? ''),
    packSize: signal<number | null>(init.packSize ?? null),
    cost: signal<number | null>(init.cost ?? null),
    sell: signal<number | null>(init.sell ?? null),
    locationId: signal<string | null>(init.locationId ?? null),
    comment: signal<string>(init.comment ?? ''),
    note: signal<string>(init.note ?? ''),
    error: signal<string | null>(null),
  };
}

export function openLineEditor(opts: LineEditorOpts) {
  const editMode = !!opts.line;
  const [item, setItem] = signal<ItemRef | null>(opts.line?.item ?? null);
  const [rows, setRows] = signal<BatchRow[]>([]);
  const [dirty, setDirty] = signal(false);
  const [saving, setSaving] = signal(false);
  const markDirty = () => setDirty(true);

  if (editMode && opts.line) {
    const l = opts.line;
    setRows([
      makeRow({
        lineId: l.id,
        stockLineId: l.stockLine?.id,
        snapshot: l.snapshotNumberOfPacks,
        isExisting: true,
        counted: l.countedNumberOfPacks ?? null,
        reasonId: l.reasonOption?.id ?? null,
        reasonLabel: l.reasonOption?.reason ?? '',
        batch: l.batch ?? '',
        expiry: l.expiryDate ?? '',
        packSize: l.packSize ?? null,
        cost: l.costPricePerPack ?? null,
        sell: l.sellPricePerPack ?? null,
        locationId: l.location?.id ?? null,
        comment: l.comment ?? '',
        note: l.note ?? '',
      }),
    ]);
  }

  const loadItemBatches = async (it: ItemRef) => {
    try {
      const stockLines = await fetchStockLinesForItem(opts.storeId, it.id);
      const existing = stockLines.map((s) =>
        makeRow({
          stockLineId: s.id,
          snapshot: s.totalNumberOfPacks,
          isExisting: true,
          batch: s.batch ?? '',
          expiry: s.expiryDate ?? '',
          packSize: s.packSize ?? null,
          cost: s.costPricePerPack ?? null,
          sell: s.sellPricePerPack ?? null,
          locationId: s.locationId ?? null,
        }),
      );
      setRows([...existing, makeRow({ packSize: it.defaultPackSize ?? 1 })]);
    } catch {
      setRows([makeRow({ packSize: it.defaultPackSize ?? 1 })]);
    }
  };

  const addBatch = () => { setRows([...rows(), makeRow({ packSize: item()?.defaultPackSize ?? 1 })]); markDirty(); };
  const removeRow = (key: string) => { setRows(rows().filter((r) => r.key !== key)); markDirty(); };

  const numberInput = (get: Getter<number | null>, set: (n: number | null) => void, opts2: { label: string; step?: string } = { label: '' }) =>
    textField({
      label: opts2.label,
      type: 'number',
      compact: true,
      value: () => (get() == null ? '' : String(get())),
      onInput: (v) => { set(v === '' ? null : Number(v)); markDirty(); },
      maxWidth: '120px',
    });

  const reasonField = (row: BatchRow) => {
    const dir = () => direction(row.counted[0](), row.snapshot);
    return when(() => dir() !== 'none', () => {
      const required = () => reasonRequired(opts.reasons, dir());
      const invalid = () => required() && !row.reasonId[0]();
      return h('div', { class: 'field' },
        h('label', { class: 'field__label' }, `Reason${required() ? ' *' : ''}`),
        combobox<ReasonOption>({
          value: row.reasonId[0],
          selectedLabel: row.reasonLabel[0],
          placeholder: 'Select a reason',
          required: () => required(),
          invalid,
          loadOptions: () => reasonsForDirection(opts.reasons, dir()).map((r) => ({ value: r.id, label: r.reason })),
          onSelect: (v, opt) => { row.reasonId[1](v); row.reasonLabel[1](opt?.label ?? ''); markDirty(); },
        }),
      );
    });
  };

  const batchCard = (row: BatchRow, index: number) =>
    h('div', { class: 'batch-card' },
      h('div', { class: 'batch-card__head' },
        h('h4', null, row.isExisting ? (row.batch[0]() ? `Batch ${row.batch[0]()}` : 'Existing batch') : `New batch ${index + 1}`),
        h('span', { class: 'small muted' }, () => `Snapshot: ${row.snapshot}`),
        h('div', { class: 'spacer' }),
        () => {
          const c = row.counted[0]();
          return c == null ? null : h('span', { class: 'small', style: { 'font-variant-numeric': 'tabular-nums' } }, `Difference: ${formatSigned(c - row.snapshot)}`);
        },
        !row.isExisting ? iconButton({ icon: 'close', label: 'Remove batch', onClick: () => removeRow(row.key) }) : null,
      ),
      () => { const e = row.error[0](); return e ? h('div', { class: 'banner banner--error' }, icon('circle-alert'), e) : null; },
      h('div', { class: 'formgrid' },
        h('div', null, numberInput(row.counted[0], row.counted[1], { label: 'Counted packs' })),
        h('div', null, numberInput(row.packSize[0], row.packSize[1], { label: 'Pack size' })),
        h('div', null, textField({ label: 'Batch', compact: true, value: row.batch[0], onInput: (v) => { row.batch[1](v); markDirty(); } })),
        h('div', null, textField({ label: 'Expiry', type: 'date', compact: true, value: row.expiry[0], onInput: (v) => { row.expiry[1](v); markDirty(); } })),
        h('div', null, numberInput(row.cost[0], row.cost[1], { label: 'Cost price' })),
        h('div', null, numberInput(row.sell[0], row.sell[1], { label: 'Sell price' })),
        h('div', null,
          h('div', { class: 'field' },
            h('label', { class: 'field__label' }, 'Location'),
            combobox<LocationRef>({
              value: row.locationId[0],
              selectedLabel: () => opts.locations.find((l) => l.id === row.locationId[0]())?.name ?? '',
              placeholder: 'No location',
              required: false,
              loadOptions: (q) => opts.locations.filter((l) => l.name.toLowerCase().includes(q.toLowerCase())).map((l) => ({ value: l.id, label: l.name, disabled: l.onHold })),
              onSelect: (v) => { row.locationId[1](v); markDirty(); },
            }),
          ),
        ),
        h('div', null, reasonField(row)),
        h('div', { class: 'full' }, textField({ label: 'Comment', compact: true, value: row.comment[0], onInput: (v) => { row.comment[1](v); markDirty(); } })),
      ),
    );

  const validate = (): boolean => {
    let ok = true;
    for (const row of rows()) {
      row.error[1](null);
      const counted = row.counted[0]();
      if (counted == null) continue;
      const dir = direction(counted, row.snapshot);
      if (reasonRequired(opts.reasons, dir) && !row.reasonId[0]()) {
        row.error[1]('A reason is required for this adjustment.');
        ok = false;
      }
    }
    return ok;
  };

  const save = async (): Promise<boolean> => {
    if (!validate()) return false;
    const inserts: LineInput[] = [];
    const updates: LineInput[] = [];
    for (const row of rows()) {
      const counted = row.counted[0]();
      const base: LineInput = {
        id: row.lineId ?? crypto.randomUUID().replace(/-/g, '').toUpperCase(),
        countedNumberOfPacks: counted,
        batch: row.batch[0]() || null,
        expiryDate: row.expiry[0]() || null,
        packSize: row.packSize[0]() ?? undefined,
        costPricePerPack: row.cost[0]() ?? undefined,
        sellPricePerPack: row.sell[0]() ?? undefined,
        reasonOptionId: row.reasonId[0]() || null,
        comment: row.comment[0]() || null,
        note: row.note[0]() || null,
        locationId: row.locationId[0]() ?? null,
      };
      if (row.lineId) {
        updates.push(base);
      } else {
        // Only persist a brand-new batch once it has been counted.
        if (counted == null) continue;
        inserts.push({ ...base, stocktakeId: opts.stocktakeId, itemId: item()!.id, stockLineId: row.stockLineId ?? null });
      }
    }
    if (inserts.length === 0 && updates.length === 0) {
      toast('Nothing to save — enter a counted quantity.', 'info');
      return false;
    }
    setSaving(true);
    try {
      const res = await batchLines(opts.storeId, { inserts, updates });
      if (!res.ok) {
        for (const err of res.errors) {
          const row = rows().find((r) => r.lineId === err.id) ?? rows().find((r) => !r.lineId);
          row?.error[1](err.message || err.errorType);
        }
        toast('Some lines could not be saved.', 'error');
        return false;
      }
      opts.onSaved();
      return true;
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Save failed', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  openModal((close) => {
    const itemSelector = editMode
      ? h('div', { class: 'field' }, h('label', { class: 'field__label' }, 'Item'), h('div', { class: 'input', style: { display: 'flex', 'align-items': 'center' } }, `${item()?.code ?? ''} — ${item()?.name ?? ''}`))
      : h('div', { class: 'field' },
          h('label', { class: 'field__label' }, 'Item'),
          combobox<ItemRef>({
            value: () => item()?.id ?? null,
            selectedLabel: () => (item() ? `${item()!.code} — ${item()!.name}` : ''),
            placeholder: 'Search the catalogue…',
            async: true,
            required: false,
            loadOptions: async (q) => {
              const items = await searchItems(opts.storeId, q, opts.existingItemIds);
              return items.map((it) => ({ value: it.id, label: `${it.code} — ${it.name}`, data: it }));
            },
            onSelect: (_v, opt) => { if (opt?.data) { setItem(opt.data); loadItemBatches(opt.data); markDirty(); } },
          }),
        );

    const body = h('div', { class: 'stack' },
      itemSelector,
      () => (item() ? h('div', { class: 'small muted' }, `Unit: ${item()!.unitName || 'each'}`) : null),
      when(() => !!item(), () => h('div', null, each(rows, (row, i) => batchCard(row, i)))),
      when(() => !!item(), () => button({ label: 'Add another batch', icon: 'plus-circle', variant: 'secondary', onClick: addBatch })),
    );

    const footer = h('div', { class: 'row', style: { width: '100%' } },
      button({ label: 'Cancel', variant: 'secondary', onClick: () => tryClose(close) }),
      h('div', { class: 'spacer' }),
      button({ label: 'Save', icon: 'save', variant: 'primary', busy: saving, onClick: async () => { if (await save()) close(); } }),
    );

    return modalShell({ title: editMode ? 'Edit line' : 'Add item', body, footer, close: () => tryClose(close) });
  }, {
    // Modal/explicit-save surface: guard against losing uncommitted work.
    beforeClose: () => {
      if (saving()) return false;
      if (dirty()) return confirm('Discard unsaved changes?');
      return true;
    },
  });

  function tryClose(close: () => void) {
    close();
  }
}
