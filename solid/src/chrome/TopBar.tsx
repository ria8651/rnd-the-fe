/**
 * Desktop section top bar (spec/chrome/01-behaviours.md › Desktop top bar): the active nav
 * section's icon + the breadcrumb trail for the current route, and a full-screen toggle
 * (enter hides the sidebar; exit uses the `minimise` glyph, AC-CH16).
 */
import { type JSX, For, Show, createMemo } from 'solid-js';
import { useLocation } from '@solidjs/router';
import { Icon } from '../ui/Icon';
import { chrome } from '../state/chrome';
import { activeNavItem } from './nav-config';

function titleCase(seg: string): string {
  return seg.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TopBar(): JSX.Element {
  const location = useLocation();
  const section = createMemo(() => activeNavItem(location.pathname));
  const crumbs = createMemo(() => {
    const sec = section();
    const label = sec?.label ?? titleCase(location.pathname.split('/').filter(Boolean)[0] ?? 'Home');
    const rest = sec
      ? location.pathname
          .slice(sec.route.length)
          .split('/')
          .filter(Boolean)
          .map(titleCase)
      : [];
    return [label, ...rest];
  });

  return (
    <div class="topbar">
      <Show when={section()}>
        <Icon name={section()!.icon} size={20} />
      </Show>
      <div class="topbar__crumbs" aria-label="Breadcrumb">
        <For each={crumbs()}>
          {(crumb, i) => (
            <>
              <Show when={i() > 0}>
                <span class="topbar__crumb-sep" aria-hidden="true">
                  /
                </span>
              </Show>
              <span class={`topbar__crumb${i() === crumbs().length - 1 ? ' topbar__crumb--last' : ''}`}>{crumb}</span>
            </>
          )}
        </For>
      </div>
      <div class="topbar__spacer" />
      <button
        class="icon-btn icon-btn--plain"
        type="button"
        aria-label={chrome.fullscreen ? 'Exit full screen' : 'Enter full screen'}
        onClick={() => chrome.setFullscreen(!chrome.fullscreen)}
      >
        <Icon name={chrome.fullscreen ? 'minimise' : 'maximise'} size={20} />
      </button>
    </div>
  );
}
