// S3 — Detail screen. Implemented in Stage 3. For now it resolves deep-links
// (by id or by human number) enough to prove routing works.
import { el, mount } from '../../framework/dom.ts';
import { signal, effect } from '../../framework/signal.ts';
import { fetchStocktake, fetchStocktakeByNumber } from '../../api/stocktakes.ts';
import { GraphQLError } from '../../api/client.ts';
import type { Stocktake } from '../../domain/types.ts';
import { statusLabel } from '../../domain/rules.ts';

export function renderStocktakeDetail(
  storeId: string,
  ref: { id?: string; byNumber?: number },
): HTMLElement {
  const st = signal<Stocktake | null>(null);
  const error = signal<string>('');
  const container = el('div', { style: { display: 'contents' } });

  (async () => {
    try {
      const found = ref.byNumber != null
        ? await fetchStocktakeByNumber(ref.byNumber, storeId)
        : await fetchStocktake(ref.id!, storeId);
      if (!found) error.set('Stocktake not found.');
      else st.set(found);
    } catch (e) {
      error.set(e instanceof GraphQLError ? e.message : 'Failed to load stocktake.');
    }
  })();

  effect(() => {
    if (error()) {
      mount(container, el('div', { class: 'banner banner-error' }, error()));
      return;
    }
    const s = st();
    if (!s) {
      mount(container, el('div', { class: 'caption' }, 'Loading…'));
      return;
    }
    mount(
      container,
      el(
        'div',
        null,
        el('h1', null, `Stocktake #${s.stocktakeNumber} — ${statusLabel(s.status)}`),
        el('div', { class: 'banner banner-info', style: { marginTop: '16px' } }, 'Detail & counting — coming in Stage 3.'),
      ),
    );
  });

  return container;
}
