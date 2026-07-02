import { h, when } from '../core/dom';
import { icon } from '../icons';
import { signal, type Getter } from '../core/signal';
import { formatDateTime } from '../core/format';

export interface CrumbStep {
  key: string;
  label: string;
  reachedAt?: Getter<string | null | undefined>;
}

export interface CrumbsOpts {
  steps: CrumbStep[];
  /** Current status key (the last reached one). */
  current: Getter<string>;
}

// Read-only lifecycle indicator (controls.md § status-crumbs). Reached statuses
// are emphasised; state is position + text, never colour alone. Revealing the
// crumbs (hover / focus) shows when each status was reached.
export function statusCrumbs(opts: CrumbsOpts): HTMLElement {
  const [showGet, showSet] = signal(false);
  const currentIndex = () => opts.steps.findIndex((s) => s.key === opts.current());

  const crumbRow = h(
    'div',
    { class: 'row', style: { gap: '4px' } },
    ...opts.steps.flatMap((step, i) => {
      const reached = () => i <= currentIndex();
      const crumb = h('span', { class: () => `crumbs__step${reached() ? ' reached' : ''}` }, step.label);
      const sep = i < opts.steps.length - 1 ? h('span', { class: 'crumbs__sep' }, icon('arrow-right', { size: 16 })) : null;
      return sep ? [crumb, sep] : [crumb];
    }),
  );

  const history = when(showGet, () =>
    h(
      'div',
      { class: 'crumbs__history', role: 'tooltip' },
      ...opts.steps.map((step) => {
        const at = step.reachedAt?.();
        return h('div', null, `${step.label}: ${at ? formatDateTime(at) : '—'}`);
      }),
    ),
  );

  return h(
    'div',
    {
      class: 'crumbs',
      tabindex: '0',
      role: 'group',
      'aria-label': () => `Status: ${opts.steps[currentIndex()]?.label ?? ''}`,
      onmouseenter: () => showSet(true),
      onmouseleave: () => showSet(false),
      onfocus: () => showSet(true),
      onblur: () => showSet(false),
      onclick: () => showSet((v) => !v),
    },
    crumbRow,
    history,
  );
}
