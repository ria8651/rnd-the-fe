/**
 * Desktop primary nav (spec/chrome/01-behaviours.md › Sidebar). Collapsible expanded ↔
 * icon-rail via an explicit toggle (no hover-to-peek — divergence D3); the choice persists.
 * Two data-driven groups (upper scrollable, lower). Active item reflects the route. Hidden
 * in full-screen mode (handled by AppShell).
 */
import { type JSX, For, Show } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { Icon } from '../ui/Icon';
import { chrome } from '../state/chrome';
import { navGroups, isActive, type NavGroup, type NavItem } from './nav-config';

function NavLink(props: { item: NavItem; pathname: string }): JSX.Element {
  const active = () => isActive(props.item.route, props.pathname);
  return (
    <A
      href={props.item.route}
      class={`nav-item${active() ? ' nav-item--active' : ''}`}
      title={chrome.collapsed ? props.item.label : undefined}
      aria-current={active() ? 'page' : undefined}
    >
      <Icon name={props.item.icon} size={22} />
      <span class="nav-item__label">{props.item.label}</span>
    </A>
  );
}

export function Sidebar(): JSX.Element {
  const location = useLocation();
  const visibleItems = (g: NavGroup) => g.items.filter((i) => i.visible?.() ?? true);

  let brandRef: HTMLButtonElement | undefined;
  // The brand mark is the collapse/expand toggle; activating it plays a single 360° spin
  // whose direction echoes the change (spec/chrome/01 › Sidebar). Decorative — suppressed
  // under a reduced-motion preference.
  const toggle = () => {
    const collapsing = !chrome.collapsed;
    chrome.toggle();
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && brandRef?.animate) {
      brandRef.animate([{ transform: 'rotate(0deg)' }, { transform: `rotate(${collapsing ? -360 : 360}deg)` }], {
        duration: 450,
        easing: 'ease-in-out'
      });
    }
  };

  return (
    <nav class={`sidebar${chrome.collapsed ? ' sidebar--collapsed' : ''}`} aria-label="Primary">
      <div class="sidebar__brand">
        <button
          ref={brandRef}
          class="sidebar__brand-btn"
          type="button"
          aria-label={chrome.collapsed ? 'Open the menu' : 'Close the menu'}
          aria-expanded={!chrome.collapsed}
          onClick={toggle}
        >
          <Icon name="m-supply-guy" size={30} />
        </button>
      </div>
      <For each={navGroups}>
        {(group) => (
          <Show when={visibleItems(group).length}>
            <div class={`sidebar__group sidebar__group--${group.id}`}>
              <For each={visibleItems(group)}>{(item) => <NavLink item={item} pathname={location.pathname} />}</For>
            </div>
          </Show>
        )}
      </For>
    </nav>
  );
}
