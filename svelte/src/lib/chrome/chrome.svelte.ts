/**
 * Chrome shell UI state: sidebar collapse and full-screen.
 *
 * Sidebar (chrome/01-behaviours.md › Sidebar): collapsible expanded ↔ icon-rail.
 * Auto-collapses on medium-and-smaller and expands on larger — until the user
 * explicitly toggles, after which their choice persists and wins (AC-CH1/AC-CH2).
 */
import { browser } from '$app/environment';

const KEY = 'oms.sidebar';

class ChromeState {
	collapsed = $state(false);
	/** Once the user toggles, the responsive default no longer overrides them. */
	userSet = $state(false);
	/** Full-screen mode hides the sidebar (AC-CH16). */
	fullscreen = $state(false);

	init() {
		if (!browser) return;
		const stored = localStorage.getItem(KEY);
		if (stored === 'collapsed' || stored === 'expanded') {
			this.userSet = true;
			this.collapsed = stored === 'collapsed';
		}
	}

	/** Apply the responsive default when the user hasn't made an explicit choice. */
	applyResponsiveDefault(isMediumOrSmaller: boolean) {
		if (!this.userSet) this.collapsed = isMediumOrSmaller;
	}

	toggle() {
		this.collapsed = !this.collapsed;
		this.userSet = true;
		if (browser) localStorage.setItem(KEY, this.collapsed ? 'collapsed' : 'expanded');
	}

	setFullscreen(value: boolean) {
		this.fullscreen = value;
	}
}

export const chrome = new ChromeState();
