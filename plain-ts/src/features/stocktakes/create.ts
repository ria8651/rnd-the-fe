// S2 — Create flow. Implemented in Stage 2.
import { el } from '../../framework/dom.ts';

export function renderCreateStocktake(_storeId: string): HTMLElement {
  return el(
    'div',
    { class: 'banner banner-info' },
    'Create flow — coming in Stage 2.',
  );
}
