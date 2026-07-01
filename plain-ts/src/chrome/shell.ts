// The app shell. A deliberately light take on ../../spec/chrome: a collapsible
// sidebar (persisted), a top bar with breadcrumbs + theme toggle, and a bottom
// bar hosting the store selector. Only the stocktakes vertical is present.

import './chrome.css';
import { el } from '../framework/dom.ts';
import { currentRoute, link } from '../framework/router.ts';
import { icon } from '../components/icon.ts';
import { select } from '../components/select.ts';
import { activeStore, setActiveStore, stores } from '../api/store.ts';
import { resolvedTheme, setThemeMode, themeMode, type ThemeMode } from '../theme/theme.ts';
import { computed } from '../framework/signal.ts';

export interface Breadcrumb {
  label: string;
  href?: string;
}

const SIDEBAR_KEY = 'oms.sidebar-collapsed';

function sidebar(): HTMLElement {
  let collapsed = localStorage.getItem(SIDEBAR_KEY) === '1';

  const isStocktakes = computed(() => currentRoute().segments[0] === 'stocktakes' || currentRoute().segments.length === 0);

  const root = el(
    'nav',
    { class: () => `sidebar ${collapsed ? 'collapsed' : ''}`, 'aria-label': 'Primary' },
    el(
      'div',
      { class: 'sidebar-brand' },
      el('span', { class: 'dot' }),
      () => (collapsed ? '' : el('span', null, 'open mSupply')),
    ),
    el(
      'div',
      { class: 'nav-group' },
      () => (collapsed ? '' : el('div', { class: 'nav-group-label' }, 'Inventory')),
      el(
        'a',
        { class: () => `nav-item ${isStocktakes() ? 'active' : ''}`, href: link('/stocktakes') },
        icon('columns', 20),
        () => (collapsed ? '' : el('span', null, 'Stocktakes')),
      ),
    ),
    el('div', { class: 'sidebar-spacer' }),
    el(
      'div',
      { class: 'nav-group' },
      el(
        'button',
        {
          class: 'nav-item',
          style: { border: 'none', background: 'transparent', width: '100%', cursor: 'pointer' },
          'aria-label': 'Toggle sidebar',
          onclick: () => {
            collapsed = !collapsed;
            localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
            root.className = `sidebar ${collapsed ? 'collapsed' : ''}`;
            root.replaceWith(sidebar());
          },
        },
        icon(collapsed ? 'arrow-right' : 'columns', 20),
        () => (collapsed ? '' : el('span', null, 'Collapse')),
      ),
    ),
  );
  return root;
}

function themeToggle(): HTMLElement {
  const modes: ThemeMode[] = ['light', 'dark', 'system'];
  const labels: Record<ThemeMode, string> = { light: 'Light', dark: 'Dark', system: 'System' };
  return el(
    'button',
    {
      class: 'icon-btn',
      'aria-label': () => `Theme: ${labels[themeMode()]} (click to change)`,
      title: () => `Theme: ${labels[themeMode()]}`,
      onclick: () => {
        const next = modes[(modes.indexOf(themeMode()) + 1) % modes.length];
        setThemeMode(next);
      },
    },
    () => icon(resolvedTheme() === 'dark' ? 'circle-alert' : 'sun', 20),
    () => el('span', { class: 'caption', style: { marginLeft: '4px' } }, labels[themeMode()]),
  );
}

function storeSelector(): HTMLElement {
  return el(
    'div',
    { class: 'footer-item' },
    icon('home', 18),
    () => {
      const list = stores();
      if (list.length < 2) {
        // Hidden when there's nothing to switch to (chrome spec); show a label.
        return el('span', null, activeStore()?.name ?? '');
      }
      return select({
        options: list.map((s) => ({ value: s.id, label: s.name })),
        value: activeStore()?.id ?? null,
        ariaLabel: 'Active store',
        compact: true,
        onChange: (id) => {
          const store = list.find((s) => s.id === id);
          if (store) {
            setActiveStore(store);
            // Land on the vertical root for the new store (chrome spec).
            window.location.hash = '#/stocktakes';
          }
        },
      });
    },
  );
}

/** Render the shell with a page node and breadcrumbs into #app. */
export function renderShell(page: Node, breadcrumbs: Breadcrumb[]): HTMLElement {
  return el(
    'div',
    { class: 'shell' },
    sidebar(),
    el(
      'div',
      { class: 'main' },
      el(
        'header',
        { class: 'topbar' },
        el(
          'div',
          { class: 'breadcrumbs' },
          ...breadcrumbs.flatMap((b, i) => {
            const isLast = i === breadcrumbs.length - 1;
            const node = b.href && !isLast
              ? el('a', { href: b.href }, b.label)
              : el('span', { class: isLast ? 'current' : '' }, b.label);
            return isLast ? [node] : [node, el('span', null, '/')];
          }),
        ),
        el('div', { class: 'topbar-spacer' }),
        themeToggle(),
      ),
      el('div', { class: 'page' }, page),
    ),
    el(
      'footer',
      { class: 'footer' },
      storeSelector(),
      el('div', { class: 'footer-spacer' }),
      el('div', { class: 'footer-item caption' }, 'open mSupply · plain-TS build'),
    ),
  );
}
