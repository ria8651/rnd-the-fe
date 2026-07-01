import { useCallback, useEffect, useState } from 'react';

/**
 * Sidebar collapse/expand state per spec/chrome/01-behaviours.md:
 *  - Responsive default: until the user overrides it, the state follows the
 *    viewport (auto-collapsed on medium-and-smaller, auto-expanded on larger).
 *  - After an explicit toggle, the user's choice wins and persists across navigation.
 */
const KEY = 'oms.sidebarCollapsed';
const MEDIUM = '(max-width: 1024px)';

export function useSidebarState() {
  const [explicit, setExplicit] = useState<boolean | null>(() => {
    const v = localStorage.getItem(KEY);
    return v == null ? null : v === 'true';
  });
  const [autoCollapsed, setAutoCollapsed] = useState(
    () => window.matchMedia(MEDIUM).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(MEDIUM);
    const onChange = (e: MediaQueryListEvent) => setAutoCollapsed(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const collapsed = explicit ?? autoCollapsed;

  const toggle = useCallback(() => {
    const next = !collapsed;
    setExplicit(next);
    localStorage.setItem(KEY, String(next));
  }, [collapsed]);

  return { collapsed, toggle };
}
