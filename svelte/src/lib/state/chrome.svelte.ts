// Chrome shell UI state: sidebar expand/collapse and full-screen mode.
// Sidebar toggle persists once set explicitly; until then it follows the viewport
// (auto-collapsed on medium-and-smaller). Spec chrome/01-behaviours.md, AC-CH1/1b/2/16.

import { viewport } from './viewport.svelte';

const KEY = 'oms.sidebar';

class ChromeState {
  private explicit = $state<boolean | null>(null); // null = follow viewport
  spinDir = $state<0 | 1 | -1>(0); // brand-mark spin feedback on toggle
  fullscreen = $state(false);
  mobileNavOpen = $state(false);

  constructor() {
    const stored = localStorage.getItem(KEY);
    if (stored === 'expanded') this.explicit = true;
    else if (stored === 'collapsed') this.explicit = false;
  }

  get expanded(): boolean {
    if (this.explicit !== null) return this.explicit;
    return !viewport.isCompact; // responsive default
  }

  toggleSidebar() {
    const next = !this.expanded;
    this.spinDir = next ? 1 : -1;
    this.explicit = next;
    localStorage.setItem(KEY, next ? 'expanded' : 'collapsed');
  }

  toggleFullscreen() {
    this.fullscreen = !this.fullscreen;
  }

  toggleMobileNav() {
    this.mobileNavOpen = !this.mobileNavOpen;
  }

  closeMobileNav() {
    this.mobileNavOpen = false;
  }
}

export const chrome = new ChromeState();
