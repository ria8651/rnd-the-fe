// Modal dialog + a confirm() helper. Follows controls.md#menus--popovers for
// dismissal (Escape, backdrop) and returns focus to the opener. Uses the
// `overlay` elevation and `surface.scrim` backdrop.

import { el } from '../framework/dom.ts';

export interface DialogHandle {
  close(): void;
  root: HTMLElement;
}

export function openDialog(opts: {
  title: string;
  body: Node;
  footer?: Node;
  width?: number;
  onClose?: () => void;
}): DialogHandle {
  const opener = document.activeElement as HTMLElement | null;

  const panel = el(
    'div',
    {
      class: 'dialog',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': opts.title,
      style: {
        background: 'var(--surface-raised)',
        color: 'var(--text-primary)',
        borderRadius: 'var(--radius-modal)',
        boxShadow: 'var(--elevation-overlay)',
        width: `${opts.width ?? 480}px`,
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      },
    },
    el(
      'div',
      { style: { padding: '16px 24px', borderBottom: '1px solid var(--border-default)' } },
      el('h2', null, opts.title),
    ),
    el('div', { style: { padding: '24px', overflow: 'auto' } }, opts.body),
    opts.footer
      ? el(
          'div',
          {
            style: {
              padding: '16px 24px',
              borderTop: '1px solid var(--border-default)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
            },
          },
          opts.footer,
        )
      : null,
  );

  const backdrop = el(
    'div',
    {
      class: 'dialog-backdrop',
      style: {
        position: 'fixed',
        inset: '0',
        background: 'var(--surface-scrim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '900',
      },
    },
    panel,
  );

  const close = () => {
    document.removeEventListener('keydown', onKey);
    backdrop.remove();
    opts.onClose?.();
    opener?.focus?.();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };

  backdrop.addEventListener('mousedown', (e) => {
    if (e.target === backdrop) close();
  });
  document.addEventListener('keydown', onKey);

  document.body.appendChild(backdrop);
  // Focus the first focusable control in the dialog.
  requestAnimationFrame(() => {
    const focusable = panel.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    (focusable ?? panel).focus();
  });

  return { close, root: panel };
}

export function confirmDialog(opts: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      handle.close();
      resolve(value);
    };

    const confirmBtn = el(
      'button',
      { class: `btn ${opts.destructive ? 'btn-destructive' : 'btn-primary'}`, onclick: () => finish(true) },
      opts.confirmLabel ?? 'Confirm',
    );
    const cancelBtn = el(
      'button',
      { class: 'btn btn-secondary', onclick: () => finish(false) },
      opts.cancelLabel ?? 'Cancel',
    );

    const handle = openDialog({
      title: opts.title,
      body: el('p', { style: { margin: '0' } }, opts.message),
      footer: el('div', { style: { display: 'contents' } }, cancelBtn, confirmBtn),
      onClose: () => finish(false),
    });
  });
}
