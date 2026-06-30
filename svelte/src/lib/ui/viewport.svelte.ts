/**
 * Reactive viewport width, shared across components. Used to switch the table
 * between its full form, column-hidden forms, and the card layout at the
 * breakpoints in tables.md › Responsive strategy.
 */
import { browser } from '$app/environment';

class Viewport {
	width = $state(browser ? window.innerWidth : 1280);

	constructor() {
		if (browser) {
			window.addEventListener('resize', () => (this.width = window.innerWidth), { passive: true });
		}
	}

	/** True when the viewport is narrower than `px`. */
	below(px: number) {
		return this.width < px;
	}
}

export const viewport = new Viewport();

// Breakpoints mirror scale.css / tables.md.
export const BP = {
	phone: 600,
	tabletPortrait: 800,
	desktop: 1100
} as const;
