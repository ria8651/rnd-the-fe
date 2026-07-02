import { createSignal, onCleanup, type Accessor } from 'solid-js';
import { debounce } from './debounce';

/*
 * In-place field auto-save (inputs.md#in-place-fields-auto-save, divergence D1 / AC-E7):
 *  - optimistic: the field shows the new value immediately;
 *  - debounced write (~1000ms) so rapid typing yields one write;
 *  - leaving mid-edit FLUSHES the pending write immediately — never dropped;
 *  - rollback on failure, surfacing the error;
 *  - re-sync with the server's canonical value on success.
 *
 * View teardown (onCleanup) and blur both flush, covering navigation/refresh.
 */

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export interface Autosave<T> {
  value: Accessor<T>;
  status: Accessor<SaveStatus>;
  error: Accessor<string | undefined>;
  /** Optimistically set + schedule a debounced write. */
  set: (next: T) => void;
  /** Commit any pending write now (call on blur). */
  flush: () => void;
  /** Replace the baseline (e.g. after an external refetch) with no write. */
  sync: (next: T) => void;
}

export function createAutosave<T>(
  initial: T,
  save: (value: T) => Promise<void>,
  wait = 1000,
): Autosave<T> {
  const [value, setValue] = createSignal<T>(initial);
  const [status, setStatus] = createSignal<SaveStatus>('idle');
  const [error, setError] = createSignal<string | undefined>();
  let saved = initial; // last value confirmed persisted (or baseline)

  const commit = debounce((next: T) => {
    setStatus('saving');
    setError(undefined);
    save(next)
      .then(() => {
        saved = next;
        setStatus('saved');
      })
      .catch((e) => {
        // Rollback to the last saved value and surface the error.
        setValue(() => saved);
        setError(e?.message ?? 'Save failed');
        setStatus('error');
      });
  }, wait);

  onCleanup(() => commit.flush());

  return {
    value,
    status,
    error,
    set: (next: T) => {
      setValue(() => next);
      setStatus('pending');
      commit(next);
    },
    flush: () => commit.flush(),
    sync: (next: T) => {
      saved = next;
      setValue(() => next);
      if (!commit.pending()) setStatus('idle');
    },
  };
}
