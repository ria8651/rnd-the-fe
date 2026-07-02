// Debounced auto-save for in-place fields (spec ui-standards/inputs.md › editing & saving,
// divergence D1 / AC-E7). Coalesces rapid edits into one write; a still-pending write is
// FLUSHED immediately on blur / teardown / navigation / refresh — never dropped.

export type Autosaver<T> = {
  /** Queue a value to be written after the debounce interval. */
  queue: (value: T) => void;
  /** Commit any pending write now (call on blur, destroy, beforeunload). */
  flush: () => void;
  /** Cancel a pending write without saving (e.g. after rollback). */
  cancel: () => void;
};

export function createAutosaver<T>(
  write: (value: T) => Promise<void> | void,
  delay = 1000,
): Autosaver<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { value: T } | null = null;

  const commit = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (pending) {
      const { value } = pending;
      pending = null;
      void write(value);
    }
  };

  return {
    queue(value: T) {
      pending = { value };
      if (timer) clearTimeout(timer);
      timer = setTimeout(commit, delay);
    },
    flush: commit,
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      pending = null;
    },
  };
}

// Register global flush-on-leave so pending writes survive a hard refresh/tab close.
const registry = new Set<() => void>();

export function registerFlush(flush: () => void): () => void {
  registry.add(flush);
  return () => registry.delete(flush);
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => registry.forEach((f) => f()));
  // pagehide covers mobile / bfcache teardown that beforeunload can miss.
  window.addEventListener('pagehide', () => registry.forEach((f) => f()));
}
