<script lang="ts">
  // Dialog layered above the whole frame (spec ui-standards/layout.md › modals).
  // Scrim backdrop, Escape/close returns focus to the trigger, focus moves in on open.
  import type { Snippet } from 'svelte';
  import { portal } from '../util/portal';
  import Icon from './Icon.svelte';

  type Props = {
    open: boolean;
    title: string;
    size?: 'sm' | 'md' | 'lg';
    onclose: () => void;
    closeOnScrim?: boolean;
    children: Snippet;
    footer?: Snippet;
  };
  let { open, title, size = 'md', onclose, closeOnScrim = true, children, footer }: Props = $props();

  let dialog = $state<HTMLElement | null>(null);
  let opener: Element | null = null;

  $effect(() => {
    if (open) {
      opener = document.activeElement;
      requestAnimationFrame(() => {
        const focusable = dialog?.querySelector<HTMLElement>(
          'input, select, textarea, button, [tabindex]:not([tabindex="-1"])',
        );
        (focusable ?? dialog)?.focus();
      });
    } else if (opener instanceof HTMLElement) {
      opener.focus();
      opener = null;
    }
  });

  function onKey(e: KeyboardEvent) {
    if (open && e.key === 'Escape') {
      e.stopPropagation();
      onclose();
    }
  }
</script>

<svelte:window onkeydown={onKey} />

{#if open}
  <div class="scrim" use:portal>
    <button
      class="scrim-hit"
      aria-label="Close dialog"
      tabindex="-1"
      onclick={() => closeOnScrim && onclose()}
    ></button>
    <div
      class="modal modal--{size}"
      bind:this={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabindex="-1"
    >
      <header class="modal__head">
        <h2>{title}</h2>
        <button class="close" aria-label="Close" onclick={onclose}>
          <Icon name="close" size={20} />
        </button>
      </header>
      <div class="modal__body">
        {@render children()}
      </div>
      {#if footer}
        <footer class="modal__foot">{@render footer()}</footer>
      {/if}
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal);
    background: var(--surface-scrim);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--sp-4);
  }
  .scrim-hit {
    position: absolute;
    inset: 0;
    border: 0;
    background: transparent;
    cursor: default;
  }
  .modal {
    position: relative;
    background: var(--surface-raised);
    color: var(--text-primary);
    border-radius: var(--radius-modal);
    box-shadow: var(--elev-overlay);
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .modal--sm {
    max-width: 420px;
  }
  .modal--md {
    max-width: 640px;
  }
  .modal--lg {
    max-width: 900px;
  }
  .modal__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--sp-4);
    border-bottom: 1px solid var(--divider);
  }
  .modal__head h2 {
    font-size: var(--type-heading-size);
  }
  .close {
    display: inline-flex;
    padding: var(--sp-1);
    border: 0;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: var(--radius-sm);
  }
  .close:hover {
    background: var(--hover-overlay);
  }
  .modal__body {
    padding: var(--sp-4);
    overflow-y: auto;
  }
  .modal__foot {
    display: flex;
    justify-content: flex-end;
    gap: var(--sp-2);
    padding: var(--sp-4);
    border-top: 1px solid var(--divider);
  }
</style>
