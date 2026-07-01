import { createSignal, For, Show, type JSX } from 'solid-js';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../components/ui/Toast';
import { batchStocktakeLines, searchItems, type ItemSearchResult } from '../../api/stocktakes';
import { uuid } from '../../lib/uuid';

// S4 — Line editor (simplified): search the catalogue for an item not already
// on the stocktake, then capture a new batch's details (counted packs, batch,
// pack size). Existing batches are counted inline in the main table.
export function AddItemModal(props: {
  stocktakeId: string;
  excludeItemIds: Set<string>;
  onClose: () => void;
  onAdded: () => void;
}): JSX.Element {
  const store = useStore();
  const toast = useToast();

  const [query, setQuery] = createSignal('');
  const [results, setResults] = createSignal<ItemSearchResult[]>([]);
  const [searching, setSearching] = createSignal(false);
  const [picked, setPicked] = createSignal<ItemSearchResult | null>(null);

  const [counted, setCounted] = createSignal('');
  const [batch, setBatch] = createSignal('');
  const [packSize, setPackSize] = createSignal('1');
  const [saving, setSaving] = createSignal(false);

  let debounce: ReturnType<typeof setTimeout>;
  const onSearch = (v: string) => {
    setQuery(v);
    clearTimeout(debounce);
    debounce = setTimeout(async () => {
      if (!v.trim()) {
        setResults([]);
        return;
      }
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

  const pick = (item: ItemSearchResult) => {
    setPicked(item);
    setPackSize(String(item.defaultPackSize ?? 1));
  };

  const save = async () => {
    const item = picked();
    if (!item) return;
    setSaving(true);
    try {
      const res = await batchStocktakeLines(store.storeId(), {
        insert: [
          {
            id: uuid(),
            isNew: true,
            stocktakeId: props.stocktakeId,
            itemId: item.id,
            countedNumberOfPacks: counted() === '' ? null : Number(counted()),
            batch: batch().trim() || null,
          },
        ],
      });
      if (!res.ok) {
        toast.show(res.perLineErrors[0]?.message ?? 'Could not add line', 'error');
        return;
      }
      toast.show(`Added ${item.name}`, 'success');
      props.onAdded();
      props.onClose();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not add line', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Add item"
      onClose={props.onClose}
      footer={
        <>
          <Button variant="ghost" onClick={props.onClose} disabled={saving()}>
            Cancel
          </Button>
          <Button variant="primary" busy={saving()} disabled={!picked()} onClick={save}>
            <Icon name="plus" size={18} /> Add
          </Button>
        </>
      }
    >
      <Show
        when={picked()}
        fallback={
          <div class="col" style={{ gap: 'var(--sp-3)' }}>
            <div class="field">
              <label class="field__label">Search the catalogue</label>
              <input
                class="input"
                placeholder="Item code or name…"
                value={query()}
                autofocus
                onInput={(e) => onSearch(e.currentTarget.value)}
              />
            </div>
            <Show when={searching()}>
              <span class="muted">Searching…</span>
            </Show>
            <div class="col" style={{ 'max-height': '320px', 'overflow-y': 'auto' }}>
              <For each={results()}>
                {(item) => (
                  <div class="item-result" onClick={() => pick(item)}>
                    <span>{item.name}</span>
                    <span class="item-result__code">
                      {item.code}
                      {item.unitName ? ` · ${item.unitName}` : ''}
                    </span>
                  </div>
                )}
              </For>
              <Show when={!searching() && query().trim() && results().length === 0}>
                <span class="muted" style={{ padding: 'var(--sp-2)' }}>
                  No matching items (items already on this stocktake are excluded).
                </span>
              </Show>
            </div>
          </div>
        }
      >
        <div class="col" style={{ gap: 'var(--sp-4)' }}>
          <div class="row" style={{ 'justify-content': 'space-between', gap: 'var(--sp-2)' }}>
            <div class="col">
              <strong>{picked()!.name}</strong>
              <span class="item-result__code">{picked()!.code}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPicked(null)}>
              Change item
            </Button>
          </div>
          <div class="detail-meta" style={{ padding: 0, border: 'none', background: 'transparent' }}>
            <div class="field">
              <label class="field__label" for="counted">Counted packs</label>
              <input id="counted" class="input" type="number" min="0" value={counted()} onInput={(e) => setCounted(e.currentTarget.value)} style={{ 'max-width': '160px' }} />
            </div>
            <div class="field">
              <label class="field__label" for="batch">Batch</label>
              <input id="batch" class="input" value={batch()} onInput={(e) => setBatch(e.currentTarget.value)} style={{ 'max-width': '200px' }} />
            </div>
            <div class="field">
              <label class="field__label" for="packsize">Pack size</label>
              <input id="packsize" class="input" type="number" min="1" value={packSize()} onInput={(e) => setPackSize(e.currentTarget.value)} style={{ 'max-width': '120px' }} />
            </div>
          </div>
        </div>
      </Show>
    </Modal>
  );
}
