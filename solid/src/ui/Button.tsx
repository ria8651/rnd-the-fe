/**
 * Button (spec/ui-standards/controls.md › Buttons). Variants: primary / secondary / ghost /
 * danger. At most one primary per view. Prefer disabled-with-explanation over hiding. When
 * `href` is set it renders a client-side router link. Icon-only buttons must pass an
 * `aria-label` (a11y).
 */
import { type JSX, Show, splitProps } from 'solid-js';
import { A } from '@solidjs/router';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps {
  variant?: Variant;
  type?: 'button' | 'submit';
  href?: string;
  disabled?: boolean;
  compact?: boolean;
  block?: boolean;
  /** Optional leading icon glyph. */
  icon?: IconName;
  title?: string;
  'aria-label'?: string;
  busy?: boolean;
  onClick?: (e: MouseEvent) => void;
  children?: JSX.Element;
}

export function Button(props: ButtonProps): JSX.Element {
  const [, rest] = splitProps(props, [
    'variant',
    'type',
    'href',
    'disabled',
    'compact',
    'block',
    'icon',
    'busy',
    'onClick',
    'children'
  ]);
  const cls = () =>
    [
      'btn',
      `btn--${props.variant ?? 'secondary'}`,
      props.compact ? 'btn--compact' : '',
      props.block ? 'btn--block' : ''
    ]
      .filter(Boolean)
      .join(' ');

  const inner = (
    <>
      <Show when={props.busy}>
        <span class="spinner" aria-hidden="true" style={{ width: '16px', height: '16px' }} />
      </Show>
      <Show when={props.icon && !props.busy}>
        <Icon name={props.icon!} size={16} />
      </Show>
      {props.children}
    </>
  );

  return (
    <Show
      when={props.href && !props.disabled}
      fallback={
        <button
          class={cls()}
          type={props.type ?? 'button'}
          disabled={props.disabled || props.busy}
          onClick={(e) => props.onClick?.(e)}
          {...rest}
        >
          {inner}
        </button>
      }
    >
      <A class={cls()} href={props.href!} {...rest}>
        {inner}
      </A>
    </Show>
  );
}

export interface IconButtonProps {
  icon: IconName;
  label: string;
  onClick?: (e: MouseEvent) => void;
  disabled?: boolean;
  /** Text shown next to the glyph (turns it into a labelled pill). */
  text?: string;
  /** Low-emphasis variant: no surface/shadow, secondary glyph. */
  plain?: boolean;
  size?: number;
  href?: string;
}

/** Icon-only (or icon+text) action button — pill surface, themed glyph, 48×48 hit area. */
export function IconButton(props: IconButtonProps): JSX.Element {
  const cls = () =>
    ['icon-btn', props.text ? 'icon-btn--labelled' : '', props.plain ? 'icon-btn--plain' : ''].filter(Boolean).join(' ');
  const inner = (
    <>
      <Icon name={props.icon} size={props.size ?? 20} />
      <Show when={props.text}>
        <span>{props.text}</span>
      </Show>
    </>
  );
  return (
    <Show
      when={props.href && !props.disabled}
      fallback={
        <button class={cls()} type="button" aria-label={props.label} title={props.label} disabled={props.disabled} onClick={(e) => props.onClick?.(e)}>
          {inner}
        </button>
      }
    >
      <A class={cls()} href={props.href!} aria-label={props.label} title={props.label}>
        {inner}
      </A>
    </Show>
  );
}
