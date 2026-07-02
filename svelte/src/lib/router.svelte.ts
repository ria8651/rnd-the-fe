// Small history-based SPA router. The URL is the single source of truth for
// navigable view state (spec ui-standards/urls.md): path = store/area/vertical/record,
// query string = list modifiers (search/filter/sort/page).

class Router {
  path = $state(window.location.pathname);
  query = $state(new URLSearchParams(window.location.search));

  constructor() {
    window.addEventListener('popstate', () => this.sync());
    // Intercept internal link clicks so anchors behave as SPA navigation but
    // still expose a real href (browser status bar, open-in-new-tab, a11y).
    document.addEventListener('click', (e) => this.onClick(e));
  }

  private sync() {
    this.path = window.location.pathname;
    this.query = new URLSearchParams(window.location.search);
  }

  private onClick(e: MouseEvent) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    const anchor = (e.target as HTMLElement).closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || !href.startsWith('/') || anchor.target === '_blank' || anchor.hasAttribute('download'))
      return;
    e.preventDefault();
    this.navigate(href);
  }

  /** segments of the current path, e.g. ["STORE","inventory","stocktakes"] */
  get segments(): string[] {
    return this.path.split('/').filter(Boolean);
  }

  navigate(to: string, opts: { replace?: boolean } = {}) {
    if (to === this.path + (this.query.toString() ? `?${this.query}` : '')) return;
    if (opts.replace) history.replaceState({}, '', to);
    else history.pushState({}, '', to);
    this.sync();
    // A push (new screen) starts at the top.
    if (!opts.replace) window.scrollTo(0, 0);
  }

  /** Rewrite only the query string of the current path (history replace by default). */
  setQuery(params: URLSearchParams, opts: { replace?: boolean } = { replace: true }) {
    const qs = params.toString();
    const to = this.path + (qs ? `?${qs}` : '');
    this.navigate(to, opts);
  }
}

export const router = new Router();

/** Build a store-scoped path. */
export function storePath(storeId: string, ...rest: string[]): string {
  return '/' + [storeId, ...rest].filter(Boolean).join('/');
}
