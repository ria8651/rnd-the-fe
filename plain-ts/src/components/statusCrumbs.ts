// Status crumbs — a read-only lifecycle indicator, generic across document
// types. Statuses reached are emphasised; the current one is the last reached.
// Hover/focus reveals when each status was reached. State is conveyed by
// position + text, never colour alone.
// See ../../spec/ui-standards/controls.md#status-crumbs-lifecycle-indicator.

import { el } from '../framework/dom.ts';
import { icon } from './icon.ts';
import { formatDateTime } from '../domain/format.ts';

export interface Crumb {
  key: string;
  label: string;
  reachedAt?: string | null; // timestamp when reached, if reached
}

export function statusCrumbs(crumbs: Crumb[], currentKey: string): HTMLElement {
  const currentIndex = crumbs.findIndex((c) => c.key === currentKey);

  const history = el(
    'div',
    { class: 'crumb-history', role: 'note' },
    ...crumbs.map((c, i) =>
      el(
        'div',
        { class: 'step' },
        el('span', null, c.label),
        el('span', { class: 'muted' }, i <= currentIndex ? formatDateTime(c.reachedAt) || 'reached' : 'not yet'),
      ),
    ),
  );

  return el(
    'div',
    { class: 'crumbs', tabindex: '0', 'aria-label': `Status: ${crumbs[currentIndex]?.label ?? currentKey}` },
    ...crumbs.flatMap((c, i) => {
      const reached = i <= currentIndex;
      const crumb = el(
        'span',
        { class: `crumb ${reached ? 'reached' : ''}` },
        c.label,
        i < crumbs.length - 1 ? el('span', { class: 'sep' }, icon('arrow-right', 14)) : null,
      );
      return [crumb];
    }),
    history,
  );
}
