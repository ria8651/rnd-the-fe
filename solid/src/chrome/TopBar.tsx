import { For, Show, type JSX, createMemo } from 'solid-js';
import { useLocation } from '@solidjs/router';
import { Icon } from '../ui/Icon';
import { sectionForArea } from './nav-config';
import { fullScreen, toggleFullScreen } from '../state/chrome';

/*
 * Desktop top bar (chrome/01-behaviours.md#desktop-top-bar): the active section's
 * icon followed by the breadcrumb trail for the current route, plus a full-screen
 * toggle (exit uses the minimise icon).
 */

function prettify(seg: string): string {
  return seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TopBar(): JSX.Element {
  const location = useLocation();

  const crumbs = createMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    // segments[0] = storeId; the rest are area / vertical / record.
    const rest = segments.slice(1);
    const section = sectionForArea(rest[0]);
    const labels: string[] = [];
    if (section) labels.push(section.label);
    for (let i = 1; i < rest.length; i++) {
      const seg = rest[i]!;
      // A stocktake record is its human number.
      labels.push(rest[i - 1] === 'stocktakes' && /^\d+$/.test(seg) ? `#${seg}` : prettify(seg));
    }
    return { icon: section?.icon ?? 'dashboard', labels };
  });

  return (
    <div class="topbar">
      <div class="topbar-crumbs">
        <Icon name={crumbs().icon} size={20} />
        <For each={crumbs().labels}>
          {(label, i) => (
            <>
              <Show when={i() > 0}>
                <Icon name="chevron-down" size={14} class="crumb-sep topbar-crumb-sep" />
              </Show>
              <span class="topbar-crumb">{label}</span>
            </>
          )}
        </For>
      </div>
      <div class="topbar-actions">
        <button
          type="button"
          class="btn btn-ghost btn-icon-only btn-compact"
          aria-label={fullScreen() ? 'Exit full screen' : 'Full screen'}
          title={fullScreen() ? 'Exit full screen' : 'Full screen'}
          onClick={() => toggleFullScreen()}
        >
          <Icon name={fullScreen() ? 'minimise' : 'maximise'} size={20} />
        </button>
      </div>
    </div>
  );
}
