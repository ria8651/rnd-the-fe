import { h } from '../core/dom';
import { icon } from '../icons';

let root: HTMLElement | null = null;
function getRoot(): HTMLElement {
  if (!root) {
    root = h('div', { class: 'toast-root', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(root);
  }
  return root;
}

export type ToastType = 'info' | 'success' | 'error';

export function toast(message: string, type: ToastType = 'info', durationMs = 4000) {
  const iconName = type === 'error' ? 'circle-alert' : type === 'success' ? 'check-circle' : 'info-outline';
  const el = h('div', { class: `toast toast--${type}` }, icon(iconName), h('span', null, message));
  getRoot().appendChild(el);
  setTimeout(() => el.remove(), durationMs);
}
