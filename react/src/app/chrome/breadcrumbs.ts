import { NAV_SECTIONS, type NavSection } from './navConfig';

const SEGMENT_LABELS: Record<string, string> = {
  inventory: 'nav.inventory',
  stocktakes: 'stocktakes.title',
  dashboard: 'nav.dashboard',
  reports: 'nav.reports',
  settings: 'nav.settings',
};

export interface Crumb {
  labelKey: string;
  path: string;
}

/** The nav section that owns the current route (longest path-prefix match). */
export function activeSection(pathname: string): NavSection | undefined {
  return NAV_SECTIONS.filter((s) => pathname.startsWith(s.path.split('/').slice(0, 2).join('/')))
    .sort((a, b) => b.path.length - a.path.length)[0];
}

/** Breadcrumb trail derived from the path segments. */
export function crumbsFor(pathname: string): Crumb[] {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: Crumb[] = [];
  let acc = '';
  for (const seg of segments) {
    acc += `/${seg}`;
    const labelKey = SEGMENT_LABELS[seg];
    if (labelKey) crumbs.push({ labelKey, path: acc });
  }
  return crumbs;
}
