import './theme/styles.css';
import { h, mount, clear, type Child } from './core/dom';
import { icon } from './icons';
import { effect, computed } from './core/signal';
import { route, navigate } from './core/router';
import { initTheme } from './theme/theme';
import { applyDirection, t } from './context/i18n';
import { initAuth, currentStoreId, stores, setCurrentStoreId } from './context/auth';
import { shell } from './chrome/shell';
import { rootPath } from './chrome/bottomBar';
import { stocktakesList } from './features/stocktakes/list';
import { stocktakeDetail } from './features/stocktakes/detail';
import { button } from './components/button';
import { toast } from './components/toast';

const appEl = document.getElementById('app')!;

function placeholder(area: string): HTMLElement {
  return h('div', { class: 'page' },
    h('div', { class: 'appbar' }, h('h1', { style: { font: 'var(--type-heading)', margin: 0 } }, area.charAt(0).toUpperCase() + area.slice(1))),
    h('div', { class: 'page__body' },
      h('div', { class: 'table-state' },
        icon('info-outline', { size: 32 }),
        h('p', null, 'This section is not part of this build.'),
        h('p', { class: 'muted small' }, 'The plain-TS implementation covers the app shell and the Stocktakes vertical.'),
      ),
    ),
  );
}

function renderRoute(): Child {
  const segs = route().segments;
  const area = segs[1];
  const vertical = segs[2];
  const record = segs[3];
  if (area === 'inventory' && vertical === 'stocktakes') {
    return record ? stocktakeDetail(record) : stocktakesList();
  }
  return placeholder(area || 'dashboard');
}

function loginView(): HTMLElement {
  return h('div', { class: 'scrim', style: { position: 'static', background: 'var(--surface-base)', height: '100%' } },
    h('div', { class: 'modal modal--sm' },
      h('div', { class: 'modal__body stack', style: { 'text-align': 'center', 'align-items': 'center' } },
        icon('m-supply-guy', { size: 64 }),
        h('h1', { style: { font: 'var(--type-heading)' } }, 'open mSupply'),
        h('p', { class: 'muted' }, 'You have been signed out.'),
        button({ label: 'Sign in', variant: 'primary', onClick: () => navigate(rootPath(currentStoreId() || '')) }),
      ),
    ),
  );
}

// Keep the active store in sync with the leading URL segment (AC-CH8b).
function syncStoreFromUrl() {
  effect(() => {
    const seg = route().storeId;
    const list = stores();
    if (!seg || seg === 'login' || list.length === 0) return;
    if (seg === currentStoreId()) return;
    const match = list.find((s) => s.id === seg);
    if (match) {
      setCurrentStoreId(match.id);
    } else {
      // No access to that store: route to a safe default with a notice.
      toast('That store is not available; showing your default store.', 'info');
      navigate(rootPath(currentStoreId() || list[0].id), { replace: true });
    }
  });
}

async function boot() {
  initTheme();
  applyDirection();
  void t; // i18n ready

  await initAuth(route().storeId);
  const store = currentStoreId();

  // Redirect bare root / missing store to the landing path.
  if (route().segments.length === 0 && store) {
    navigate(rootPath(store), { replace: true });
  }

  syncStoreFromUrl();

  // Top-level: swap between the login screen (no chrome) and the app shell.
  // This only re-runs when the login/app mode flips, so chrome persists across
  // in-app navigation (the routed outlet updates instead).
  const mode = computed(() => (route().segments[0] === 'login' ? 'login' : 'app'));
  let current = '';
  effect(() => {
    const m = mode();
    if (m === current) return;
    current = m;
    clear(appEl);
    mount(appEl, m === 'login' ? loginView() : shell(renderRoute));
  });
}

boot();
