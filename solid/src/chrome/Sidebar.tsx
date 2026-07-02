import { For, Show, createSignal, createEffect, type JSX } from 'solid-js';
import { useLocation, useParams } from '@solidjs/router';
import { Icon } from '../ui/Icon';
import { NAV_SECTIONS, type NavSection } from './nav-config';
import { sidebarExpanded, toggleSidebar, sidebarSpin } from '../state/chrome';

/*
 * Desktop primary nav (chrome/01-behaviours.md#sidebar). Two states — expanded
 * (icon + label) and collapsed icon rail — with an animated width transition. The
 * brand mark IS the toggle (divergence D3): activating it toggles state and plays a
 * single 360° spin (suppressed under reduced-motion). No hover-to-peek. Nav items
 * are links reflecting the active route.
 */

export function Sidebar(): JSX.Element {
  const params = useParams();
  const location = useLocation();
  const [spinning, setSpinning] = createSignal<'open' | 'close' | null>(null);

  // Play the spin once whenever the toggle direction changes.
  createEffect(() => {
    const dir = sidebarSpin();
    if (!dir) return;
    setSpinning(dir);
    const t = setTimeout(() => setSpinning(null), 600);
    return () => clearTimeout(t);
  });

  const isActive = (s: NavSection) =>
    location.pathname.startsWith(`/${params.storeId}/${s.area}`);
  const href = (s: NavSection) => `/${params.storeId}/${s.path}`;

  const Item = (p: { s: NavSection }) => (
    <a
      href={href(p.s)}
      class={`nav-item${isActive(p.s) ? ' nav-item-active' : ''}`}
      title={sidebarExpanded() ? undefined : p.s.label}
      aria-current={isActive(p.s) ? 'page' : undefined}
    >
      <Icon name={p.s.icon} size={24} />
      <Show when={sidebarExpanded()}>
        <span class="nav-label">{p.s.label}</span>
      </Show>
    </a>
  );

  return (
    <nav class={`sidebar${sidebarExpanded() ? ' sidebar-expanded' : ' sidebar-collapsed'}`} aria-label="Main navigation">
      <div class="sidebar-brand">
        <button
          type="button"
          class={`brand-toggle${spinning() ? ` brand-spin-${spinning()}` : ''}`}
          onClick={() => toggleSidebar()}
          aria-label={sidebarExpanded() ? 'Close the menu' : 'Open the menu'}
          aria-expanded={sidebarExpanded()}
        >
          <Icon name="m-supply-guy" size={40} />
        </button>
      </div>
      <div class="sidebar-sections">
        <div class="sidebar-group">
          <For each={NAV_SECTIONS.filter((s) => s.group === 'upper')}>{(s) => <Item s={s} />}</For>
        </div>
        <div class="sidebar-group sidebar-group-lower">
          <For each={NAV_SECTIONS.filter((s) => s.group === 'lower')}>{(s) => <Item s={s} />}</For>
        </div>
      </div>
    </nav>
  );
}
