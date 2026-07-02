import { type JSX } from 'solid-js';

/*
 * Status badge — colour + label together, never colour alone
 * (accessibility.md#colour-independence).
 */

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

export function StatusBadge(props: { label: string; tone?: Tone }): JSX.Element {
  return <span class={`badge badge-${props.tone ?? 'neutral'}`}>{props.label}</span>;
}
