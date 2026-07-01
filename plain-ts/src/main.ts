import './styles/global.css';
import { el, mount } from './framework/dom.ts';
import { effect, untrack } from './framework/signal.ts';
import { currentRoute, navigate } from './framework/router.ts';
import { initTheme } from './theme/theme.ts';
import { loadStores, activeStore } from './api/store.ts';
import { renderShell, type Breadcrumb } from './chrome/shell.ts';
import { GraphQLError } from './api/client.ts';
import { renderStocktakeList } from './features/stocktakes/list.ts';
import { renderStocktakeDetail } from './features/stocktakes/detail.ts';
import { renderCreateStocktake } from './features/stocktakes/create.ts';

const app = document.getElementById('app')!;

interface Page {
  node: Node;
  breadcrumbs: Breadcrumb[];
}

function notFound(): Page {
  return {
    node: el('div', { class: 'banner banner-warning' }, 'Page not found.'),
    breadcrumbs: [{ label: 'Not found' }],
  };
}

function route(): Page {
  const { segments } = currentRoute();
  const storeId = activeStore()?.id;
  if (!storeId) {
    return { node: el('div', { class: 'banner banner-info' }, 'No store selected.'), breadcrumbs: [{ label: 'Stocktakes' }] };
  }

  // `/` or `/stocktakes`
  if (segments.length === 0 || (segments[0] === 'stocktakes' && segments.length === 1)) {
    return { node: renderStocktakeList(storeId), breadcrumbs: [{ label: 'Stocktakes' }] };
  }

  if (segments[0] === 'stocktakes') {
    if (segments[1] === 'new') {
      return {
        node: renderCreateStocktake(storeId),
        breadcrumbs: [{ label: 'Stocktakes', href: '#/stocktakes' }, { label: 'New' }],
      };
    }
    // /stocktakes/number/:n  → deep link by human number
    if (segments[1] === 'number' && segments[2]) {
      return {
        node: renderStocktakeDetail(storeId, { byNumber: Number(segments[2]) }),
        breadcrumbs: [{ label: 'Stocktakes', href: '#/stocktakes' }, { label: `#${segments[2]}` }],
      };
    }
    // /stocktakes/:id
    return {
      node: renderStocktakeDetail(storeId, { id: segments[1] }),
      breadcrumbs: [{ label: 'Stocktakes', href: '#/stocktakes' }, { label: 'Detail' }],
    };
  }

  return notFound();
}

async function bootstrap() {
  initTheme();
  mount(app, el('div', { class: 'page' }, el('div', { class: 'caption' }, 'Loading…')));

  try {
    await loadStores();
  } catch (e) {
    const message = e instanceof GraphQLError ? e.message : 'Failed to start.';
    mount(app, el('div', { class: 'page' }, el('div', { class: 'banner banner-error' }, message)));
    return;
  }

  if (currentRoute().segments.length === 0) navigate('/stocktakes');

  // Re-render the shell + page whenever the route (or active store) changes.
  // Subscribe to route + store here, but build the page *untracked* so a page's
  // own internal signal reads during setup don't leak into this route effect
  // (which would rebuild the whole page — and reset its state — on every
  // internal change).
  effect(() => {
    currentRoute();
    activeStore();
    untrack(() => {
      const page = route();
      mount(app, renderShell(page.node, page.breadcrumbs));
    });
  });
}

bootstrap();
