<script lang="ts">
  // Desktop primary nav (spec chrome/01-behaviours.md › sidebar). Expanded (icon+label)
  // ↔ collapsed icon rail, width animated. The brand mark IS the toggle (centred, spins
  // 360° on toggle — direction echoes the change, suppressed under reduced-motion). No
  // hover reaction (divergence D3).
  import Icon from '../lib/components/Icon.svelte';
  import { chrome } from '../lib/state/chrome.svelte';
  import { auth } from '../lib/state/auth.svelte';
  import { router } from '../lib/router.svelte';
  import { NAV_UPPER, NAV_LOWER, itemPath, type NavItem } from '../lib/nav';

  let expanded = $derived(chrome.expanded);
  let storeId = $derived(auth.activeStoreId ?? '');

  function isActive(item: NavItem): boolean {
    return router.segments[1] === item.area;
  }
</script>

<nav class="sidebar" class:expanded aria-label="Primary">
  <div class="brand-band">
    <button
      class="brand"
      style="--spin: {chrome.spinDir}"
      aria-label={expanded ? 'Close the menu' : 'Open the menu'}
      aria-expanded={expanded}
      onclick={() => chrome.toggleSidebar()}
    >
      {#key chrome.spinDir}
        <span class="brand__spin"><Icon name="m-supply-guy" size={36} /></span>
      {/key}
    </button>
  </div>

  <div class="group group--upper">
    {#each NAV_UPPER as item (item.key)}
      <a
        class="navitem"
        class:active={isActive(item)}
        href={itemPath(storeId, item)}
        title={expanded ? undefined : item.label}
        aria-current={isActive(item) ? 'page' : undefined}
      >
        <Icon name={item.icon} size={24} />
        {#if expanded}<span class="navitem__label">{item.label}</span>{/if}
      </a>
    {/each}
  </div>

  <div class="group group--lower">
    {#each NAV_LOWER as item (item.key)}
      <a
        class="navitem"
        class:active={isActive(item)}
        href={itemPath(storeId, item)}
        title={expanded ? undefined : item.label}
        aria-current={isActive(item) ? 'page' : undefined}
      >
        <Icon name={item.icon} size={24} />
        {#if expanded}<span class="navitem__label">{item.label}</span>{/if}
      </a>
    {/each}
  </div>
</nav>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    width: 72px;
    background: var(--surface-nav);
    border-right: 1px solid var(--divider);
    transition: width 0.2s ease;
    overflow: hidden;
    flex: none;
    height: 100%;
  }
  .sidebar.expanded {
    width: 240px;
  }
  .brand-band {
    display: flex;
    justify-content: center;
    padding: var(--sp-4) 0;
  }
  .brand {
    border: 0;
    background: transparent;
    cursor: pointer;
    padding: var(--sp-1);
    border-radius: var(--radius-control);
    display: inline-flex;
  }
  .brand:hover {
    background: var(--hover-overlay);
  }
  .brand__spin {
    display: inline-flex;
    animation: spin calc(0.5s) ease;
  }
  .sidebar:not(.expanded) .brand__spin {
    animation-direction: reverse;
  }
  @keyframes spin {
    from {
      transform: rotate(0);
    }
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .brand__spin {
      animation: none;
    }
  }
  .group {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--sp-2);
  }
  .group--upper {
    flex: 1;
    overflow-y: auto;
  }
  .group--lower {
    border-top: 1px solid var(--divider);
  }
  .navitem {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-2) var(--sp-3);
    border-radius: var(--radius-control);
    color: var(--text-secondary);
    min-height: 44px;
    white-space: nowrap;
  }
  .navitem:hover {
    background: var(--hover-overlay);
    color: var(--text-primary);
  }
  .navitem.active {
    background: var(--selected);
    color: var(--brand-primary);
    font-weight: var(--type-emphasis-weight);
  }
  .sidebar:not(.expanded) .navitem {
    justify-content: center;
  }
</style>
