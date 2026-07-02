<script lang="ts">
  // Chrome bottom bar (spec chrome/01-behaviours.md › bottom bar): a slim status strip
  // along the very bottom. Fixed left→right order: store · edit · user · language ·
  // (central, trailing). Background is the store's colour, falling back to the nav
  // surface (StoreNode exposes no colour), with a contrasting foreground. A theme
  // control (light/dark/system/mui) sits with the trailing controls.
  import Icon from '../lib/components/Icon.svelte';
  import Popover from '../lib/components/Popover.svelte';
  import ConfirmDialog from '../lib/components/ConfirmDialog.svelte';
  import TextInput from '../lib/components/TextInput.svelte';
  import { auth } from '../lib/state/auth.svelte';
  import { i18n, LANGUAGES } from '../lib/state/i18n.svelte';
  import { theme, type ThemeChoice } from '../lib/state/theme.svelte';
  import { router } from '../lib/router.svelte';
  import { rootPath } from '../lib/nav';

  let storeBtn = $state<HTMLElement | null>(null);
  let langBtn = $state<HTMLElement | null>(null);
  let userBtn = $state<HTMLElement | null>(null);
  let themeBtn = $state<HTMLElement | null>(null);

  let storeOpen = $state(false);
  let langOpen = $state(false);
  let userOpen = $state(false);
  let themeOpen = $state(false);
  let logoutConfirm = $state(false);
  let storeSearch = $state('');

  let hasMultipleStores = $derived(auth.stores.filter((s) => !s.isDisabled).length >= 2);

  let filteredStores = $derived(
    auth.stores
      .filter((s) => s.name.toLowerCase().includes(storeSearch.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  function switchStore(id: string) {
    auth.setActiveStore(id);
    storeOpen = false;
    router.navigate(rootPath(id));
  }

  function chooseLang(code: string) {
    langOpen = false;
    i18n.change(code);
  }

  const THEME_LABELS: Record<ThemeChoice, string> = {
    system: 'Follow system',
    light: 'Light',
    dark: 'Dark',
    mui: 'Classic (MUI)',
  };
</script>

<footer class="bottombar" aria-label="Store and account">
  <button class="bb-item" bind:this={storeBtn} onclick={() => (storeOpen = !storeOpen)}>
    <Icon name="home" size={16} />
    <span class="bb-label">{auth.activeStore?.name ?? '—'}</span>
  </button>

  <button class="bb-item" onclick={() => router.navigate(`/${auth.activeStoreId}/manage/store`)}>
    <Icon name="edit" size={16} />
    <span class="bb-label">Edit</span>
  </button>

  <span class="divider" aria-hidden="true"></span>

  {#if auth.signedIn}
    <button class="bb-item" bind:this={userBtn} onclick={() => (userOpen = !userOpen)}>
      <Icon name="user" size={16} />
      <span class="bb-label">{auth.user.firstName} {auth.user.lastName}</span>
    </button>
  {/if}

  <span class="divider" aria-hidden="true"></span>

  <button class="bb-item" bind:this={langBtn} onclick={() => (langOpen = !langOpen)}>
    <Icon name="translate" size={16} />
    <span class="bb-label">{i18n.current.name}</span>
  </button>

  <button class="bb-item" bind:this={themeBtn} onclick={() => (themeOpen = !themeOpen)}>
    <Icon name="sun" size={16} />
    <span class="bb-label">{THEME_LABELS[theme.choice]}</span>
  </button>

  <div class="spacer"></div>

  <span class="bb-item bb-item--static" title="Connected to central server">
    <Icon name="central" size={16} />
    <span class="bb-label">Central</span>
  </span>
</footer>

<!-- Store selector -->
{#if hasMultipleStores}
  <Popover anchor={storeBtn} open={storeOpen} onclose={() => (storeOpen = false)} minWidth={280} label="Select store">
    <div class="pop">
      <div class="pop__search">
        <TextInput bind:value={storeSearch} placeholder="Search stores…" compact />
      </div>
      <ul class="pop__list" role="listbox">
        {#each filteredStores as store (store.id)}
          {@const unselectable = store.isDisabled || store.id === auth.activeStoreId}
          <li>
            <button
              class="pop__row"
              class:current={store.id === auth.activeStoreId}
              disabled={unselectable}
              onclick={() => switchStore(store.id)}
            >
              <span>{store.name}</span>
              {#if store.id === auth.activeStoreId}<span class="tag">Current</span>
              {:else if store.isDisabled}<span class="tag">On hold</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
    </div>
  </Popover>
{/if}

<!-- Language selector -->
<Popover anchor={langBtn} open={langOpen} onclose={() => (langOpen = false)} minWidth={200} label="Select language">
  <ul class="pop__list" role="listbox">
    {#each LANGUAGES as lang (lang.code)}
      <li>
        <button class="pop__row" disabled={lang.code === i18n.code} onclick={() => chooseLang(lang.code)}>
          <span>{lang.name}</span>
          {#if lang.code === i18n.code}<Icon name="check" size={16} />{/if}
        </button>
      </li>
    {/each}
  </ul>
</Popover>

<!-- Theme selector -->
<Popover anchor={themeBtn} open={themeOpen} onclose={() => (themeOpen = false)} minWidth={200} label="Select theme">
  <ul class="pop__list" role="listbox">
    {#each ['system', 'light', 'dark', 'mui'] as const as choice (choice)}
      <li>
        <button class="pop__row" onclick={() => { theme.set(choice); themeOpen = false; }}>
          <span>{THEME_LABELS[choice]}</span>
          {#if theme.choice === choice}<Icon name="check" size={16} />{/if}
        </button>
      </li>
    {/each}
  </ul>
</Popover>

<!-- User details + logout -->
<Popover anchor={userBtn} open={userOpen} onclose={() => (userOpen = false)} minWidth={240} label="Account">
  <div class="pop pop--user">
    <div class="user-detail">
      <strong>{auth.user.username}</strong>
      <span>{auth.user.email}</span>
      <span class="muted">{auth.user.jobTitle}</span>
    </div>
    <button class="pop__row logout" onclick={() => { userOpen = false; logoutConfirm = true; }}>
      <Icon name="power" size={16} /> Logout
    </button>
  </div>
</Popover>

<ConfirmDialog
  open={logoutConfirm}
  title="Log out?"
  message="You will be returned to the login screen."
  confirmLabel="Log out"
  onconfirm={() => { logoutConfirm = false; auth.logout(); router.navigate('/login'); }}
  oncancel={() => (logoutConfirm = false)}
/>

<style>
  .bottombar {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
    height: 30px;
    padding: 0 var(--sp-2);
    background: var(--surface-nav);
    border-top: 1px solid var(--divider);
    color: var(--text-secondary);
    flex: none;
    font-size: var(--type-caption-size);
  }
  .spacer {
    flex: 1;
  }
  .bb-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 24px;
    padding: 0 var(--sp-2);
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    border-radius: var(--radius-sm);
    font: inherit;
    max-width: 200px;
  }
  .bb-item--static {
    cursor: default;
  }
  button.bb-item:hover {
    background: var(--hover-overlay);
  }
  .bb-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .divider {
    width: 1px;
    height: 16px;
    background: var(--border-strong);
    margin: 0 var(--sp-1);
  }

  .pop {
    min-width: 240px;
  }
  .pop__search {
    padding: var(--sp-1) var(--sp-1) var(--sp-2);
  }
  .pop__list {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 320px;
    overflow-y: auto;
  }
  .pop__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: var(--sp-3);
    padding: var(--sp-2) var(--sp-3);
    border: 0;
    background: transparent;
    color: var(--text-primary);
    text-align: start;
    cursor: pointer;
    border-radius: var(--radius-sm);
    font: inherit;
  }
  .pop__row:hover:not(:disabled) {
    background: var(--hover-overlay);
  }
  .pop__row:disabled {
    color: var(--text-disabled);
    cursor: default;
  }
  .pop__row.current {
    font-weight: var(--type-emphasis-weight);
  }
  .tag {
    font-size: var(--type-caption-size);
    color: var(--text-secondary);
    background: var(--surface-base);
    padding: 1px 6px;
    border-radius: var(--radius-sm);
  }
  .pop--user {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }
  .user-detail {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--sp-2) var(--sp-3);
  }
  .user-detail .muted {
    color: var(--text-secondary);
    font-size: var(--type-caption-size);
  }
  .logout {
    gap: var(--sp-2);
    justify-content: flex-start;
    color: var(--state-error);
    border-top: 1px solid var(--divider);
  }
</style>
