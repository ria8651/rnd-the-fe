/**
 * Fallback page for paths without a built-out screen. For a known nav section it shows a
 * "coming soon" placeholder (so the chrome — sidebar, breadcrumbs, active-item highlight —
 * can be exercised end to end); for an unknown path it shows a not-found message.
 */
import { type JSX, Show, createMemo } from 'solid-js';
import { useLocation } from '@solidjs/router';
import { Icon } from '../ui/Icon';
import { activeNavItem } from '../chrome/nav-config';

export function Placeholder(): JSX.Element {
  const location = useLocation();
  const item = createMemo(() => activeNavItem(location.pathname));
  return (
    <Show
      when={item()}
      fallback={
        <div class="placeholder">
          <span class="placeholder__icon">
            <Icon name="circle-alert" size={40} />
          </span>
          <h2>Page not found</h2>
          <p style={{ margin: 0 }}>
            <a href="/dashboard">Back to dashboard</a>
          </p>
        </div>
      }
    >
      <div class="placeholder">
        <span class="placeholder__icon">
          <Icon name={item()!.icon} size={40} />
        </span>
        <h2>{item()!.label}</h2>
        <p style={{ margin: 0 }}>This section is not part of the current spec pass.</p>
      </div>
    </Show>
  );
}
