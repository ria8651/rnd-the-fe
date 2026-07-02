<script lang="ts">
  // Field wrapper: static label above (always visible), optional error message below
  // (icon + text, never colour alone — spec inputs.md / accessibility colour independence).
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  type Props = {
    label: string;
    for?: string;
    error?: string | null;
    hint?: string;
    children: Snippet;
  };
  let { label, for: forId, error = null, hint, children }: Props = $props();
</script>

<div class="field">
  <label class="field__label" for={forId}>{label}</label>
  {@render children()}
  {#if error}
    <p class="field__error" id="{forId}-error"><Icon name="circle-alert" size={14} /> {error}</p>
  {:else if hint}
    <p class="field__hint">{hint}</p>
  {/if}
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
  }
  .field__label {
    font-size: var(--type-caption-size);
    font-weight: var(--type-caption-weight);
    color: var(--text-secondary);
  }
  .field__error {
    display: flex;
    align-items: center;
    gap: 4px;
    margin: 0;
    font-size: var(--type-caption-size);
    color: var(--state-error);
  }
  .field__hint {
    margin: 0;
    font-size: var(--type-caption-size);
    color: var(--text-secondary);
  }
</style>
