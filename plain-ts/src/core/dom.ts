// Tiny reactive DOM helper. h() builds elements; children/attrs may be
// getters (functions) and are bound via effects so they update in place.
import { effect, type Getter } from './signal';

type ChildFn = () => Child;
interface ChildArray extends Array<Child> {}
export type Child = Node | string | number | boolean | null | undefined | ChildFn | ChildArray;

type StyleMap = Partial<Record<string, string | number | Getter<string | number | null | undefined> | null | undefined>>;

export interface Props {
  class?: string | Getter<string>;
  style?: StyleMap;
  dataset?: Record<string, string | Getter<string>>;
  [key: string]: unknown;
}

function isGetter(v: unknown): v is Getter<unknown> {
  return typeof v === 'function';
}

function applyProp(el: HTMLElement, key: string, value: unknown) {
  if (value == null || value === false) {
    el.removeAttribute(key);
    return;
  }
  if (value === true) {
    el.setAttribute(key, '');
    return;
  }
  // aria-*, data-*, role, and most HTML attrs go through setAttribute; but
  // form-value/props like `value`, `checked`, `disabled` are set as properties.
  if (key === 'value' || key === 'checked' || key === 'disabled' || key === 'selected' || key === 'indeterminate') {
    (el as unknown as Record<string, unknown>)[key] = value;
  } else {
    el.setAttribute(key, String(value));
  }
}

export function h(tag: string, props?: Props | null, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value == null) continue;
      if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
      } else if (key === 'class') {
        if (isGetter(value)) effect(() => (el.className = String(value()) || ''));
        else el.className = String(value);
      } else if (key === 'style' && typeof value === 'object') {
        for (const [prop, v] of Object.entries(value as StyleMap)) {
          if (isGetter(v)) {
            effect(() => el.style.setProperty(prop, v() == null ? '' : String(v())));
          } else if (v != null) {
            el.style.setProperty(prop, String(v));
          }
        }
      } else if (key === 'dataset' && typeof value === 'object') {
        for (const [prop, v] of Object.entries(value as Record<string, string | Getter<string>>)) {
          if (isGetter(v)) effect(() => (el.dataset[prop] = String(v())));
          else el.dataset[prop] = String(v);
        }
      } else if (key === 'ref' && typeof value === 'function') {
        (value as (e: HTMLElement) => void)(el);
      } else if (isGetter(value)) {
        effect(() => applyProp(el, key, value()));
      } else {
        applyProp(el, key, value);
      }
    }
  }

  appendChildren(el, children);
  return el;
}

function appendChildren(parent: Node, children: Child[]) {
  for (const child of children) appendChild(parent, child);
}

function appendChild(parent: Node, child: Child) {
  if (child == null || child === false || child === true) return;
  if (Array.isArray(child)) {
    for (const c of child) appendChild(parent, c);
    return;
  }
  if (child instanceof Node) {
    parent.appendChild(child);
    return;
  }
  if (isGetter(child)) {
    bindDynamic(parent, child as Getter<Child>);
    return;
  }
  parent.appendChild(document.createTextNode(String(child)));
}

// A reactive region: an anchor comment marks its end; on change we remove the
// previously-rendered nodes and insert the new ones before the anchor.
function bindDynamic(parent: Node, producer: Getter<Child>) {
  const anchor = document.createComment('');
  parent.appendChild(anchor);
  let current: Node[] = [];
  effect(() => {
    const value = producer();
    for (const n of current) if (n.parentNode) n.parentNode.removeChild(n);
    const frag = document.createDocumentFragment();
    appendChild(frag, value);
    current = Array.from(frag.childNodes);
    anchor.parentNode?.insertBefore(frag, anchor);
  });
}

/** Reactive conditional. */
export function when(cond: Getter<unknown>, then: () => Child, otherwise?: () => Child): Getter<Child> {
  return () => (cond() ? then() : otherwise ? otherwise() : null);
}

/** Reactive keyed-by-index list. Simple and adequate for our tables/menus. */
export function each<T>(items: Getter<T[]>, render: (item: T, index: number) => Child): Getter<Child> {
  return () => items().map((item, i) => render(item, i));
}

export function mount(parent: HTMLElement, node: Child) {
  appendChild(parent, node);
}

export function clear(parent: HTMLElement) {
  parent.replaceChildren();
}
