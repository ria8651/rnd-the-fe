// Toasts, announced via a polite live region (accessibility.md#screen-readers).
// Used for transient notices like "no lines to finalise" (S5) and save results.

import { el } from '../framework/dom.ts';
import { icon } from './icon.ts';

type ToastKind = 'success' | 'error' | 'info' | 'warning';

let container: HTMLElement | null = null;

function ensureContainer(): HTMLElement {
  if (container) return container;
  container = el('div', {
    class: 'toast-region',
    role: 'status',
    'aria-live': 'polite',
    style: {
      position: 'fixed',
      bottom: '72px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: '1000',
      alignItems: 'center',
    },
  });
  document.body.appendChild(container);
  return container;
}

const ICON: Record<ToastKind, string> = {
  success: 'check-circle',
  error: 'circle-alert',
  info: 'info',
  warning: 'alert',
};

export function toast(message: string, kind: ToastKind = 'info', ms = 4000): void {
  const host = ensureContainer();
  const node = el(
    'div',
    {
      class: `toast toast-${kind}`,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        borderRadius: 'var(--radius-control)',
        background: 'var(--surface-raised)',
        color: 'var(--text-primary)',
        boxShadow: 'var(--elevation-overlay)',
        borderLeft: `4px solid var(--state-${kind}-main)`,
        maxWidth: '480px',
      },
    },
    icon(ICON[kind], 18),
    el('span', null, message),
  );
  host.appendChild(node);
  setTimeout(() => node.remove(), ms);
}
