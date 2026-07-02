/** A debounced function that can be flushed (run the pending call now) or cancelled. */
export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  flush(): void;
  cancel(): void;
  pending(): boolean;
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: A | undefined;

  const run = () => {
    timer = undefined;
    if (lastArgs) {
      const args = lastArgs;
      lastArgs = undefined;
      fn(...args);
    }
  };

  const d = ((...args: A) => {
    lastArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, wait);
  }) as Debounced<A>;

  d.flush = () => {
    if (timer) {
      clearTimeout(timer);
      run();
    }
  };
  d.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    lastArgs = undefined;
  };
  d.pending = () => timer !== undefined;
  return d;
}
