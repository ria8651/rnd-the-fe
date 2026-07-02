import { h } from '../core/dom';
import { icon } from '../icons';
import { effect } from '../core/signal';
import { route, navigate } from '../core/router';
import { currentStoreId } from '../context/auth';
import { t } from '../context/i18n';
import { NAV_SECTIONS, sectionHref, visibleSections, type NavSection } from './nav';
import { sidebarCollapsed, spinTick, toggleSidebar } from './state';

function navItem(section: NavSection): HTMLElement {
  const href = () => {
    const store = currentStoreId();
    return store ? sectionHref(store, section) : '#';
  };
  const active = () => route().segments[1] === section.area;
  return h(
    'a',
    {
      class: () => `navitem${active() ? ' active' : ''}`,
      href,
      'aria-current': () => (active() ? 'page' : undefined),
      onclick: (e: MouseEvent) => {
        e.preventDefault();
        navigate(href());
      },
    },
    icon(section.icon),
    h('span', { class: 'navitem__label' }, t(section.label)),
  );
}

export function sidebar(): HTMLElement {
  const brand = h(
    'button',
    {
      class: 'sidebar__brand',
      'aria-label': () => (sidebarCollapsed() ? 'Open the menu' : 'Close the menu'),
      'aria-expanded': () => (sidebarCollapsed() ? 'false' : 'true'),
      onclick: toggleSidebar,
    },
    icon('m-supply-guy'),
  );

  // Play the spin as feedback on toggle; suppressed under reduced-motion via CSS.
  effect(() => {
    const tick = spinTick();
    if (tick === 0) return;
    brand.classList.remove('spin', 'reverse');
    void brand.offsetWidth; // restart animation
    brand.classList.add('spin');
    if (tick < 0) brand.classList.add('reverse');
  });

  const upper = NAV_SECTIONS.filter((s) => s.group === 'upper');
  const lower = () => visibleSections().filter((s) => s.group === 'lower');

  return h(
    'nav',
    { class: () => `sidebar${sidebarCollapsed() ? ' collapsed' : ''}`, 'aria-label': 'Primary' },
    brand,
    h('div', { class: 'sidebar__group' }, ...upper.map(navItem)),
    h('div', { class: 'sidebar__group sidebar__group--bottom' }, () => lower().map(navItem)),
  );
}
