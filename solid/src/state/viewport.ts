import { createSignal } from 'solid-js';

/*
 * Reactive viewport width + breakpoints (tables.md#responsive-strategy, layout.md).
 * Breakpoints: phone < 600, tablet-portrait 600–800, tablet-landscape 800–1100,
 * desktop ≥ 1100. Tablet is a primary target.
 */

const [width, setWidth] = createSignal(window.innerWidth);

let raf = 0;
function onResize() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => setWidth(window.innerWidth));
}
// App-lifetime listener; the module lives as long as the app.
window.addEventListener('resize', onResize);

export { width as viewportWidth };

export const isPhone = () => width() < 600;
export const isTabletPortrait = () => width() >= 600 && width() < 800;
export const isTabletLandscape = () => width() >= 800 && width() < 1100;
export const isTablet = () => width() >= 600 && width() < 1100;
export const isDesktop = () => width() >= 1100;
/** Medium-and-smaller: the sidebar auto-collapses here until the user overrides. */
export const isMediumOrSmaller = () => width() < 1100;
