import { useMemo, type CSSProperties } from 'react';

/**
 * The custom icon set from spec/ui-standards/icons.md, rendered as inline SVG.
 * Every glyph draws with `currentColor`, so it themes automatically by inheriting
 * the surrounding text colour — never hard-code an icon colour (icons.md).
 *
 * The raw SVGs carry a viewBox but no width/height, so we scale via the wrapper.
 * Directional icons flip under RTL (icons.md#rtl).
 */

// Eagerly load every SVG as a raw string, keyed by icon name.
const modules = import.meta.glob('../assets/icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const rawByName: Record<string, string> = {};
for (const [path, raw] of Object.entries(modules)) {
  const name = path.split('/').pop()!.replace('.svg', '');
  rawByName[name] = raw;
}

export type IconName = string;

// Icons that point in a reading direction and must mirror under RTL.
const DIRECTIONAL = new Set([
  'arrow-left',
  'arrow-right',
  'chevron-down', // included for completeness; visually symmetric vertically
  'external-link',
  'rewind',
]);

/** All available icon names (for tooling / sanity checks). */
export const iconNames = Object.keys(rawByName).sort();

export interface IconProps {
  name: IconName;
  /** Glyph size in px. 16 dense/inline, 20 default, 24 nav (icons.md#sizing). */
  size?: number;
  className?: string;
  style?: CSSProperties;
  /** Decorative by default (aria-hidden). Provide a title to expose a label. */
  title?: string;
}

export function Icon({ name, size = 20, className, style, title }: IconProps) {
  const raw = rawByName[name];

  const html = useMemo(() => {
    if (!raw) return '';
    // Strip the outer <svg ...> attributes we control and inline a title for a11y.
    let svg = raw;
    if (title) {
      svg = svg.replace(/<svg([^>]*)>/, `<svg$1 role="img"><title>${title}</title>`);
    }
    return svg;
  }, [raw, title]);

  if (!raw) {
    if (import.meta.env.DEV) console.warn(`[Icon] unknown icon: "${name}"`);
    return null;
  }

  return (
    <span
      className={`oms-icon${className ? ` ${className}` : ''}${
        DIRECTIONAL.has(name) ? ' oms-icon--directional' : ''
      }`}
      aria-hidden={title ? undefined : true}
      style={{ width: size, height: size, ...style }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
