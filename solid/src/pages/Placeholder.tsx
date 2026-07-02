import { type JSX } from 'solid-js';
import { useLocation } from '@solidjs/router';
import { Icon } from '../ui/Icon';
import { sectionForArea } from '../chrome/nav-config';

/*
 * Stand-in for nav sections that are out of scope for this build (only the stocktakes
 * vertical under Inventory is implemented). Keeps the chrome navigable end to end.
 */
export function Placeholder(): JSX.Element {
  const location = useLocation();
  const section = () => sectionForArea(location.pathname.split('/').filter(Boolean)[1]);
  return (
    <div class="page">
      <div class="page-body placeholder">
        <Icon name={section()?.icon ?? 'dashboard'} size={48} />
        <h1>{section()?.label ?? 'Section'}</h1>
        <p>This section is not implemented in this build. The stocktakes vertical lives under Inventory.</p>
      </div>
    </div>
  );
}
