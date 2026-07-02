import { Show, createEffect, type JSX } from 'solid-js';
import { useParams, useNavigate, type RouteSectionProps } from '@solidjs/router';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { BottomBar } from './BottomBar';
import { ToastHost } from '../ui/Toast';
import { isDesktop } from '../state/viewport';
import { fullScreen } from '../state/chrome';
import { stores, setActiveStoreId, defaultStoreId } from '../state/store';

/*
 * The app shell (layout.md#the-frame): navigation + bottom bar belong to the shell;
 * the routed page fills the rest. Routing is store-scoped (urls.md#store-in-the-url):
 * the active store is the leading path segment; this layout syncs it and, if the URL
 * names a store the user can't access, routes to a safe default. The sidebar is the
 * desktop primary nav; below desktop, the mobile/tablet drawer nav takes over. The
 * sidebar is hidden in full-screen mode.
 */

export function AppShell(props: RouteSectionProps): JSX.Element {
  const params = useParams();
  const navigate = useNavigate();

  createEffect(() => {
    const id = params.storeId;
    const list = stores();
    if (!id) return;
    setActiveStoreId(id);
    // Once the store list has loaded, redirect away from an inaccessible store.
    if (list.length > 0 && !list.some((s) => s.id === id)) {
      const fallback = defaultStoreId();
      if (fallback) navigate(`/${fallback}/dashboard`, { replace: true });
    }
  });

  const showSidebar = () => isDesktop() && !fullScreen();

  return (
    <div class={`app-frame${showSidebar() ? '' : ' no-nav'}`}>
      <Show when={showSidebar()}>
        <div class="app-nav">
          <Sidebar />
        </div>
      </Show>
      <div class="app-main">
        <Show when={isDesktop()} fallback={<MobileNav />}>
          <TopBar />
        </Show>
        <main class="app-content">{props.children}</main>
      </div>
      <div class="app-bottombar">
        <BottomBar />
      </div>
      <ToastHost />
    </div>
  );
}
