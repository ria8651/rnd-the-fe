// Hyperscript-style DOM builder with reactivity. Children/attrs may be plain
// values or `() => value` thunks; thunks are wrapped in effects so the DOM
// updates when the signals they read change.

import { effect } from './signal.ts';

export type Child =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | (() => Child)
  | Child[];

type Thunk<T> = () => T;

export interface Props {
  class?: string | Thunk<string>;
  style?: Partial<CSSStyleDeclaration> | Thunk<Partial<CSSStyleDeclaration>>;
  // Any DOM attribute; functions become reactive bindings.
  [key: string]: unknown;
}

const isThunk = (v: unknown): v is Thunk<unknown> => typeof v === 'function';

function appendChild(parent: Node, child: Child): void {
  if (child == null || child === false || child === true) return;

  if (Array.isArray(child)) {
    for (const c of child) appendChild(parent, c);
    return;
  }

  if (child instanceof Node) {
    parent.appendChild(child);
    return;
  }

  if (isThunk(child)) {
    // Reactive region: an anchor comment marks where dynamic content lives.
    const start = document.createComment('');
    const end = document.createComment('');
    parent.appendChild(start);
    parent.appendChild(end);
    let nodes: Node[] = [];
    effect(() => {
      const value = child();
      for (const n of nodes) n.parentNode?.removeChild(n);
      nodes = [];
      const frag = document.createDocumentFragment();
      appendChild(frag, value as Child);
      nodes = Array.from(frag.childNodes);
      end.parentNode?.insertBefore(frag, end);
    });
    return;
  }

  parent.appendChild(document.createTextNode(String(child)));
}

function setAttr(el: HTMLElement, key: string, value: unknown): void {
  if (key === 'class') {
    el.className = (value as string) ?? '';
  } else if (key === 'style' && value && typeof value === 'object') {
    Object.assign(el.style, value);
  } else if (key === 'value' && el instanceof HTMLInputElement) {
    el.value = value == null ? '' : String(value);
  } else if (key === 'checked' && el instanceof HTMLInputElement) {
    el.checked = Boolean(value);
  } else if (key === 'disabled' || key === 'readonly' || key === 'hidden') {
    if (value) el.setAttribute(key, ''); else el.removeAttribute(key);
    // Reflect to property for reliable behaviour.
    (el as unknown as Record<string, unknown>)[key === 'readonly' ? 'readOnly' : key] = Boolean(value);
  } else if (value == null || value === false) {
    el.removeAttribute(key);
  } else if (value === true) {
    el.setAttribute(key, '');
  } else {
    el.setAttribute(key, String(value));
  }
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  if (props) {
    for (const [key, raw] of Object.entries(props)) {
      if (raw == null) continue;

      if (key.startsWith('on') && typeof raw === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), raw as EventListener);
        continue;
      }

      if (isThunk(raw)) {
        effect(() => setAttr(node, key, (raw as Thunk<unknown>)()));
      } else {
        setAttr(node, key, raw);
      }
    }
  }

  for (const child of children) appendChild(node, child);
  return node;
}

/** Render a list reactively, keyed for stable identity. */
export function forEach<T>(
  items: () => T[],
  key: (item: T) => string,
  render: (item: T) => Node,
): () => Node {
  return () => {
    const cache = new Map<string, Node>();
    const frag = document.createDocumentFragment();
    for (const item of items()) {
      const k = key(item);
      let node = cache.get(k);
      if (!node) {
        node = render(item);
        cache.set(k, node);
      }
      frag.appendChild(node);
    }
    return frag;
  };
}

/** Clear a container and mount a node. */
export function mount(container: HTMLElement, node: Node): void {
  container.replaceChildren(node);
}
