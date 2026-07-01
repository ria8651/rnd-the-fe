// Icon helper. The actual SVG assets are the ones the spec ships
// (../../spec/ui-standards/icons/), copied into src/assets/icons. They use
// `fill/stroke="currentColor"`, so colour follows the surrounding text colour.

import { el } from '../framework/dom.ts';

const modules = import.meta.glob('../assets/icons/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const registry: Record<string, string> = {};
for (const [path, raw] of Object.entries(modules)) {
  const name = path.split('/').pop()!.replace('.svg', '');
  registry[name] = raw;
}

export type IconName = keyof typeof registry | string;

/** Render an icon at a given pixel size, with an accessible label if provided. */
export function icon(name: IconName, size = 20, label?: string): HTMLElement {
  const raw = registry[name] ?? '';
  const span = el('span', {
    class: 'icon',
    style: {
      display: 'inline-flex',
      width: `${size}px`,
      height: `${size}px`,
      flex: '0 0 auto',
    },
    'aria-hidden': label ? undefined : 'true',
    'aria-label': label,
    role: label ? 'img' : undefined,
  });
  span.innerHTML = raw;
  const svg = span.querySelector('svg');
  if (svg) {
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
  }
  return span;
}
