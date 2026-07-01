/**
 * Debounced in-place saver (spec/ui-standards/inputs.md › In-place fields; divergence D1,
 * AC-E6/E7). Coalesces rapid edits into one write after an idle interval, and — crucially —
 * **flushes any pending write immediately** on blur, on view teardown/navigation
 * (`onCleanup`), and on page refresh (`beforeunload`), so an in-place edit is never lost.
 *
 * The optimistic display and rollback-on-failure live at the call site (it owns the value);
 * this helper owns only the debounce + guaranteed-flush behaviour. Must be created within a
 * component/owner scope so `onCleanup` is registered.
 */
import { onCleanup } from 'solid-js';

export interface Autosave<T> {
  /** Record an edit; the write fires after the idle interval unless flushed sooner. */
  schedule: (value: T) => void;
  /** Commit any pending write now (call from onBlur). No-op when nothing is pending. */
  flush: () => void;
  /** Discard any pending write without saving. */
  cancel: () => void;
}

export function createAutosave<T>(save: (value: T) => void, delayMs = 1000): Autosave<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: { value: T } | null = null;

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };
  const flush = () => {
    if (!pending) return;
    const { value } = pending;
    pending = null;
    clear();
    save(value);
  };
  const schedule = (value: T) => {
    pending = { value };
    clear();
    timer = setTimeout(flush, delayMs);
  };
  const cancel = () => {
    pending = null;
    clear();
  };

  // Flush on refresh/tab-close.
  const onBeforeUnload = () => flush();
  if (typeof window !== 'undefined') window.addEventListener('beforeunload', onBeforeUnload);

  // Flush on teardown / navigation away (AC-E7).
  onCleanup(() => {
    if (typeof window !== 'undefined') window.removeEventListener('beforeunload', onBeforeUnload);
    flush();
  });

  return { schedule, flush, cancel };
}
