import { createSignal, For, Show, type ParentComponent } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { Icon, type IconName } from '../ui/Icon';
import { StoreSelector } from './StoreSelector';
import { ThemeToggle } from './ThemeToggle';
import { useStore } from '../../context/StoreContext';
import './chrome.css';

// Data-driven nav (chrome/01-behaviours.md): a list of (icon,label,route,enabled).
// Only the Inventory › Stocktakes route is implemented in this build; the rest are
// shown-but-disabled to preserve the shell's shape without pretending to work.
interface NavEntry {
  icon: IconName;
  label: string;
  route?: string;
  disabled?: boolean;
}

const NAV: NavEntry[] = [
  { icon: 'dashboard', label: 'Dashboard', disabled: true },
  { icon: 'stock', label: 'Stocktakes', route: '/stocktakes' },
];

const COLLAPSE_KEY = 'oms.sidebarCollapsed';

export const AppShell: ParentComponent = (props) => {
  const location = useLocation();
  const store = useStore();
  const [collapsed, setCollapsed] = createSignal(localStorage.getItem(COLLAPSE_KEY) === 'true');

  const toggle = () => {
    const next = !collapsed();
    setCollapsed(next);
    localStorage.setItem(COLLAPSE_KEY, String(next));
  };

  const isActive = (route?: string) => !!route && location.pathname.startsWith(route);

  return (
    <div class="shell">
      <aside class="sidebar" data-collapsed={collapsed()}>
        <div class="sidebar__brand">
          <button class="btn btn--ghost btn--icon" aria-label="Toggle navigation" onClick={toggle}>
            <Icon name="sidebar" size={22} />
          </button>
          <Show when={!collapsed()}>
            <span>open&#8209;mSupply</span>
          </Show>
        </div>
        <nav class="sidebar__nav" aria-label="Primary">
          <For each={NAV}>
            {(item) =>
              item.route && !item.disabled ? (
                <A href={item.route} class="nav-item" data-active={isActive(item.route)} title={item.label}>
                  <Icon name={item.icon} size={22} />
                  <Show when={!collapsed()}>{item.label}</Show>
                </A>
              ) : (
                <div class="nav-item" data-disabled="true" title={`${item.label} (not in this build)`}>
                  <Icon name={item.icon} size={22} />
                  <Show when={!collapsed()}>{item.label}</Show>
                </div>
              )
            }
          </For>
        </nav>
      </aside>

      <main class="main">{props.children}</main>

      <footer class="footer">
        <StoreSelector />
        <div class="grow" />
        <Show when={store.activeStore()}>
          <span class="muted" style={{ 'font-size': 'var(--type-caption)' }}>
            {store.activeStore()?.code}
          </span>
        </Show>
        <ThemeToggle />
      </footer>
    </div>
  );
};
