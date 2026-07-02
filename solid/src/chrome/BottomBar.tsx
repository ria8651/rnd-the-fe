import { Show, type JSX } from 'solid-js';
import { Icon } from '../ui/Icon';
import { StoreSelector } from './StoreSelector';
import { LanguageSelector } from './LanguageSelector';
import { UserMenu } from './UserMenu';
import { currentUser } from '../state/auth';
import { toast } from '../state/toast';

/*
 * Chrome bottom bar (chrome/01-behaviours.md#bottom-bar-footer): a slim status strip
 * along the very bottom. Its background is the active store's configured colour with
 * an auto-contrasting foreground; when a store sets none it falls back to the default
 * nav surface (used here, as the basic store node carries no colour). Fixed order:
 * Store · Edit store · User · Language · Central (trailing). Central shows only when
 * connected to a central server (hidden here). Distinct from the page action footer.
 */

// No central-server connection in this build.
const CONNECTED_TO_CENTRAL = false;

export function BottomBar(): JSX.Element {
  return (
    <footer class="bottombar" aria-label="Store and account">
      <StoreSelector />

      <button
        type="button"
        class="bottombar-item"
        onClick={() => toast.info('Store properties editing is out of scope for this build.')}
      >
        <Icon name="edit" size={16} />
        <span class="bottombar-label">Edit</span>
      </button>

      <Show when={currentUser()}>
        <span class="bottombar-divider" aria-hidden="true" />
      </Show>
      <UserMenu />

      <span class="bottombar-divider" aria-hidden="true" />
      <LanguageSelector />

      <Show when={CONNECTED_TO_CENTRAL}>
        <span class="bottombar-spacer" />
        <span class="bottombar-item bottombar-central">
          <Icon name="central" size={16} />
          <span class="bottombar-label">Central</span>
        </span>
      </Show>
    </footer>
  );
}
