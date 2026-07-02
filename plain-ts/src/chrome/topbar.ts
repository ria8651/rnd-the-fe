import { h } from '../core/dom';
import { icon } from '../icons';
import { route } from '../core/router';
import { iconButton } from '../components/button';
import { activeSection } from './nav';
import { t } from '../context/i18n';
import { fullscreen, toggleFullscreen, mobileDrawerOpen, setMobileDrawer } from './state';

function crumbLabel(segment: string): string {
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function topbar(): HTMLElement {
  const section = () => activeSection(route().segments[1]);

  const crumbs = () => {
    const segs = route().segments.slice(2); // after store + area
    const sec = section();
    const parts: string[] = [];
    if (sec) parts.push(t(sec.label));
    for (const s of segs) parts.push(crumbLabel(s));
    return parts;
  };

  const menuToggle = h('button', {
    class: 'iconbtn mobile-only',
    'aria-label': () => (mobileDrawerOpen() ? 'Close menu' : 'Open menu'),
    'aria-expanded': () => (mobileDrawerOpen() ? 'true' : 'false'),
    onclick: () => setMobileDrawer(!mobileDrawerOpen()),
  }, () => icon(mobileDrawerOpen() ? 'close' : 'sidebar'));

  return h(
    'header',
    { class: 'topbar', role: 'banner' },
    menuToggle,
    h('div', { class: 'topbar__crumbs' }, () => {
      const sec = section();
      return h(
        'span',
        { class: 'row', style: { gap: 'var(--sp-2)' } },
        sec ? icon(sec.icon) : null,
        h('span', null, crumbs().join(' / ')),
      );
    }),
    h('div', { class: 'topbar__spacer' }),
    // Full-screen toggle (desktop): enters full-screen (hides sidebar).
    iconButton({
      icon: 'minimise',
      label: fullscreen() ? 'Exit full screen' : 'Full screen',
      onClick: toggleFullscreen,
    }),
  );
}
