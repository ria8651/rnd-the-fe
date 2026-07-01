/**
 * Status badge — always pairs colour with a text label (and optional icon), never colour
 * alone (spec/ui-standards/accessibility.md › Colour independence).
 */
import { type JSX, Show } from 'solid-js';
import { Icon, type IconName } from './Icon';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

export function StatusBadge(props: { label: string; tone?: Tone; icon?: IconName }): JSX.Element {
  return (
    <span class={`badge badge--${props.tone ?? 'neutral'}`}>
      <Show when={props.icon}>
        <Icon name={props.icon!} size={12} />
      </Show>
      {props.label}
    </span>
  );
}
