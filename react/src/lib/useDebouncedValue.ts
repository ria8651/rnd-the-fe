import { useEffect, useRef, useState } from 'react';
import { setUnloading } from './graphql';

/** Debounce a value — used to coalesce rapid input into one query (inputs.md#debounced-querying). */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * Debounced auto-save with a guaranteed flush on unmount/leave.
 * Implements the in-place field contract (inputs.md#in-place-fields-auto-save,
 * divergence D1): the debounced write commits once idle, and any still-pending
 * write is flushed immediately on teardown so an edit is never silently lost.
 */
export function useDebouncedSave<T>(save: (value: T) => void, delay = 1000) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ value: T } | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  const flush = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (pending.current) {
      const { value } = pending.current;
      pending.current = null;
      saveRef.current(value);
    }
  };

  const schedule = (value: T) => {
    pending.current = { value };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
  };

  // Flush on unmount (view teardown / navigation) — never drop a pending edit.
  // On page unload the write is sent with keepalive so the browser doesn't drop it.
  useEffect(() => {
    const onHide = () => {
      setUnloading(true);
      flush();
      setUnloading(false);
    };
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
      flush(); // component teardown / route change — normal fetch is fine here
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { schedule, flush };
}
