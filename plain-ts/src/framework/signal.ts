// A minimal reactive core: signals, computeds, and effects with automatic
// dependency tracking. No framework — just enough to drive fine-grained DOM
// updates. Inspired by the common "signals" model.

let currentEffect: EffectRunner | null = null;

class EffectRunner {
  private deps = new Set<Set<EffectRunner>>();
  private cleanup: (() => void) | void = undefined;
  private active = true;

  constructor(private fn: () => void | (() => void)) {
    this.run();
  }

  run() {
    if (!this.active) return;
    this.dispose(false);
    // Save/restore the previous tracking context locally (not via a global
    // stack) so `untrack` composes correctly: a child effect running inside an
    // untracked region restores tracking to *null*, not to an outer effect.
    const prev = currentEffect;
    currentEffect = this;
    try {
      this.cleanup = this.fn();
    } finally {
      currentEffect = prev;
    }
  }

  track(subs: Set<EffectRunner>) {
    subs.add(this);
    this.deps.add(subs);
  }

  private dispose(deactivate = true) {
    if (typeof this.cleanup === 'function') this.cleanup();
    this.cleanup = undefined;
    for (const dep of this.deps) dep.delete(this);
    this.deps.clear();
    if (deactivate) this.active = false;
  }

  stop() {
    this.dispose(true);
  }
}

export interface ReadSignal<T> {
  (): T;
  get(): T;
}

export interface Signal<T> extends ReadSignal<T> {
  set(value: T): void;
  update(fn: (prev: T) => T): void;
}

export function signal<T>(initial: T, equals: (a: T, b: T) => boolean = Object.is): Signal<T> {
  let value = initial;
  const subs = new Set<EffectRunner>();

  const read = (() => {
    if (currentEffect) currentEffect.track(subs);
    return value;
  }) as Signal<T>;

  read.get = read;
  read.set = (next: T) => {
    if (equals(value, next)) return;
    value = next;
    // Copy to avoid mutation-during-iteration when effects re-subscribe.
    for (const sub of [...subs]) sub.run();
  };
  read.update = (fn: (prev: T) => T) => read.set(fn(value));

  return read;
}

export function computed<T>(fn: () => T): ReadSignal<T> {
  const s = signal<T>(undefined as unknown as T);
  effect(() => s.set(fn()));
  const read = (() => s()) as ReadSignal<T>;
  read.get = read;
  return read;
}

export function effect(fn: () => void | (() => void)): () => void {
  const runner = new EffectRunner(fn);
  return () => runner.stop();
}

/** Read a signal without subscribing the current effect to it. */
export function untrack<T>(fn: () => T): T {
  const prev = currentEffect;
  currentEffect = null;
  try {
    return fn();
  } finally {
    currentEffect = prev;
  }
}
