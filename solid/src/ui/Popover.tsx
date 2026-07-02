import { createEffect, onCleanup, type JSX } from 'solid-js';
import { Portal } from 'solid-js/web';

type AriaRole = JSX.HTMLAttributes<HTMLElement>['role'];

/*
 * Transient surface anchored to a trigger (controls.md#menus--popovers):
 *  - renders in a top-level overlay (Portal on document.body) so it is NEVER
 *    clipped by an ancestor's overflow/scroll — it floats above the page AND
 *    above any modal that opened it;
 *  - anchored below the trigger, start-aligned; flips above on bottom overflow
 *    and shifts along the edge to stay on-screen; caps height + scrolls internally;
 *  - dismisses on outside-click, Escape, or the trigger toggling it shut;
 *  - returns focus to the trigger on dismissal (divergence D6).
 */

export interface PopoverProps {
  open: boolean;
  anchor: HTMLElement | undefined;
  onClose: () => void;
  children: JSX.Element;
  /** Match the anchor's width (used by comboboxes). */
  matchWidth?: boolean;
  class?: string;
  /** aria role for the surface (e.g. "listbox", "menu"). */
  role?: AriaRole;
  id?: string;
}

export function Popover(props: PopoverProps): JSX.Element {
  let surface: HTMLDivElement | undefined;

  const position = () => {
    if (!surface || !props.anchor) return;
    const a = props.anchor.getBoundingClientRect();
    const margin = 4;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (props.matchWidth) surface.style.minWidth = `${a.width}px`;

    // Measure natural size.
    surface.style.maxHeight = '';
    const rect = surface.getBoundingClientRect();
    const spaceBelow = vh - a.bottom - margin;
    const spaceAbove = a.top - margin;
    const flipUp = rect.height > spaceBelow && spaceAbove > spaceBelow;

    const maxH = Math.max(120, (flipUp ? spaceAbove : spaceBelow) - margin);
    surface.style.maxHeight = `${maxH}px`;

    let top = flipUp ? a.top - Math.min(rect.height, maxH) - margin : a.bottom + margin;
    let left = a.left;
    // Shift horizontally to stay on-screen.
    if (left + rect.width > vw - margin) left = Math.max(margin, vw - rect.width - margin);
    if (left < margin) left = margin;
    top = Math.max(margin, top);

    surface.style.top = `${top}px`;
    surface.style.left = `${left}px`;
  };

  createEffect(() => {
    if (!props.open) return;
    const trigger = props.anchor ?? (document.activeElement as HTMLElement | null);

    // Position after paint, and keep pinned to the trigger on scroll/resize.
    requestAnimationFrame(position);
    const reflow = () => position();
    window.addEventListener('scroll', reflow, true);
    window.addEventListener('resize', reflow);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        props.onClose();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (surface?.contains(target) || props.anchor?.contains(target)) return;
      props.onClose();
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointerDown, true);

    onCleanup(() => {
      window.removeEventListener('scroll', reflow, true);
      window.removeEventListener('resize', reflow);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      // Return focus to the trigger on dismissal (D6).
      if (trigger && typeof trigger.focus === 'function') trigger.focus();
    });
  });

  return (
    <>
      {props.open && (
        <Portal>
          <div
            ref={surface}
            class={`popover${props.class ? ` ${props.class}` : ''}`}
            role={props.role}
            id={props.id}
          >
            {props.children}
          </div>
        </Portal>
      )}
    </>
  );
}
