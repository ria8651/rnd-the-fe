import { h, when, type Child } from '../core/dom';
import { icon } from '../icons';
import { effect, type Getter } from '../core/signal';
import { navigate, route } from '../core/router';
import { sidebar } from './sidebar';
import { topbar } from './topbar';
import { bottomBar } from './bottomBar';
import { visibleSections, sectionHref } from './nav';
import { currentStore, currentStoreId, storeColour } from '../context/auth';
import { contrastingText } from '../theme/theme';
import { t } from '../context/i18n';
import { confirmDialog } from '../components/modal';
import { fullscreen, mobileDrawerOpen, setMobileDrawer } from './state';

function applyStoreColour() {
  effect(() => {
    const colour = storeColour(currentStore());
    const root = document.documentElement.style;
    if (colour) {
      root.setProperty('--store-bar-bg', colour);
      root.setProperty('--store-bar-fg', contrastingText(colour));
    } else {
      root.removeProperty('--store-bar-bg');
      root.removeProperty('--store-bar-fg');
    }
  });
}

function mobileDrawer(): Child {
  return when(mobileDrawerOpen, () => {
    const close = () => setMobileDrawer(false);
    const link = (label: string, iconName: string, onClick: () => void) =>
      h('button', { class: 'navitem', onclick: () => { onClick(); close(); } }, icon(iconName), h('span', null, label));

    return [
      h('div', { class: 'drawer-scrim', onclick: close }),
      h('nav', { class: 'drawer', 'aria-label': 'Menu' },
        ...visibleSections().map((s) =>
          link(t(s.label), s.icon, () => { const store = currentStoreId(); if (store) navigate(sectionHref(store, s)); }),
        ),
        h('div', { style: { 'border-top': '1px solid var(--divider)', 'margin-top': 'var(--sp-2)', 'padding-top': 'var(--sp-2)' } },
          link('Docs', 'book', () => window.open('https://docs.msupply.foundation', '_blank')),
          link('Sync', 'radio', () => {}),
          link('Logout', 'power', () => confirmDialog({ title: 'Log out?', confirmLabel: 'Log out', message: 'You will be returned to the login screen.', onConfirm: () => navigate('/login') })),
        ),
      ),
    ];
  });
}

export function shell(outlet: Getter<Child>): HTMLElement {
  applyStoreColour();
  void route; // route drives outlet re-render via the caller

  return h(
    'div',
    { class: () => `shell${fullscreen() ? ' fullscreen' : ''}` },
    h('div', { class: 'shell__nav desktop-only' }, sidebar()),
    h('div', { class: 'shell__page' }, topbar(), h('main', { class: 'page-outlet', role: 'main' }, outlet)),
    h('div', { class: 'shell__bottom' }, bottomBar()),
    mobileDrawer(),
  );
}
