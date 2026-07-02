import { type JSX } from 'solid-js';

/*
 * The custom SVG icon set (icons.md). Every glyph uses currentColor, so it themes
 * automatically via the surrounding text colour. Directional icons flip under RTL.
 * Glyph size is independent of the interactive hit area (pad the target, not the
 * glyph) — see accessibility.md#touch-targets.
 */

const modules = import.meta.glob('../icons/svg/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const registry: Record<string, string> = {};
for (const path in modules) {
  const name = path.slice(path.lastIndexOf('/') + 1, -4);
  registry[name] = modules[path]!;
}

export type IconName = string;

/** Directional icons flip horizontally under RTL (icons.md#rtl). */
const DIRECTIONAL = new Set([
  'arrow-left',
  'arrow-right',
  'chevron-down',
  'chevrons-down',
  'rewind',
  'external-link',
]);

export interface IconProps {
  name: IconName;
  size?: number;
  class?: string;
  /** Accessible label; when omitted the icon is decorative (aria-hidden). */
  label?: string;
  style?: JSX.CSSProperties;
}

export function Icon(props: IconProps): JSX.Element {
  const svg = () => registry[props.name] ?? '';
  const size = () => props.size ?? 20;
  return (
    <span
      class={`icon${props.class ? ` ${props.class}` : ''}${DIRECTIONAL.has(props.name) ? ' icon-directional' : ''}`}
      role={props.label ? 'img' : undefined}
      aria-label={props.label}
      aria-hidden={props.label ? undefined : 'true'}
      style={{ width: `${size()}px`, height: `${size()}px`, ...props.style }}
      innerHTML={svg()}
    />
  );
}

export function hasIcon(name: string): boolean {
  return name in registry;
}
