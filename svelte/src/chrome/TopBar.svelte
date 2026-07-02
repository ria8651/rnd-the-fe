<script lang="ts">
  // Desktop top bar (spec chrome/01-behaviours.md › desktop top bar): active section
  // icon + breadcrumbs, and a full-screen toggle. On compact viewports it becomes the
  // mobile bar with a menu toggle + brand mark.
  import Icon from '../lib/components/Icon.svelte';
  import { router } from '../lib/router.svelte';
  import { chrome } from '../lib/state/chrome.svelte';
  import { viewport } from '../lib/state/viewport.svelte';
  import { auth } from '../lib/state/auth.svelte';
  import { ALL_NAV } from '../lib/nav';

  let seg = $derived(router.segments);
  let section = $derived(ALL_NAV.find((n) => n.area === seg[1]));

  // Breadcrumb trail from the path (store segment excluded).
  let crumbs = $derived.by(() => {
    const out: string[] = [];
    if (section) out.push(section.label);
    if (seg[2]) out.push(titleCase(seg[2]));
    if (seg[3]) out.push(seg[3] === 'new' ? 'New' : `#${seg[3]}`);
    return out;
  });

  function titleCase(s: string): string {
    return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
</script>

<header class="topbar">
  {#if viewport.isCompact}
    <button class="menu-toggle" aria-label="Menu" aria-expanded={chrome.mobileNavOpen} onclick={() => chrome.toggleMobileNav()}>
      <Icon name={chrome.mobileNavOpen ? 'close' : 'menu-dots'} size={24} />
    </button>
  {/if}

  <div class="crumbs">
    {#if section}<Icon name={section.icon} size={20} />{/if}
    {#each crumbs as c, i (i)}
      {#if i > 0}<span class="sep">/</span>{/if}
      <span class="crumb" class:last={i === crumbs.length - 1}>{c}</span>
    {/each}
  </div>

  <div class="spacer"></div>

  {#if viewport.isCompact}
    <span class="mini-brand"><Icon name="m-supply-guy" size={28} /></span>
  {:else}
    <button
      class="fs-toggle"
      aria-label={chrome.fullscreen ? 'Exit full screen' : 'Full screen'}
      onclick={() => chrome.toggleFullscreen()}
    >
      <Icon name={chrome.fullscreen ? 'minimise' : 'maximise'} size={20} />
    </button>
  {/if}
</header>

<style>
  .topbar {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    height: 56px;
    padding: 0 var(--sp-4);
    background: var(--surface-base);
    border-bottom: 1px solid var(--divider);
    flex: none;
  }
  .crumbs {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    color: var(--text-secondary);
  }
  .crumb.last {
    color: var(--text-primary);
    font-weight: var(--type-emphasis-weight);
  }
  .sep {
    color: var(--text-disabled);
  }
  .spacer {
    flex: 1;
  }
  .menu-toggle,
  .fs-toggle {
    display: inline-flex;
    border: 0;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    padding: var(--sp-2);
    border-radius: var(--radius-control);
  }
  .menu-toggle:hover,
  .fs-toggle:hover {
    background: var(--hover-overlay);
  }
  .mini-brand {
    display: inline-flex;
  }
</style>
