// S4 — Line editor. The single surface for entering stocktake-line data: pick an
// item (add) or edit a fixed item, count each of its batches (existing stock +
// new), and set batch/expiry/location/pack size/reason/comment. Saves via the
// batchStocktake endpoint. Spec: ../../../spec/stocktakes/05-ui-surface.md#s4--line-editor

import { el } from '../../framework/dom.ts';
import { signal, effect } from '../../framework/signal.ts';
import { uuid } from '../../framework/id.ts';
import { openDialog } from '../../components/dialog.ts';
import { select } from '../../components/select.ts';
import { icon } from '../../components/icon.ts';
import { toast } from '../../components/toast.ts';
import {
  batchStocktakeLines,
  fetchStocktakeLines,
  type InsertLineInput,
  type UpdateLineInput,
} from '../../api/stocktakes.ts';
import {
  fetchItemStockLines,
  fetchReasonOptions,
  fetchLocations,
  searchItems,
  type CatalogueItem,
  type Location,
} from '../../api/reference.ts';
import { GraphQLError } from '../../api/client.ts';
import { adjustmentDirection, isReasonRequired, reasonsForDirection } from '../../domain/rules.ts';
import { toDateInputValue } from '../../domain/format.ts';
import type { ReasonOption } from '../../domain/types.ts';
import './lineEditor.css';

interface BatchRow {
  key: string;
  lineId?: string; // existing stocktake line → update
  stockLineId?: string; // existing stock batch not yet on stocktake → insert w/ stockLineId
  snapshot: number;
  counted: number | null;
  batch: string;
  expiryDate: string;
  locationId: string | null;
  packSize: number;
  reasonOptionId: string | null;
  comment: string;
  error?: string;
}

export interface LineEditorContext {
  storeId: string;
  stocktakeId: string;
  /** Editing an existing item's lines (item fixed), or adding a new item. */
  item?: { id: string; name: string; unitName?: string | null };
  /** Items already on the stocktake, excluded from add search. */
  excludeItemIds: Set<string>;
  /** Sibling items on the stocktake for prev/next navigation (edit mode). */
  siblings?: { id: string; name: string; unitName?: string | null }[];
  onSaved: () => void;
}

export function openLineEditor(ctx: LineEditorContext): void {
  const reasons = signal<ReasonOption[]>([]);
  const locations = signal<Location[]>([]);
  const currentItem = signal<{ id: string; name: string; unitName?: string | null } | null>(ctx.item ?? null);
  const rows = signal<BatchRow[]>([]);
  const loading = signal<boolean>(false);
  const saving = signal<boolean>(false);

  const body = el('div', { class: 'line-editor' });

  Promise.all([fetchReasonOptions(), fetchLocations(ctx.storeId)])
    .then(([r, l]) => { reasons.set(r); locations.set(l); })
    .catch(() => toast('Could not load reasons/locations.', 'warning'));

  async function loadItemBatches(itemId: string) {
    loading.set(true);
    try {
      const [existing, stock] = await Promise.all([
        fetchStocktakeLines({ storeId: ctx.storeId, stocktakeId: ctx.stocktakeId, first: 200, offset: 0, itemId }),
        fetchItemStockLines(ctx.storeId, itemId),
      ]);
      const existingStockLineIds = new Set(existing.nodes.map((l) => l.stockLine?.id).filter(Boolean) as string[]);
      const fromLines: BatchRow[] = existing.nodes.map((l) => ({
        key: l.id,
        lineId: l.id,
        stockLineId: l.stockLine?.id,
        snapshot: l.snapshotNumberOfPacks,
        counted: l.countedNumberOfPacks ?? null,
        batch: l.batch ?? '',
        expiryDate: toDateInputValue(l.expiryDate),
        locationId: l.location?.id ?? null,
        packSize: l.packSize ?? l.item.defaultPackSize ?? 1,
        reasonOptionId: l.reasonOption?.id ?? null,
        comment: l.comment ?? '',
      }));
      // Stock batches not yet on the stocktake → offer as countable insert rows.
      const fromStock: BatchRow[] = stock
        .filter((s) => !existingStockLineIds.has(s.id))
        .map((s) => ({
          key: `stock-${s.id}`,
          stockLineId: s.id,
          snapshot: s.totalNumberOfPacks,
          counted: null,
          batch: s.batch ?? '',
          expiryDate: toDateInputValue(s.expiryDate),
          locationId: s.locationId ?? null,
          packSize: s.packSize,
          reasonOptionId: null,
          comment: '',
        }));
      const all = [...fromLines, ...fromStock];
      rows.set(all.length ? all : [blankRow()]);
    } finally {
      loading.set(false);
    }
  }

  function blankRow(): BatchRow {
    return {
      key: `new-${uuid()}`,
      snapshot: 0,
      counted: null,
      batch: '',
      expiryDate: '',
      locationId: null,
      packSize: 1,
      reasonOptionId: null,
      comment: '',
    };
  }

  if (ctx.item) loadItemBatches(ctx.item.id);

  async function save() {
    const item = currentItem();
    if (!item) {
      toast('Choose an item first.', 'warning');
      return;
    }
    const working = rows();
    // Client-side reason pre-check (server is authoritative — AC-R1/R2/R3).
    let hasError = false;
    const checked = working.map((r) => {
      const line = { countedNumberOfPacks: r.counted, snapshotNumberOfPacks: r.snapshot, reasonOption: r.reasonOptionId ? ({} as ReasonOption) : null };
      if (r.counted != null && isReasonRequired(line, reasons())) {
        hasError = true;
        return { ...r, error: 'A reason is required for this adjustment.' };
      }
      return { ...r, error: undefined };
    });
    if (hasError) {
      rows.set(checked);
      return;
    }

    const inserts: InsertLineInput[] = [];
    const updates: UpdateLineInput[] = [];
    for (const r of working) {
      if (r.lineId) {
        updates.push({
          id: r.lineId,
          countedNumberOfPacks: r.counted ?? undefined,
          batch: r.batch || undefined,
          packSize: r.packSize,
          reasonOptionId: r.reasonOptionId ?? undefined,
          comment: r.comment || undefined,
          expiryDate: { value: r.expiryDate || null },
          location: { value: r.locationId },
        });
      } else if (r.counted != null) {
        inserts.push({
          id: uuid(),
          stocktakeId: ctx.stocktakeId,
          itemId: item.id,
          stockLineId: r.stockLineId,
          countedNumberOfPacks: r.counted,
          batch: r.batch || undefined,
          packSize: r.packSize,
          reasonOptionId: r.reasonOptionId ?? undefined,
          comment: r.comment || undefined,
          expiryDate: r.expiryDate || undefined,
          location: r.locationId ? { value: r.locationId } : undefined,
        });
      }
    }

    if (!inserts.length && !updates.length) {
      toast('Nothing to save.', 'info');
      return;
    }

    saving.set(true);
    try {
      const res = await batchStocktakeLines({ insert: inserts, update: updates }, ctx.storeId);
      if (res.ok) {
        toast('Lines saved.', 'success');
        ctx.onSaved();
        handle.close();
      } else {
        // Map per-line errors back onto rows (by line id where possible).
        const byLine = new Map(res.lineErrors.map((e) => [e.lineId, e.message]));
        rows.set(rows().map((r) => (r.lineId && byLine.has(r.lineId) ? { ...r, error: byLine.get(r.lineId) } : r)));
        toast(res.lineErrors[0]?.message ?? 'Some lines could not be saved.', 'error');
      }
    } catch (e) {
      toast(e instanceof GraphQLError ? e.message : 'Save failed.', 'error');
    } finally {
      saving.set(false);
    }
  }

  // ---- render ----
  effect(() => {
    const item = currentItem();
    const content: Node[] = [];

    if (!item) {
      content.push(renderItemSearch());
    } else {
      content.push(
        el(
          'div',
          { class: 'le-item' },
          el('span', { class: 'name' }, item.name),
          item.unitName ? el('span', { class: 'le-unit' }, `Unit: ${item.unitName}`) : null,
        ),
      );
      content.push(loading() ? el('div', { class: 'caption' }, 'Loading batches…') : renderBatchTable());
      content.push(
        el(
          'button',
          { class: 'btn btn-ghost btn-compact', onclick: () => rows.set([...rows(), blankRow()]) },
          icon('plus', 16),
          'Add another batch',
        ),
      );
    }

    body.replaceChildren(...content);
  });

  function renderItemSearch(): Node {
    const results = signal<CatalogueItem[]>([]);
    const wrap = el('div', { class: 'field item-search' },
      el('label', null, 'Item'),
      el('input', {
        class: 'input',
        type: 'search',
        placeholder: 'Search items by code or name…',
        'aria-label': 'Search items',
        oninput: (e: Event) => runSearch((e.target as HTMLInputElement).value),
      }),
    );
    const list = el('ul', { class: 'item-search-results', style: { display: 'none' } });
    wrap.appendChild(list);

    let token = 0;
    async function runSearch(term: string) {
      const my = ++token;
      if (term.trim().length < 1) { list.style.display = 'none'; return; }
      try {
        const items = (await searchItems(ctx.storeId, term)).filter((i) => !ctx.excludeItemIds.has(i.id));
        if (my !== token) return;
        results.set(items);
        renderResults();
      } catch { /* ignore */ }
    }
    function renderResults() {
      const items = results();
      list.style.display = items.length ? 'block' : 'none';
      list.replaceChildren(
        ...items.map((i) =>
          el('li', {
            onmousedown: (e: Event) => { e.preventDefault(); pick(i); },
          },
            el('div', null, i.name),
            el('div', { class: 'code' }, i.code),
          ),
        ),
      );
    }
    function pick(i: CatalogueItem) {
      list.style.display = 'none';
      currentItem.set({ id: i.id, name: i.name, unitName: i.unitName });
      loadItemBatches(i.id);
    }
    return wrap;
  }

  function renderBatchTable(): Node {
    const locs = locations();
    const allReasons = reasons();

    const headerCells = ['Batch', 'Expiry', 'Location', 'Pack size', 'Snapshot', 'Counted', 'Reason', 'Comment', ''];
    const thead = el('thead', null, el('tr', null, ...headerCells.map((h) => el('th', { class: h === 'Snapshot' || h === 'Counted' || h === 'Pack size' ? 'num' : '' }, h))));

    const bodyRows: Node[] = [];
    for (const r of rows()) {
      const direction = adjustmentDirection({ countedNumberOfPacks: r.counted, snapshotNumberOfPacks: r.snapshot });
      const applicableReasons = reasonsForDirection(allReasons, direction);
      const reasonRequired = r.counted != null && applicableReasons.length > 0;

      const update = (patch: Partial<BatchRow>) => {
        rows.set(rows().map((x) => (x.key === r.key ? { ...x, ...patch, error: undefined } : x)));
      };

      const tr = el(
        'tr',
        { class: r.error ? 'batch-row-err' : '' },
        el('td', null, el('input', { class: 'input w-md', value: r.batch, 'aria-label': 'Batch', onchange: (e: Event) => update({ batch: (e.target as HTMLInputElement).value }) })),
        el('td', null, el('input', { class: 'input w-md', type: 'date', value: r.expiryDate, 'aria-label': 'Expiry date', onchange: (e: Event) => update({ expiryDate: (e.target as HTMLInputElement).value }) })),
        el('td', null, select<string | null>({
          options: [{ value: null, label: '—' }, ...locs.map((l) => ({ value: l.id, label: l.code }))],
          value: r.locationId, compact: true, ariaLabel: 'Location',
          onChange: (v) => update({ locationId: v }),
        })),
        el('td', { class: 'num' }, el('input', { class: 'input num w-sm', type: 'number', min: '0', value: String(r.packSize), 'aria-label': 'Pack size', onchange: (e: Event) => update({ packSize: Number((e.target as HTMLInputElement).value) || 1 }) })),
        el('td', { class: 'num' }, el('span', { class: 'muted' }, String(r.snapshot))),
        el('td', { class: 'num' }, el('input', {
          class: 'input num w-sm', type: 'number', min: '0', value: r.counted == null ? '' : String(r.counted), 'aria-label': 'Counted packs',
          onchange: (e: Event) => { const v = (e.target as HTMLInputElement).value; update({ counted: v === '' ? null : Number(v) }); },
        })),
        el('td', null, select<string | null>({
          options: [{ value: null, label: reasonRequired ? 'Required…' : '—' }, ...applicableReasons.map((ro) => ({ value: ro.id, label: ro.reason }))],
          value: r.reasonOptionId, compact: true, ariaLabel: 'Reason',
          invalid: reasonRequired && !r.reasonOptionId,
          onChange: (v) => update({ reasonOptionId: v }),
        })),
        el('td', null, el('input', { class: 'input w-md', value: r.comment, 'aria-label': 'Comment', onchange: (e: Event) => update({ comment: (e.target as HTMLInputElement).value }) })),
        el('td', null, r.lineId ? null : el('button', { class: 'icon-btn', 'aria-label': 'Remove batch', onclick: () => rows.set(rows().filter((x) => x.key !== r.key)) }, icon('close', 16))),
      );
      bodyRows.push(tr);
      if (r.error) bodyRows.push(el('tr', { class: 'batch-row-err-msg-row' }, el('td', { colspan: '9' }, el('div', { class: 'batch-row-err-msg' }, icon('circle-alert', 14), ' ', r.error))));
    }

    return el('div', { style: { overflow: 'auto' } }, el('table', { class: 'batch-table' }, thead, el('tbody', null, ...bodyRows)));
  }

  // ---- footer with prev/next + save ----
  const siblings = ctx.siblings ?? [];
  const siblingIndex = () => siblings.findIndex((s) => s.id === currentItem()?.id);

  function goto(delta: number) {
    const idx = siblingIndex();
    if (idx < 0) return;
    const next = siblings[idx + delta];
    if (!next) return;
    currentItem.set(next);
    loadItemBatches(next.id);
  }

  const footer = el(
    'div',
    { style: { display: 'contents' } },
    el(
      'div',
      { class: 'le-footer-left' },
      siblings.length > 1
        ? el(
            'div',
            { class: 'le-nav' },
            el('button', { class: 'icon-btn', 'aria-label': 'Previous item', disabled: () => siblingIndex() <= 0, onclick: () => goto(-1) }, '‹'),
            el('button', { class: 'icon-btn', 'aria-label': 'Next item', disabled: () => siblingIndex() >= siblings.length - 1, onclick: () => goto(1) }, '›'),
          )
        : null,
    ),
    el('button', { class: 'btn btn-secondary', onclick: () => handle.close() }, 'Cancel'),
    el('button', { class: 'btn btn-primary', 'aria-busy': () => (saving() ? 'true' : 'false'), disabled: () => saving(), onclick: save }, () => (saving() ? 'Saving…' : 'Save')),
  );

  const handle = openDialog({
    title: ctx.item ? 'Edit lines' : 'Add item',
    body,
    footer,
    width: 900,
  });
}
