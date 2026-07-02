// Shared chrome state: sidebar collapse (explicit override wins over the
// responsive default), full-screen mode, and mobile drawer visibility.
import { signal } from '../core/signal';

const EXPLICIT_KEY = 'oms.sidebarCollapsed';
const stored = localStorage.getItem(EXPLICIT_KEY);
let explicit = stored !== null;

const MEDIUM = 900;
const initialCollapsed = explicit ? stored === '1' : window.innerWidth <= MEDIUM;

const [collapsedGet, collapsedSet] = signal<boolean>(initialCollapsed);
export const sidebarCollapsed = collapsedGet;

// Spin direction: +1 expanding, -1 collapsing (echoes the change).
const [spinGet, spinSet] = signal<number>(0);
export const spinTick = spinGet;

export function toggleSidebar() {
  const next = !collapsedGet();
  collapsedSet(next);
  explicit = true;
  localStorage.setItem(EXPLICIT_KEY, next ? '1' : '0');
  spinSet((t) => (next ? -Math.abs(t + 1) : Math.abs(t + 1)));
}

// Responsive default only applies until the user overrides it (AC-CH2).
window.addEventListener('resize', () => {
  if (explicit) return;
  collapsedSet(window.innerWidth <= MEDIUM);
});

const [fsGet, fsSet] = signal<boolean>(false);
export const fullscreen = fsGet;
export function toggleFullscreen() {
  fsSet((v) => !v);
}

const [drawerGet, drawerSet] = signal<boolean>(false);
export const mobileDrawerOpen = drawerGet;
export function setMobileDrawer(open: boolean) {
  drawerSet(open);
}
