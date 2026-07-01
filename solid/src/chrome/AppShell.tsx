/**
 * The application shell (spec/chrome). Composes the sidebar + section top bar (desktop) or
 * the mobile nav bar (< tablet-portrait), the routed page content, and the persistent bottom
 * bar. The sidebar auto-collapses on medium-and-smaller viewports until the user overrides
 * (AC-CH2) and is hidden in full-screen mode (AC-CH16).
 */
import { type JSX, Show, createEffect, onMount } from 'solid-js';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomBar } from './BottomBar';
import { MobileNav } from './MobileNav';
import { chrome } from '../state/chrome';
import { auth } from '../state/auth';
import { i18n } from '../state/i18n';
import { viewport, BP } from '../state/viewport';

export function AppShell(props: { children: JSX.Element }): JSX.Element {
  onMount(() => {
    chrome.init();
    auth.init();
    i18n.init();
  });

  const isMobile = () => viewport.below(BP.tabletPortrait);

  // Responsive sidebar default: collapse on medium-and-smaller until the user overrides.
  createEffect(() => chrome.applyResponsiveDefault(viewport.below(BP.desktop)));

  return (
    <div class="shell">
      {/* Sidebar spans the full height on the left; the bottom bar lives inside the content
          column (right of the sidebar), per layout.md — it does not span the bottom-left. */}
      <Show when={!isMobile() && !chrome.fullscreen}>
        <Sidebar />
      </Show>
      <div class="shell__content">
        <Show when={isMobile()} fallback={<TopBar />}>
          <MobileNav />
        </Show>
        <main class="shell__routed">{props.children}</main>
        <BottomBar />
      </div>
    </div>
  );
}
