import { type JSX, Show, splitProps } from 'solid-js';
import { Icon, type IconName } from './Icon';

/*
 * Buttons (controls.md#buttons). Variants: primary (one per view), secondary,
 * ghost, destructive. Destructive reads as dangerous via a red (error) icon on an
 * otherwise-neutral button, never colour alone. A busy button shows progress and
 * is non-interactive. Icon-only buttons require an accessible label. All buttons
 * share the theme's single button radius.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export interface ButtonProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  icon?: IconName;
  label?: string;
  busy?: boolean;
  compact?: boolean;
  /** Accessible label for an icon-only button. */
  'aria-label'?: string;
}

export function Button(props: ButtonProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    'variant',
    'icon',
    'label',
    'busy',
    'compact',
    'class',
    'disabled',
  ]);
  const variant = () => local.variant ?? 'secondary';
  const iconOnly = () => !local.label;
  return (
    <button
      type="button"
      {...rest}
      class={`btn btn-${variant()}${local.compact ? ' btn-compact' : ''}${
        iconOnly() ? ' btn-icon-only' : ''
      }${local.busy ? ' btn-busy' : ''}${local.class ? ` ${local.class}` : ''}`}
      disabled={local.disabled || local.busy}
      aria-busy={local.busy ? 'true' : undefined}
    >
      <Show when={local.busy}>
        <span class="btn-spinner" aria-hidden="true" />
      </Show>
      <Show when={local.icon && !local.busy}>
        <Icon name={local.icon!} size={local.compact ? 16 : 20} />
      </Show>
      <Show when={local.label}>
        <span class="btn-label">{local.label}</span>
      </Show>
    </button>
  );
}
