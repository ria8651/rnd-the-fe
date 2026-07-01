/**
 * Reactive viewport width, shared across components. Drives the table's responsive
 * behaviour (full ↔ column-hidden ↔ card layout) at the breakpoints in
 * spec/ui-standards/tables.md › Responsive strategy, and the chrome's responsive nav.
 */
import { createSignal } from 'solid-js';

const [width, setWidth] = createSignal(typeof window === 'undefined' ? 1280 : window.innerWidth);

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => setWidth(window.innerWidth), { passive: true });
}

export const viewport = {
  get width() {
    return width();
  },
  /** True when the viewport is narrower than `px`. */
  below(px: number) {
    return width() < px;
  }
};

/** Breakpoints mirror scale.css / tables.md. */
export const BP = {
  phone: 600,
  tabletPortrait: 800,
  desktop: 1100
} as const;
