<script lang="ts">
  // Action button (spec ui-standards/controls.md › buttons). Variants: primary,
  // secondary, ghost, destructive. Destructive reads as dangerous via a red ICON
  // on a neutral surface, never colour alone. All buttons share the theme's single
  // button radius. Busy shows progress and is non-interactive.
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  import type { IconName } from '../icons/icons';

  type Props = {
    variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
    icon?: IconName;
    label?: string;
    title?: string;
    disabled?: boolean;
    busy?: boolean;
    compact?: boolean;
    iconOnly?: boolean;
    type?: 'button' | 'submit';
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
  };
  let {
    variant = 'secondary',
    icon,
    label,
    title,
    disabled = false,
    busy = false,
    compact = false,
    iconOnly = false,
    type = 'button',
    onclick,
    children,
  }: Props = $props();
</script>

<button
  {type}
  class="btn btn--{variant}"
  class:compact
  class:icon-only={iconOnly}
  class:busy
  disabled={disabled || busy}
  aria-busy={busy}
  title={title ?? (iconOnly ? label : undefined)}
  aria-label={iconOnly ? label : undefined}
  {onclick}
>
  {#if busy}
    <span class="spinner" aria-hidden="true"></span>
  {:else if icon}
    <Icon name={icon} size={compact ? 16 : 20} />
  {/if}
  {#if !iconOnly}
    {#if children}{@render children()}{:else}{label}{/if}
  {/if}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    height: 40px;
    padding: 0 var(--sp-4);
    border-radius: var(--radius-button);
    border: 1px solid transparent;
    font-size: var(--type-body-size);
    font-weight: var(--type-emphasis-weight);
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.12s, border-color 0.12s;
    min-width: 40px;
  }
  .btn.compact {
    height: 32px;
    padding: 0 var(--sp-3);
  }
  .btn.icon-only {
    padding: 0;
    width: 40px;
  }
  .btn.compact.icon-only {
    width: 32px;
  }

  .btn--primary {
    background: var(--brand-primary);
    color: var(--brand-on-primary);
  }
  .btn--primary:hover:not(:disabled) {
    background: var(--brand-primary-hover);
  }

  .btn--secondary {
    background: var(--surface-default);
    color: var(--text-primary);
    border-color: var(--border-default);
  }
  .btn--secondary:hover:not(:disabled) {
    background: var(--hover-overlay);
    border-color: var(--border-strong);
  }

  .btn--ghost {
    background: transparent;
    color: var(--text-primary);
  }
  .btn--ghost:hover:not(:disabled) {
    background: var(--hover-overlay);
  }

  /* Destructive: neutral surface, error-coloured icon (colour is not the sole cue —
     it always carries a label). */
  .btn--destructive {
    background: var(--surface-default);
    color: var(--text-primary);
    border-color: var(--border-default);
  }
  .btn--destructive:hover:not(:disabled) {
    background: var(--state-error-subtle);
    border-color: var(--state-error);
  }
  .btn--destructive :global(.icon) {
    color: var(--state-error);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
