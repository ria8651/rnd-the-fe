import { type JSX } from 'solid-js';
import type { StocktakeStatus } from '../../api/types';

// Status shown with text + style, never colour alone
// (spec/ui-standards/accessibility.md#colour-independence).
export function StatusBadge(props: { status: StocktakeStatus }): JSX.Element {
  const label = () => (props.status === 'NEW' ? 'New' : 'Finalised');
  const cls = () => (props.status === 'NEW' ? 'badge--new' : 'badge--finalised');
  return <span class={`badge ${cls()}`}>{label()}</span>;
}
