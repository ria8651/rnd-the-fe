/**
 * Click-popover anchored to a trigger (spec/ui-standards/controls.md › Menus & popovers).
 * The consumer owns `open` and supplies a `trigger` and content `children`.
 *
 * Layering: the content renders in a **top-level overlay** (a portal on `document.body`), so
 * it is never clipped, scrolled, or resized by an ancestor's bounds/overflow/scroll region —
 * including a dialog: a menu opened inside a modal floats *above* that modal (z-index above
 * the modal), not inside its scroll area. Opening never reflows the page beneath it.
 *
 * Placement & collision: anchored to the trigger (default below, start-aligned) and kept
 * tethered; if it would overflow it flips to the opposite side and/or shifts along the edge to
 * stay on-screen, and caps its height and scrolls internally rather than being clipped.
 *
 * Dismisses on outside-click and Escape; on Escape focus returns to `[data-popover-trigger]`.
 */
import { type JSX, Show, createEffect, createSignal, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';

type Placement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
interface Pos {
  top: number;
  left: number;
  width?: number;
  maxHeight: number;
}

export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  placement?: Placement;
  matchWidth?: boolean;
  trigger: JSX.Element;
  children: JSX.Element;
}

const MARGIN = 8;
const GAP = 4;

export function Popover(props: PopoverProps): JSX.Element {
  let root: HTMLDivElement | undefined;
  let content: HTMLDivElement | undefined;
  const [pos, setPos] = createSignal<Pos>();

  const reposition = () => {
    if (!props.open || !root || !content) return;
    const tr = root.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const preferTop = props.placement?.startsWith('top') ?? false;
    const alignEnd = props.placement?.endsWith('end') ?? false;

    const width = props.matchWidth ? tr.width : content.offsetWidth;
    const contentH = content.scrollHeight;
    const spaceBelow = vh - tr.bottom - MARGIN;
    const spaceAbove = tr.top - MARGIN;

    // Flip to whichever side fits; prefer the requested side, else the roomier one.
    const placeAbove = preferTop ? spaceAbove >= contentH || spaceAbove > spaceBelow : spaceBelow < contentH && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, placeAbove ? spaceAbove : spaceBelow);
    const usedH = Math.min(contentH, maxHeight);
    const top = placeAbove ? tr.top - usedH - GAP : tr.bottom + GAP;

    let left = alignEnd ? tr.right - width : tr.left;
    left = Math.max(MARGIN, Math.min(left, vw - width - MARGIN));

    setPos({ top, left, width: props.matchWidth ? tr.width : undefined, maxHeight });
  };

  const onPointer = (e: PointerEvent) => {
    const t = e.target as Node;
    if (props.open && root && !root.contains(t) && content && !content.contains(t)) props.onClose();
  };
  const onKey = (e: KeyboardEvent) => {
    if (props.open && e.key === 'Escape') {
      props.onClose();
      (root?.querySelector('[data-popover-trigger]') as HTMLElement | null)?.focus();
    }
  };

  createEffect(() => {
    if (!props.open) {
      setPos(undefined);
      return;
    }
    queueMicrotask(reposition); // measure once the portaled content has mounted
    const onScrollResize = () => reposition();
    // capture-phase scroll catches scrolling in any ancestor, keeping the popover tethered.
    window.addEventListener('scroll', onScrollResize, true);
    window.addEventListener('resize', onScrollResize);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    onCleanup(() => {
      window.removeEventListener('scroll', onScrollResize, true);
      window.removeEventListener('resize', onScrollResize);
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    });
  });

  return (
    <div class="pop-root" ref={root}>
      {props.trigger}
      <Show when={props.open}>
        <Portal>
          <div
            class="pop-content"
            ref={content}
            style={{
              position: 'fixed',
              top: `${pos()?.top ?? -9999}px`,
              left: `${pos()?.left ?? -9999}px`,
              ...(pos()?.width != null ? { width: `${pos()!.width}px`, 'min-width': `${pos()!.width}px` } : {}),
              'max-height': `${pos()?.maxHeight ?? 400}px`,
              visibility: pos() ? 'visible' : 'hidden'
            }}
          >
            {props.children}
          </div>
        </Portal>
      </Show>
    </div>
  );
}
