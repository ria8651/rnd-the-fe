import { createSignal, Show, type JSX } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../components/ui/Toast';
import { insertStocktake } from '../../api/stocktakes';
import { uuid } from '../../lib/uuid';

type Mode = 'full' | 'filtered' | 'blank';

// S2 — Create flow. Mode choice (Full / Filtered / Blank), mutually exclusive;
// switching mode resets other inputs. Full/Filtered options + a saving state.
// (The estimated line-count preview is noted as a gap — see report.)
export function CreateStocktakeModal(props: { onClose: () => void; onCreated: () => void }): JSX.Element {
  const store = useStore();
  const toast = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = createSignal<Mode>('full');
  const [description, setDescription] = createSignal('');
  const [includeAllItems, setIncludeAllItems] = createSignal(false);
  const [expiresBefore, setExpiresBefore] = createSignal('');
  const [saving, setSaving] = createSignal(false);

  const switchMode = (m: Mode) => {
    setMode(m);
    setIncludeAllItems(false);
    setExpiresBefore('');
  };

  const create = async () => {
    setSaving(true);
    try {
      const id = uuid();
      const input: Parameters<typeof insertStocktake>[1] = {
        id,
        description: description().trim() || undefined,
      };
      if (mode() === 'blank') input.createBlankStocktake = true;
      else if (mode() === 'full') input.isAllItemsStocktake = includeAllItems() || undefined;
      else if (mode() === 'filtered') {
        if (expiresBefore()) input.expiresBefore = expiresBefore();
      }

      const result = await insertStocktake(store.storeId(), input);
      toast.show(`Stocktake #${result.stocktakeNumber} created`, 'success');
      props.onCreated();
      props.onClose();
      navigate(`/stocktakes/${result.id}`);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Failed to create stocktake', 'error');
    } finally {
      setSaving(false);
    }
  };

  const modes: { key: Mode; label: string; hint: string }[] = [
    { key: 'full', label: 'Full', hint: 'Count everything currently in stock.' },
    { key: 'filtered', label: 'Filtered', hint: 'Count a subset by filter criteria.' },
    { key: 'blank', label: 'Blank', hint: "Start empty and add lines yourself." },
  ];

  return (
    <Modal
      title="New stocktake"
      onClose={props.onClose}
      footer={
        <>
          <Button variant="ghost" onClick={props.onClose} disabled={saving()}>
            Cancel
          </Button>
          <Button variant="primary" busy={saving()} onClick={create}>
            <Icon name="check" size={18} /> Create
          </Button>
        </>
      }
    >
      <div class="col" style={{ gap: 'var(--sp-4)' }}>
        <div class="field">
          <label class="field__label">Mode</label>
          <div class="col" style={{ gap: 'var(--sp-2)' }}>
            {modes.map((m) => (
              <label
                class="row"
                style={{
                  gap: 'var(--sp-3)',
                  padding: 'var(--sp-3)',
                  border: '1px solid var(--border-default)',
                  'border-radius': 'var(--radius-control)',
                  cursor: 'pointer',
                  background: mode() === m.key ? 'var(--selected)' : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="mode"
                  checked={mode() === m.key}
                  onChange={() => switchMode(m.key)}
                />
                <div class="col">
                  <strong>{m.label}</strong>
                  <span class="muted" style={{ 'font-size': 'var(--type-caption)' }}>
                    {m.hint}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <Show when={mode() === 'full'}>
          <label class="row" style={{ gap: 'var(--sp-2)' }}>
            <input
              type="checkbox"
              checked={includeAllItems()}
              onChange={(e) => setIncludeAllItems(e.currentTarget.checked)}
            />
            Include items with no stock on hand
          </label>
        </Show>

        <Show when={mode() === 'filtered'}>
          <div class="field">
            <label class="field__label" for="expiresBefore">
              Expires before
            </label>
            <input
              id="expiresBefore"
              class="input"
              type="date"
              style={{ 'max-width': '200px' }}
              value={expiresBefore()}
              onInput={(e) => setExpiresBefore(e.currentTarget.value)}
            />
            <span class="muted" style={{ 'font-size': 'var(--type-caption)' }}>
              Master list / location / VVM filters are available in the full app; this build
              exposes the expiry filter.
            </span>
          </div>
        </Show>

        <Show when={mode() === 'blank'}>
          <div class="banner banner--info">
            <Icon name="info" size={18} />
            <span>A blank stocktake is created with no lines. Add items from the detail screen.</span>
          </div>
        </Show>

        <div class="field">
          <label class="field__label" for="description">
            Description
          </label>
          <input
            id="description"
            class="input"
            placeholder="Optional label"
            value={description()}
            onInput={(e) => setDescription(e.currentTarget.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
