// Hash router. Hash-based so it needs no server rewrite rules and works from a
// static build. URL shape: `#/path/segments?query=params`. Query params are the
// canonical home for filter/sort/page state (see the spec's URL-state rule:
// ../spec/ui-standards/tables.md#filtering).

import { signal, type ReadSignal } from './signal.ts';

export interface Route {
  path: string; // e.g. "/stocktakes/123"
  segments: string[]; // ["stocktakes", "123"]
  query: URLSearchParams;
}

function parse(): Route {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const [rawPath, rawQuery = ''] = hash.split('?');
  const path = rawPath || '/';
  const segments = path.split('/').filter(Boolean);
  return { path, segments, query: new URLSearchParams(rawQuery) };
}

const route = signal<Route>(parse());

window.addEventListener('hashchange', () => route.set(parse()));

export const currentRoute: ReadSignal<Route> = route;

export function navigate(path: string, query?: URLSearchParams | Record<string, string>): void {
  let qs = '';
  if (query instanceof URLSearchParams) {
    qs = query.toString();
  } else if (query) {
    qs = new URLSearchParams(query).toString();
  }
  window.location.hash = qs ? `${path}?${qs}` : path;
}

/**
 * Replace the query string of the current route without adding a history entry
 * spam. Used when filters/sort/page change so the view stays shareable.
 */
export function setQuery(next: URLSearchParams): void {
  const qs = next.toString();
  const path = route().path;
  const newHash = qs ? `#${path}?${qs}` : `#${path}`;
  if (window.location.hash !== newHash) {
    history.replaceState(null, '', newHash);
    route.set(parse());
  }
}

export function link(path: string, query?: Record<string, string>): string {
  const qs = query ? new URLSearchParams(query).toString() : '';
  return qs ? `#${path}?${qs}` : `#${path}`;
}
