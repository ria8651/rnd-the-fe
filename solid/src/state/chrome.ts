import { createSignal } from 'solid-js';
import { isMediumOrSmaller } from './viewport';

/*
 * Sidebar collapse/expand state (chrome/01-behaviours.md#sidebar, divergence D3):
 *  - Responsive default: follows the viewport (auto-collapsed medium-and-smaller)
 *    UNTIL the user sets it explicitly.
 *  - After an explicit toggle, the user's choice wins and persists across navigation.
 *  - The drawer never reacts to hover; only the explicit toggle changes state.
 */

const STORAGE_KEY = 'oms.sidebar';

function readStored(): boolean | null {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'expanded' ? true : v === 'collapsed' ? false : null;
}

const [explicit, setExplicit] = createSignal<boolean | null>(readStored());

/** True when the expanded panel shows; false for the icon rail. */
export function sidebarExpanded(): boolean {
  const e = explicit();
  if (e !== null) return e;
  return !isMediumOrSmaller(); // responsive default
}

/** Direction of the last toggle, for the brand-mark spin feedback. */
const [lastSpin, setLastSpin] = createSignal<'open' | 'close' | null>(null);
export { lastSpin as sidebarSpin };

export function toggleSidebar(): void {
  const next = !sidebarExpanded();
  setExplicit(next);
  localStorage.setItem(STORAGE_KEY, next ? 'expanded' : 'collapsed');
  setLastSpin(next ? 'open' : 'close');
}

/* Full-screen mode hides the sidebar (chrome/01-behaviours.md#desktop-top-bar). */
const [fullScreen, setFullScreen] = createSignal(false);
export { fullScreen };
export function toggleFullScreen(): void {
  setFullScreen((v) => !v);
}

/* Mobile/tablet nav drawer open state. */
const [mobileNavOpen, setMobileNavOpen] = createSignal(false);
export { mobileNavOpen };
export function setMobileNav(open: boolean): void {
  setMobileNavOpen(open);
}
