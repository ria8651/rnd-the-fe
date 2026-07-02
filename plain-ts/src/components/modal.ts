import { h } from '../core/dom';
import { icon } from '../icons';
import { button } from './button';

export interface ModalController {
  close: () => void;
}

export interface OpenModalOpts {
  dismissable?: boolean; // scrim click / Escape closes (default true)
  onClose?: () => void;
  /** Guard invoked before a dismiss; return false to veto (unsaved-changes). */
  beforeClose?: () => boolean;
}

export function openModal(render: (close: () => void) => HTMLElement, opts: OpenModalOpts = {}): ModalController {
  const trigger = document.activeElement as HTMLElement | null;
  const dismissable = opts.dismissable ?? true;

  const scrim = h('div', { class: 'scrim', role: 'dialog', 'aria-modal': 'true' });
  let closed = false;
  const close = () => {
    if (closed) return;
    if (opts.beforeClose && opts.beforeClose() === false) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    scrim.remove();
    opts.onClose?.();
    if (trigger && document.body.contains(trigger)) trigger.focus();
  };

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && dismissable) {
      e.stopPropagation();
      close();
    }
  }

  scrim.addEventListener('mousedown', (e) => {
    if (e.target === scrim && dismissable) close();
  });

  scrim.appendChild(render(close));
  document.body.appendChild(scrim);
  document.addEventListener('keydown', onKey, true);

  const focusable = scrim.querySelector<HTMLElement>('input, button, textarea, select, [tabindex]');
  focusable?.focus();

  return { close };
}

export interface ModalShellOpts {
  title: string;
  body: HTMLElement;
  footer?: HTMLElement;
  size?: 'sm' | 'default';
  close: () => void;
}

export function modalShell(opts: ModalShellOpts): HTMLElement {
  return h(
    'div',
    { class: `modal${opts.size === 'sm' ? ' modal--sm' : ''}` },
    h(
      'div',
      { class: 'modal__header' },
      h('h2', { class: 'modal__title' }, opts.title),
      h('button', { class: 'iconbtn', 'aria-label': 'Close', onclick: opts.close }, icon('close')),
    ),
    h('div', { class: 'modal__body' }, opts.body),
    opts.footer ? h('div', { class: 'modal__footer' }, opts.footer) : null,
  );
}

export interface ConfirmOpts {
  title: string;
  message?: string | HTMLElement;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Optional extra content (e.g. a reason selector) shown above the buttons. */
  content?: HTMLElement;
  /** Confirm disabled until this returns true (re-evaluated by caller via re-render). */
  onConfirm: () => void | Promise<void>;
}

export function confirmDialog(opts: ConfirmOpts): ModalController {
  return openModal((close) => {
    const body = h(
      'div',
      { class: 'stack' },
      typeof opts.message === 'string' ? h('p', { style: { margin: '0' } }, opts.message) : opts.message ?? null,
      opts.content ?? null,
    );
    const footer = h(
      'div',
      { class: 'row' },
      button({ label: opts.cancelLabel ?? 'Cancel', variant: 'secondary', onClick: close, shortcut: 'Escape' }),
      button({
        label: opts.confirmLabel ?? 'Confirm',
        variant: opts.danger ? 'destructive' : 'primary',
        onClick: async () => {
          await opts.onConfirm();
          close();
        },
      }),
    );
    return modalShell({ title: opts.title, body, footer, size: 'sm', close });
  });
}
