<script lang="ts">
  // Transient surface anchored to a trigger (spec ui-standards/controls.md › menus &
  // popovers). Renders in a top-level portal above the page (and above modals), never
  // clipped by an ancestor. Anchored below-start by default; flips/shifts to stay on
  // screen; caps height and scrolls internally. Dismisses on outside-click / Escape;
  // focus returns to the trigger (divergence D6).
  import type { Snippet } from 'svelte';
  import { portal } from '../util/portal';

  type Props = {
    anchor: HTMLElement | null;
    open: boolean;
    onclose: () => void;
    minWidth?: number;
    matchAnchorWidth?: boolean;
    label?: string;
    children: Snippet;
  };
  let { anchor, open, onclose, minWidth = 180, matchAnchorWidth = false, label, children }: Props =
    $props();

  let panel = $state<HTMLElement | null>(null);
  let pos = $state({ top: 0, left: 0, width: 180, maxHeight: 480, placement: 'bottom' });

  function place() {
    if (!anchor || !panel) return;
    const a = anchor.getBoundingClientRect();
    const gap = 4;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = matchAnchorWidth ? Math.max(a.width, minWidth) : Math.max(panel.offsetWidth, minWidth);

    // horizontal: start-aligned, shift to stay on screen
    let left = a.left;
    if (left + width > vw - 8) left = Math.max(8, vw - 8 - width);
    if (left < 8) left = 8;

    // vertical: below by default, flip above if not enough room
    const spaceBelow = vh - a.bottom - gap - 8;
    const spaceAbove = a.top - gap - 8;
    const desired = panel.scrollHeight;
    let top: number;
    let maxHeight: number;
    let placement: string;
    if (desired <= spaceBelow || spaceBelow >= spaceAbove) {
      top = a.bottom + gap;
      maxHeight = spaceBelow;
      placement = 'bottom';
    } else {
      maxHeight = spaceAbove;
      top = a.top - gap - Math.min(desired, maxHeight);
      placement = 'top';
    }
    pos = { top, left, width, maxHeight: Math.max(120, maxHeight), placement };
  }

  function onKey(e: KeyboardEvent) {
    if (open && e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  }

  function onDocPointer(e: PointerEvent) {
    const t = e.target as Node;
    if (panel?.contains(t) || anchor?.contains(t)) return;
    close();
  }

  function close() {
    onclose();
    anchor?.focus();
  }

  $effect(() => {
    if (open && anchor && panel) {
      place();
      // Re-measure after content paints.
      requestAnimationFrame(place);
      const onScroll = () => place();
      window.addEventListener('resize', onScroll);
      window.addEventListener('scroll', onScroll, true);
      document.addEventListener('pointerdown', onDocPointer, true);
      return () => {
        window.removeEventListener('resize', onScroll);
        window.removeEventListener('scroll', onScroll, true);
        document.removeEventListener('pointerdown', onDocPointer, true);
      };
    }
  });
</script>

<svelte:window onkeydown={onKey} />

{#if open}
  <div
    class="popover"
    bind:this={panel}
    use:portal
    role="dialog"
    tabindex="-1"
    aria-label={label}
    style="top:{pos.top}px; left:{pos.left}px; min-width:{pos.width}px; max-height:{pos.maxHeight}px;"
  >
    {@render children()}
  </div>
{/if}

<style>
  .popover {
    position: fixed;
    z-index: var(--z-popover);
    background: var(--surface-raised);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-control);
    box-shadow: var(--elev-raised);
    overflow-y: auto;
    overflow-x: hidden;
    padding: var(--sp-1);
  }
</style>
