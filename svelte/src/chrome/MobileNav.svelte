<script lang="ts">
  // Mobile / tablet slide-down nav drawer (spec chrome/01-behaviours.md › mobile nav).
  // Nav links + Docs (external), Sync, Settings (gated), Logout. Uses the custom icon
  // set for the toggle (divergence D4) — the toggle itself lives in TopBar.
  import Icon from '../lib/components/Icon.svelte';
  import ConfirmDialog from '../lib/components/ConfirmDialog.svelte';
  import { portal } from '../lib/util/portal';
  import { chrome } from '../lib/state/chrome.svelte';
  import { auth } from '../lib/state/auth.svelte';
  import { router } from '../lib/router.svelte';
  import { ALL_NAV, itemPath } from '../lib/nav';

  let storeId = $derived(auth.activeStoreId ?? '');
  let logoutConfirm = $state(false);
</script>

{#if chrome.mobileNavOpen}
  <div class="drawer-wrap" use:portal>
    <button class="scrim" aria-label="Close menu" onclick={() => chrome.closeMobileNav()}></button>
    <nav class="drawer" aria-label="Primary">
      <ul>
        {#each ALL_NAV as item (item.key)}
          <li>
            <a class="row" href={itemPath(storeId, item)} onclick={() => chrome.closeMobileNav()}>
              <Icon name={item.icon} size={24} /> {item.label}
            </a>
          </li>
        {/each}
        <li class="sep"></li>
        <li>
          <a class="row" href="https://docs.msupply.foundation" target="_blank" rel="noopener">
            <Icon name="book" size={24} /> Docs
          </a>
        </li>
        <li>
          <button class="row" onclick={() => { chrome.closeMobileNav(); logoutConfirm = true; }}>
            <Icon name="power" size={24} /> Logout
          </button>
        </li>
      </ul>
    </nav>
  </div>
{/if}

<ConfirmDialog
  open={logoutConfirm}
  title="Log out?"
  message="You will be returned to the login screen."
  confirmLabel="Log out"
  onconfirm={() => { logoutConfirm = false; auth.logout(); router.navigate('/login'); }}
  oncancel={() => (logoutConfirm = false)}
/>

<style>
  .drawer-wrap {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal);
  }
  .scrim {
    position: absolute;
    inset: 0;
    border: 0;
    background: var(--surface-scrim);
  }
  .drawer {
    position: absolute;
    top: 56px;
    left: 0;
    right: 0;
    max-height: calc(100% - 56px);
    overflow-y: auto;
    background: var(--surface-nav);
    box-shadow: var(--elev-overlay);
    animation: slide 0.2s ease;
  }
  @keyframes slide {
    from {
      transform: translateY(-8px);
      opacity: 0.6;
    }
  }
  ul {
    list-style: none;
    margin: 0;
    padding: var(--sp-2);
  }
  .sep {
    height: 1px;
    background: var(--divider);
    margin: var(--sp-2) 0;
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    width: 100%;
    padding: var(--sp-3);
    border: 0;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    text-align: start;
    cursor: pointer;
    border-radius: var(--radius-control);
    min-height: 48px;
  }
  .row:hover {
    background: var(--hover-overlay);
  }
</style>
