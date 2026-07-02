import { For, Show, type JSX } from 'solid-js';
import { Portal } from 'solid-js/web';
import { useNavigate, useParams, useLocation } from '@solidjs/router';
import { Icon } from '../ui/Icon';
import { NAV_SECTIONS, sectionForArea } from './nav-config';
import { mobileNavOpen, setMobileNav } from '../state/chrome';
import { currentUser } from '../state/auth';

/*
 * Mobile / tablet nav (chrome/01-behaviours.md#mobile--tablet-nav): a top bar with a
 * menu toggle (custom icon set — divergence D4, not the framework hamburger),
 * breadcrumbs, and the brand mark. The menu opens a slide-down drawer with the nav
 * links plus Docs (external), Sync, Settings (gated), and Logout.
 */

export function MobileNav(): JSX.Element {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const section = () => sectionForArea(location.pathname.split('/').filter(Boolean)[1]);
  const go = (path: string) => {
    setMobileNav(false);
    navigate(`/${params.storeId}/${path}`);
  };

  return (
    <>
      <header class="mobile-topbar">
        <button
          type="button"
          class="btn btn-ghost btn-icon-only"
          aria-label={mobileNavOpen() ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileNavOpen()}
          onClick={() => setMobileNav(!mobileNavOpen())}
        >
          <Icon name={mobileNavOpen() ? 'close' : 'menu-dots'} size={24} />
        </button>
        <div class="mobile-crumbs">
          <Show when={section()}>
            <Icon name={section()!.icon} size={20} />
            <span>{section()!.label}</span>
          </Show>
        </div>
        <Icon name="m-supply-guy" size={32} />
      </header>

      <Show when={mobileNavOpen()}>
        <Portal>
          <div class="mobile-drawer-scrim" onClick={() => setMobileNav(false)}>
            <nav class="mobile-drawer" aria-label="Main navigation" onClick={(e) => e.stopPropagation()}>
              <For each={NAV_SECTIONS}>
                {(s) => (
                  <button type="button" class="mobile-nav-item" onClick={() => go(s.path)}>
                    <Icon name={s.icon} size={24} />
                    <span>{s.label}</span>
                  </button>
                )}
              </For>
              <div class="menu-divider" />
              <a class="mobile-nav-item" href="https://docs.msupply.foundation" target="_blank" rel="noreferrer">
                <Icon name="book" size={24} />
                <span>Docs</span>
              </a>
              <Show when={currentUser()}>
                <button type="button" class="mobile-nav-item" onClick={() => go('logout')}>
                  <Icon name="power" size={24} />
                  <span>Logout</span>
                </button>
              </Show>
            </nav>
          </div>
        </Portal>
      </Show>
    </>
  );
}
