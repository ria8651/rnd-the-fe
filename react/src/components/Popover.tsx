import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import './Popover.css';

/**
 * Transient surface anchored to a trigger (menus, selectors, dropdowns) per
 * spec/ui-standards/controls.md#menus--popovers:
 *  - opens on trigger activation; dismisses on outside-click / Escape / selection
 *  - on dismissal, focus returns to the trigger (divergence D6)
 *  - surface.raised colour + raised elevation
 *  - anchored below/start-aligned, stays within the viewport (flips/shifts)
 */

export type Placement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

interface PopoverProps {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  placement?: Placement;
  /** Match the trigger's width (dropdowns). */
  matchWidth?: boolean;
  /** Restore focus to the trigger on close (default true, per D6). */
  returnFocus?: boolean;
  className?: string;
  /** aria role for the surface; combobox listboxes set their own. */
  role?: string;
  labelledBy?: string;
}

export function Popover({
  anchorRef,
  open,
  onClose,
  children,
  placement = 'bottom-start',
  matchWidth = false,
  returnFocus = true,
  className,
  role = 'menu',
  labelledBy,
}: PopoverProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  const reposition = useCallback(() => {
    const anchor = anchorRef.current;
    const surface = surfaceRef.current;
    if (!anchor || !surface) return;
    const a = anchor.getBoundingClientRect();
    const gap = 4;
    const surfaceH = surface.offsetHeight;
    const surfaceW = matchWidth ? a.width : surface.offsetWidth;
    const preferTop = placement.startsWith('top');
    const endAligned = placement.endsWith('end');

    // Prefer the requested side; flip only if it would overflow and the other side fits.
    const below = a.bottom + gap;
    const above = a.top - gap - surfaceH;
    let top: number;
    if (preferTop) {
      top = above > 8 || a.top > window.innerHeight - a.bottom ? above : below;
    } else {
      top = below + surfaceH > window.innerHeight - 8 && above > 8 ? above : below;
    }

    let left = endAligned ? a.right - surfaceW : a.left;
    // Shift horizontally to stay within the viewport.
    left = Math.max(8, Math.min(left, window.innerWidth - surfaceW - 8));

    setPos({ top, left, width: a.width });
  }, [anchorRef, matchWidth, placement]);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    const onScrollResize = () => reposition();
    window.addEventListener('resize', onScrollResize);
    window.addEventListener('scroll', onScrollResize, true);
    return () => {
      window.removeEventListener('resize', onScrollResize);
      window.removeEventListener('scroll', onScrollResize, true);
    };
  }, [open, reposition]);

  // Dismiss on outside-click / Escape; return focus to the trigger.
  useEffect(() => {
    if (!open) return;
    const trigger = anchorRef.current;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (surfaceRef.current?.contains(t) || trigger?.contains(t)) return;
      onClose();
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer, true);
    };
  }, [open, onClose, anchorRef]);

  // On close, return focus to the trigger (D6).
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open && returnFocus) {
      anchorRef.current?.focus?.();
    }
    wasOpen.current = open;
  }, [open, returnFocus, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={surfaceRef}
      role={role}
      aria-labelledby={labelledBy}
      className={`oms-popover${className ? ` ${className}` : ''}`}
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        minWidth: matchWidth ? pos?.width : undefined,
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
