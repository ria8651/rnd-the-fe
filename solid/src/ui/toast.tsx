/**
 * Minimal toast system for transient notices (spec S5 › toast/inline notice, e.g. "no lines
 * to finalise"). A module-level signal holds the active toasts; `<Toaster/>` renders them in
 * a live region and they auto-dismiss. Announced politely for screen readers.
 */
import { type JSX, createSignal, For } from 'solid-js';

export interface Toast {
  id: number;
  message: string;
  tone: 'default' | 'error' | 'success';
}

const [toasts, setToasts] = createSignal<Toast[]>([]);
let nextId = 1;

export function toast(message: string, tone: Toast['tone'] = 'default', ms = 4000): void {
  const id = nextId++;
  setToasts((t) => [...t, { id, message, tone }]);
  if (typeof window !== 'undefined') {
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
  }
}

export function Toaster(): JSX.Element {
  return (
    <div class="toast-wrap" role="status" aria-live="polite">
      <For each={toasts()}>{(t) => <div class={`toast toast--${t.tone}`}>{t.message}</div>}</For>
    </div>
  );
}
