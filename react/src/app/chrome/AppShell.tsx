import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/app/auth/AuthContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Banner } from '@/components/Banner';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomBar } from './BottomBar';
import { MobileNavDrawer } from './MobileNavDrawer';
import { useSidebarState } from './useSidebarState';
import './AppShell.css';

/**
 * The persistent app frame that wraps routed page content (spec/chrome).
 * Composes the sidebar, top bar, routed content, and bottom bar; manages
 * full-screen mode (hides the sidebar — AC-CH16) and the mobile nav drawer.
 */
export function AppShell() {
  const { collapsed, toggle } = useSidebarState();
  const [fullscreen, setFullscreen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const { logout, loading, error } = useAuth();

  return (
    <div className={`oms-app${fullscreen ? ' is-fullscreen' : ''}`}>
      <div className="oms-app__body">
        {!fullscreen && (
          <div className="oms-app__sidebar">
            <Sidebar collapsed={collapsed} onToggle={toggle} />
          </div>
        )}
        <div className="oms-app__main">
          <TopBar
            fullscreen={fullscreen}
            onToggleFullscreen={() => setFullscreen((v) => !v)}
            onOpenMenu={() => setMenuOpen((v) => !v)}
            menuOpen={menuOpen}
          />
          <main className="oms-app__page">
            {error ? (
              <div style={{ padding: 'var(--sp-6)' }}>
                <Banner tone="error" title="Couldn't reach the server">
                  {error}. Is the dev GraphQL server running on :8000?
                </Banner>
              </div>
            ) : loading ? (
              <div className="oms-app__splash">Loading stores…</div>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>

      <BottomBar />

      <MobileNavDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onLogout={() => {
          setMenuOpen(false);
          setConfirmLogout(true);
        }}
      />

      <ConfirmDialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          logout();
        }}
        title="Log out?"
        message="You will be returned to the login screen."
        confirmLabel="Log out"
        cancelLabel="Stay"
      />
    </div>
  );
}
