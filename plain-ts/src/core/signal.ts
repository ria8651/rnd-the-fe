// Minimal fine-grained reactivity — no framework, plain TS.
// signal() holds state; effect() re-runs when the signals it read change;
// computed() is a cached derived signal. Dependencies are tracked dynamically.

export type Getter<T> = () => T;
export type Setter<T> = (next: T | ((prev: T) => T)) => void;

interface Reaction {
  run: () => void;
  deps: Set<Set<Reaction>>;
  cleanups: Array<() => void>;
}

let active: Reaction | null = null;
let batchDepth = 0;
const pending = new Set<Reaction>();

function unsubscribe(r: Reaction) {
  for (const dep of r.deps) dep.delete(r);
  r.deps.clear();
  for (const c of r.cleanups.splice(0)) c();
}

function runReaction(r: Reaction) {
  unsubscribe(r);
  const prev = active;
  active = r;
  try {
    r.run();
  } finally {
    active = prev;
  }
}

function schedule(r: Reaction) {
  if (batchDepth > 0) {
    pending.add(r);
  } else {
    runReaction(r);
  }
}

export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      const toRun = [...pending];
      pending.clear();
      for (const r of toRun) runReaction(r);
    }
  }
}

export function signal<T>(value: T): [Getter<T>, Setter<T>] {
  const subs = new Set<Reaction>();
  const get: Getter<T> = () => {
    if (active) {
      subs.add(active);
      active.deps.add(subs);
    }
    return value;
  };
  const set: Setter<T> = (next) => {
    const v = typeof next === 'function' ? (next as (p: T) => T)(value) : next;
    if (Object.is(v, value)) return;
    value = v;
    for (const r of [...subs]) schedule(r);
  };
  return [get, set];
}

/** Register a cleanup that runs before the current effect re-runs or is disposed. */
export function onCleanup(fn: () => void): void {
  if (active) active.cleanups.push(fn);
}

export function effect(fn: () => void): () => void {
  const r: Reaction = { run: fn, deps: new Set(), cleanups: [] };
  const dispose = () => unsubscribe(r);
  // Ownership: a nested effect is disposed when its parent re-runs or disposes,
  // giving a Solid-like reactive ownership tree so structural swaps don't leak.
  if (active) active.cleanups.push(dispose);
  runReaction(r);
  return dispose;
}

export function computed<T>(fn: () => T): Getter<T> {
  const [get, set] = signal<T>(undefined as T);
  let initialised = false;
  effect(() => {
    const v = fn();
    if (!initialised) {
      initialised = true;
      // set() below no-ops if equal, so seed directly first time
    }
    set(v);
  });
  return get;
}

/** Read a value that may be a plain value or a getter. */
export function read<T>(v: T | Getter<T>): T {
  return typeof v === 'function' ? (v as Getter<T>)() : v;
}
export type MaybeReactive<T> = T | Getter<T>;
