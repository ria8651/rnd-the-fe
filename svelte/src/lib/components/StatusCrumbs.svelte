<script lang="ts">
  // Lifecycle indicator (spec ui-standards/controls.md › status crumbs). Ordered
  // statuses separated by a forward chevron (flips under RTL); reached statuses are
  // emphasised, not-yet-reached muted. State conveyed by position + text, never colour
  // alone. Revealing (hover/focus/tap) shows when each reached status occurred.
  import Icon from './Icon.svelte';
  import { formatDateTime } from '../util/format';

  export type Crumb = { key: string; label: string; reachedAt?: string | null };

  type Props = { crumbs: Crumb[]; currentKey: string };
  let { crumbs, currentKey }: Props = $props();

  let currentIndex = $derived(crumbs.findIndex((c) => c.key === currentKey));
  let showHistory = $state(false);
</script>

<div
  class="crumbs"
  role="button"
  aria-label="Status: {crumbs[currentIndex]?.label}. Show history."
  tabindex="0"
  onmouseenter={() => (showHistory = true)}
  onmouseleave={() => (showHistory = false)}
  onfocus={() => (showHistory = true)}
  onblur={() => (showHistory = false)}
>
  {#each crumbs as crumb, i (crumb.key)}
    {#if i > 0}<span class="sep"><Icon name="chevron-down" size={14} /></span>{/if}
    <span class="crumb" class:reached={i <= currentIndex} class:current={i === currentIndex}>
      {crumb.label}
    </span>
  {/each}

  {#if showHistory}
    <div class="history" role="tooltip">
      {#each crumbs as crumb (crumb.key)}
        <div class="history__row" class:muted={!crumb.reachedAt}>
          <span>{crumb.label}</span>
          <span class="tnum">{crumb.reachedAt ? formatDateTime(crumb.reachedAt) : '—'}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .crumbs {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: var(--sp-1);
    padding: var(--sp-1) var(--sp-2);
    border-radius: var(--radius-sm);
    cursor: default;
  }
  .crumb {
    font-size: var(--type-body-size);
    color: var(--text-disabled);
  }
  .crumb.reached {
    color: var(--brand-primary);
    font-weight: var(--type-emphasis-weight);
  }
  .crumb.current {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .sep {
    color: var(--text-disabled);
    display: inline-flex;
    transform: rotate(-90deg);
  }
  :global([dir='rtl']) .sep {
    transform: rotate(90deg);
  }
  .history {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 0;
    z-index: var(--z-popover);
    background: var(--surface-raised);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-control);
    box-shadow: var(--elev-raised);
    padding: var(--sp-2);
    min-width: 220px;
  }
  .history__row {
    display: flex;
    justify-content: space-between;
    gap: var(--sp-4);
    padding: var(--sp-1) var(--sp-2);
    font-size: var(--type-caption-size);
  }
  .history__row.muted {
    color: var(--text-disabled);
  }
</style>
