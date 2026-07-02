import { h } from '../core/dom';

// A transient surface anchored to a trigger. Rendered at document.body so it is
// never clipped by an ancestor's overflow/scroll (controls.md § menus-popovers):
// it floats above the page and above any modal, flips/shifts to stay on screen,
// caps its height with internal scroll, and returns focus to the trigger on close.

export interface PopoverOpts {
  /** Match trigger width (used by comboboxes/selectors). */
  matchWidth?: boolean;
  /** Called after the popover closes for any reason. */
  onClose?: () => void;
  /** Focus the first focusable element inside on open. */
  autoFocus?: boolean;
}

export interface PopoverController {
  el: HTMLElement;
  close: () => void;
  reposition: () => void;
}

const GAP = 4;

export function openPopover(
  anchor: HTMLElement,
  render: (close: () => void) => Node,
  opts: PopoverOpts = {},
): PopoverController {
  const trigger = (document.activeElement as HTMLElement) ?? anchor;

  const el = h('div', { class: 'popover', role: 'presentation' });
  el.style.position = 'fixed';
  el.style.visibility = 'hidden';

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('mousedown', onDocMouseDown, true);
    document.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('resize', reposition, true);
    window.removeEventListener('scroll', reposition, true);
    el.remove();
    opts.onClose?.();
    // Focus return (divergence D6): keyboard users keep their place.
    if (trigger && document.body.contains(trigger)) trigger.focus();
  };

  const content = render(close);
  el.appendChild(content);

  function reposition() {
    const a = anchor.getBoundingClientRect();
    const rtl = document.documentElement.dir === 'rtl';
    if (opts.matchWidth) el.style.minWidth = `${a.width}px`;

    // Cap height to the larger of the space above/below the anchor.
    const spaceBelow = window.innerHeight - a.bottom - GAP - 8;
    const spaceAbove = a.top - GAP - 8;
    const rect = el.getBoundingClientRect();
    const flipUp = rect.height > spaceBelow && spaceAbove > spaceBelow;
    const maxH = Math.max(160, flipUp ? spaceAbove : spaceBelow);
    el.style.maxHeight = `${maxH}px`;

    const h2 = Math.min(el.getBoundingClientRect().height, maxH);
    let top = flipUp ? a.top - GAP - h2 : a.bottom + GAP;
    top = Math.max(8, Math.min(top, window.innerHeight - h2 - 8));
    el.style.top = `${top}px`;

    const w = el.getBoundingClientRect().width;
    // Start-aligned (LTR: left edge to anchor left; RTL: right edge to anchor right).
    let left = rtl ? a.right - w : a.left;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    el.style.left = `${left}px`;
    el.style.visibility = 'visible';
  }

  function onDocMouseDown(e: MouseEvent) {
    const t = e.target as Node;
    if (!el.contains(t) && !anchor.contains(t)) close();
  }
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  }

  document.body.appendChild(el);
  reposition();
  document.addEventListener('mousedown', onDocMouseDown, true);
  document.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('resize', reposition, true);
  window.addEventListener('scroll', reposition, true);

  if (opts.autoFocus) {
    const focusable = el.querySelector<HTMLElement>('input, button, [tabindex]');
    focusable?.focus();
  }

  return { el, close, reposition };
}

/** Wire a trigger element to toggle a popover open/closed. */
export function attachPopover(
  trigger: HTMLElement,
  render: (close: () => void) => Node,
  opts: PopoverOpts = {},
): void {
  let ctrl: PopoverController | null = null;
  trigger.addEventListener('click', () => {
    if (ctrl) {
      ctrl.close();
      ctrl = null;
      return;
    }
    ctrl = openPopover(trigger, render, {
      ...opts,
      onClose: () => {
        ctrl = null;
        opts.onClose?.();
      },
    });
  });
}
