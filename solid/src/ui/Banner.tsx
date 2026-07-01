/**
 * Whole-record message banner (spec/stocktakes/05-ui-surface.md › S5 error surfaces, and
 * the status/lock messaging). Explains why editing is blocked, etc. Colour + icon + text.
 */
import { type JSX } from 'solid-js';
import { Icon, type IconName } from './Icon';

export function Banner(props: { tone?: 'info' | 'warning' | 'error'; icon?: IconName; children: JSX.Element }): JSX.Element {
  const tone = () => props.tone ?? 'info';
  const icon = (): IconName => props.icon ?? (tone() === 'error' ? 'circle-alert' : tone() === 'warning' ? 'alert' : 'info');
  return (
    <div class={`banner banner--${tone()}`} role={tone() === 'error' ? 'alert' : 'status'}>
      <Icon name={icon()} size={18} />
      <span>{props.children}</span>
    </div>
  );
}
