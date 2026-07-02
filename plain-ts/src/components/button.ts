import { h } from '../core/dom';
import { icon } from '../icons';
import { type Getter, type MaybeReactive, read } from '../core/signal';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export interface ButtonOpts {
  label: string;
  icon?: string;
  variant?: ButtonVariant;
  compact?: boolean;
  onClick?: (e: MouseEvent) => void;
  disabled?: MaybeReactive<boolean>;
  busy?: Getter<boolean>;
  title?: string;
  shortcut?: string; // announced to AT, e.g. "Alt+S"
  type?: 'button' | 'submit';
}

export function button(opts: ButtonOpts): HTMLElement {
  const cls = () => {
    const c = ['btn', `btn--${opts.variant ?? 'ghost'}`];
    if (opts.compact) c.push('btn--compact');
    if (opts.busy?.()) c.push('busy');
    return c.join(' ');
  };
  return h(
    'button',
    {
      type: opts.type ?? 'button',
      class: cls,
      disabled: typeof opts.disabled === 'function' ? opts.disabled : opts.disabled ?? false,
      title: opts.title,
      'aria-keyshortcuts': opts.shortcut,
      onclick: (e: MouseEvent) => {
        if (opts.busy?.()) return;
        opts.onClick?.(e);
      },
    },
    () => (opts.busy?.() ? h('span', { class: 'spinner' }) : opts.icon ? icon(opts.icon) : null),
    h('span', null, opts.label),
  );
}

export interface IconButtonOpts {
  icon: string;
  label: string; // accessible label / tooltip
  onClick?: (e: MouseEvent) => void;
  disabled?: MaybeReactive<boolean>;
  danger?: boolean;
  ref?: (el: HTMLElement) => void;
}

export function iconButton(opts: IconButtonOpts): HTMLElement {
  return h('button', {
    type: 'button',
    class: `iconbtn${opts.danger ? ' iconbtn--danger' : ''}`,
    'aria-label': opts.label,
    title: opts.label,
    disabled: typeof opts.disabled === 'function' ? opts.disabled : opts.disabled ?? false,
    onclick: (e: MouseEvent) => {
      if (read(opts.disabled ?? false)) return;
      opts.onClick?.(e);
    },
    ref: opts.ref,
  }, icon(opts.icon));
}
