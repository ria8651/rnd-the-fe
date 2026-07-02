// History-based router. URLs follow ui-standards/urls.md:
//   /{store}/{area}/{vertical}[/{record}][/{sub-view}]  +  query for list state.
import { signal } from './signal';

export interface Route {
  path: string;
  segments: string[]; // path split, empty removed
  storeId: string | null; // leading segment
  query: URLSearchParams;
}

function parse(): Route {
  const path = location.pathname;
  const segments = path.split('/').filter(Boolean);
  return {
    path,
    segments,
    storeId: segments[0] ?? null,
    query: new URLSearchParams(location.search),
  };
}

const [routeGet, routeSet] = signal<Route>(parse());
export const route = routeGet;

function refresh() {
  routeSet(parse());
}

window.addEventListener('popstate', refresh);

export interface NavOptions {
  replace?: boolean;
}

export function navigate(to: string, opts: NavOptions = {}) {
  if (to === location.pathname + location.search) return;
  if (opts.replace) history.replaceState(null, '', to);
  else history.pushState(null, '', to);
  refresh();
}

/** Build a URL from path + query, omitting params equal to their default. */
export function buildUrl(path: string, query: Record<string, string | null | undefined>, defaults: Record<string, string> = {}): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v == null || v === '') continue;
    if (defaults[k] !== undefined && v === defaults[k]) continue;
    params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * Update list-state query params on the current path. Editing list state
 * replaces history (so Back doesn't unwind every keystroke — urls.md § History).
 */
export function setQuery(updates: Record<string, string | null | undefined>, opts: NavOptions = { replace: true }) {
  const params = new URLSearchParams(location.search);
  for (const [k, v] of Object.entries(updates)) {
    if (v == null || v === '') params.delete(k);
    else params.set(k, v);
  }
  const qs = params.toString();
  navigate(location.pathname + (qs ? `?${qs}` : ''), opts);
}

/** Swap the leading store segment, keeping the rest of the path. */
export function withStore(storeId: string, rest: string): string {
  const cleaned = rest.replace(/^\/+/, '');
  return `/${storeId}${cleaned ? '/' + cleaned : ''}`;
}
