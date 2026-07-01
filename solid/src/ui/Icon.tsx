/**
 * Renders an icon from the spec's custom SVG set (spec/ui-standards/icons.md), snapshotted
 * into src/icons/svg via `pnpm icons`. Every glyph uses `currentColor`, so it themes
 * automatically from the surrounding text colour. Directional icons flip under RTL.
 */
import { type JSX, createMemo } from 'solid-js';
import { i18n } from '../state/i18n';

// Eagerly inline every icon SVG as a raw string (they are tiny and used throughout).
const svgs = import.meta.glob('../icons/svg/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

export type IconName = string;

export interface IconProps {
  name: IconName;
  /** Glyph size in px (icons.md: 16 inline, 20 default, 24 nav). */
  size?: number;
  /** Accessible label; omit for a decorative icon (then aria-hidden). */
  label?: string;
  /** Directional icons (arrows/chevrons) flip under RTL (icons.md › RTL). */
  flipRtl?: boolean;
  class?: string;
}

export function Icon(props: IconProps): JSX.Element {
  const svg = createMemo(() => svgs[`../icons/svg/${props.name}.svg`]);
  const flip = createMemo(() => props.flipRtl && i18n.rtl);
  const size = () => props.size ?? 20;
  return (
    <span
      class={`icon${flip() ? ' icon--flip' : ''}${props.class ? ' ' + props.class : ''}`}
      style={{ width: `${size()}px`, height: `${size()}px` }}
      role={props.label ? 'img' : undefined}
      aria-label={props.label}
      aria-hidden={props.label ? undefined : 'true'}
      innerHTML={svg() ?? ''}
    />
  );
}
