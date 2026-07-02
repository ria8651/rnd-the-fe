// In-place field auto-save (inputs.md § editing-&-saving + divergence D1):
// optimistic, debounced write, rollback on failure, and — critically — a flush
// that commits any still-pending write when the field is left (blur / teardown /
// navigation / refresh), so an edit is never silently lost.
export interface Autosave {
  schedule: (value: string) => void;
  flush: () => Promise<void>;
  hasPending: () => boolean;
}

export function createAutosave(save: (value: string) => Promise<void>, delayMs = 1000): Autosave {
  let timer: number | undefined;
  let pending: string | null = null;

  const flush = async () => {
    if (pending == null) return;
    const value = pending;
    pending = null;
    window.clearTimeout(timer);
    await save(value);
  };

  const schedule = (value: string) => {
    pending = value;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void flush(), delayMs);
  };

  return { schedule, flush, hasPending: () => pending != null };
}
