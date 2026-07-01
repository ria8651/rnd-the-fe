/**
 * Mobile / tablet nav (spec/chrome/01-behaviours.md › Mobile / tablet nav). A top bar with a
 * menu toggle (open/close glyph from the custom set — divergence D4: `menu-dots` ↔ `close`),
 * the current section as breadcrumb, and the brand mark. The menu opens a slide-down drawer
 * with the nav links plus Docs (external), Sync, Settings (permission-gated), and Logout.
 */
import { type JSX, For, Show, createMemo, createSignal } from 'solid-js';
import { A, useLocation, useNavigate } from '@solidjs/router';
import { Icon } from '../ui/Icon';
import { ConfirmDialog } from '../ui/Modal';
import { auth } from '../state/auth';
import { navGroups, activeNavItem, isActive } from './nav-config';

export function MobileNav(): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const [confirm, setConfirm] = createSignal(false);
  const location = useLocation();
  const navigate = useNavigate();
  const section = createMemo(() => activeNavItem(location.pathname));
  const items = createMemo(() => navGroups.flatMap((g) => g.items).filter((i) => i.visible?.() ?? true));

  const doLogout = () => {
    setConfirm(false);
    setOpen(false);
    auth.logout();
    navigate('/login');
  };

  return (
    <>
      <div class="mobile-bar">
        <button
          class="icon-btn icon-btn--plain"
          type="button"
          aria-label={open() ? 'Close menu' : 'Open menu'}
          aria-expanded={open()}
          onClick={() => setOpen(!open())}
        >
          <Icon name={open() ? 'close' : 'menu-dots'} size={22} />
        </button>
        <span style={{ 'font-weight': 600 }}>{section()?.label ?? 'open mSupply'}</span>
        <span class="mobile-bar__brand">
          <Icon name="m-supply-guy" size={26} />
        </span>
      </div>

      <Show when={open()}>
        <div class="mobile-drawer">
          <div class="mobile-drawer__scrim" onClick={() => setOpen(false)} />
          <nav class="mobile-drawer__panel" aria-label="Primary">
            <ul class="menu" style={{ 'max-height': 'none' }}>
              <For each={items()}>
                {(item) => (
                  <li role="none">
                    <A
                      href={item.route}
                      class={`menu-item${isActive(item.route, location.pathname) ? ' menu-item--selected' : ''}`}
                      onClick={() => setOpen(false)}
                    >
                      <Icon name={item.icon} size={20} />
                      <span class="menu-item__label">{item.label}</span>
                    </A>
                  </li>
                )}
              </For>
              <li role="none">
                <a class="menu-item" href="https://docs.msupply.foundation" target="_blank" rel="noreferrer">
                  <Icon name="book" size={20} />
                  <span class="menu-item__label">Docs</span>
                  <Icon name="external-link" size={14} />
                </a>
              </li>
              <li role="none">
                <A href="/sync" class="menu-item" onClick={() => setOpen(false)}>
                  <Icon name="radio" size={20} />
                  <span class="menu-item__label">Sync</span>
                </A>
              </li>
              <Show when={auth.can('ServerAdmin') || auth.can('EditStore')}>
                <li role="none">
                  <A href="/settings" class="menu-item" onClick={() => setOpen(false)}>
                    <Icon name="settings" size={20} />
                    <span class="menu-item__label">Settings</span>
                  </A>
                </li>
              </Show>
              <li role="none">
                <button type="button" class="menu-item" onClick={() => setConfirm(true)}>
                  <Icon name="power" size={20} />
                  <span class="menu-item__label">Logout</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </Show>

      <ConfirmDialog
        open={confirm()}
        title="Log out?"
        message="You will be returned to the login screen."
        confirmLabel="Log out"
        onConfirm={doLogout}
        onCancel={() => setConfirm(false)}
      />
    </>
  );
}
