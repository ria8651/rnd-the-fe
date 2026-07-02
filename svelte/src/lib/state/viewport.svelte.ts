// Viewport width tracking for responsive behaviour (table column priority,
// sidebar responsive default, mobile nav). Breakpoints per spec ui-standards/tables.md.

class Viewport {
  width = $state(window.innerWidth);

  constructor() {
    window.addEventListener('resize', () => (this.width = window.innerWidth));
  }

  get isPhone() {
    return this.width < 600;
  }
  get isTabletPortrait() {
    return this.width >= 600 && this.width < 800;
  }
  /** medium-and-smaller: sidebar auto-collapses, mobile nav shows */
  get isCompact() {
    return this.width < 900;
  }
  get hideP2() {
    return this.width < 800;
  }
  get hideP3() {
    return this.width < 1100;
  }
}

export const viewport = new Viewport();
