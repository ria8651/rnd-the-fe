/**
 * Chrome shell UI state: sidebar collapse and full-screen.
 *
 * Sidebar (spec/chrome/01-behaviours.md › Sidebar): collapsible expanded ↔ icon-rail.
 * Auto-collapses on medium-and-smaller and expands on larger — until the user explicitly
 * toggles, after which their choice persists and wins (AC-CH1/AC-CH2). Full-screen hides
 * the sidebar (AC-CH16).
 */
import { createSignal } from 'solid-js';

const KEY = 'oms.sidebar';
const ls = () => (typeof localStorage === 'undefined' ? null : localStorage);

const [collapsed, setCollapsed] = createSignal(false);
/** Once the user toggles, the responsive default no longer overrides them. */
const [userSet, setUserSet] = createSignal(false);
const [fullscreen, setFullscreen] = createSignal(false);

export const chrome = {
  get collapsed() {
    return collapsed();
  },
  get fullscreen() {
    return fullscreen();
  },

  init() {
    const stored = ls()?.getItem(KEY);
    if (stored === 'collapsed' || stored === 'expanded') {
      setUserSet(true);
      setCollapsed(stored === 'collapsed');
    }
  },

  /** Apply the responsive default only when the user hasn't made an explicit choice. */
  applyResponsiveDefault(isMediumOrSmaller: boolean) {
    if (!userSet()) setCollapsed(isMediumOrSmaller);
  },

  toggle() {
    const next = !collapsed();
    setCollapsed(next);
    setUserSet(true);
    ls()?.setItem(KEY, next ? 'collapsed' : 'expanded');
  },

  setFullscreen(value: boolean) {
    setFullscreen(value);
  }
};
