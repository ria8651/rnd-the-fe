<script lang="ts">
  // Transient notices, announced via an aria-live region. Rendered once near the app root.
  import { toasts } from '../state/toast.svelte';
  import Icon from './Icon.svelte';
  import type { IconName } from '../icons/icons';

  const ICON: Record<string, IconName> = {
    info: 'info',
    success: 'check-circle',
    warning: 'alert',
    error: 'circle-alert',
  };
</script>

<div class="toasts" role="status" aria-live="polite">
  {#each toasts.items as t (t.id)}
    <div class="toast toast--{t.kind}">
      <Icon name={ICON[t.kind]} size={18} />
      <span class="toast__msg">{t.message}</span>
      <button class="toast__close" aria-label="Dismiss" onclick={() => toasts.dismiss(t.id)}>
        <Icon name="close" size={14} />
      </button>
    </div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    bottom: var(--sp-8);
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-toast);
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    align-items: center;
    pointer-events: none;
  }
  .toast {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    background: var(--surface-raised);
    border: 1px solid var(--border-default);
    border-left-width: 4px;
    border-radius: var(--radius-control);
    box-shadow: var(--elev-overlay);
    padding: var(--sp-2) var(--sp-3);
    max-width: 460px;
    pointer-events: auto;
  }
  .toast--error {
    border-left-color: var(--state-error);
  }
  .toast--error :global(.icon) {
    color: var(--state-error);
  }
  .toast--success {
    border-left-color: var(--state-success);
  }
  .toast--success :global(.icon) {
    color: var(--state-success);
  }
  .toast--warning {
    border-left-color: var(--state-warning);
  }
  .toast--warning :global(.icon) {
    color: var(--state-warning);
  }
  .toast--info {
    border-left-color: var(--state-info);
  }
  .toast--info :global(.icon) {
    color: var(--state-info);
  }
  .toast__msg {
    font-size: var(--type-body-size);
  }
  .toast__close {
    border: 0;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    display: inline-flex;
    padding: 2px;
  }
</style>
