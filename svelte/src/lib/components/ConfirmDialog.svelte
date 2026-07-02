<script lang="ts">
  // Confirmation prompt for irreversible/guarded actions (logout, finalise, reduce-to-
  // zero, delete). Built on Modal; confirm can be gated (e.g. reason required).
  import type { Snippet } from 'svelte';
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';

  type Props = {
    open: boolean;
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    confirmDisabled?: boolean;
    busy?: boolean;
    onconfirm: () => void;
    oncancel: () => void;
    children?: Snippet;
  };
  let {
    open,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
    confirmDisabled = false,
    busy = false,
    onconfirm,
    oncancel,
    children,
  }: Props = $props();
</script>

<Modal {open} {title} size="sm" onclose={oncancel}>
  {#if message}<p class="msg">{message}</p>{/if}
  {#if children}{@render children()}{/if}
  {#snippet footer()}
    <Button variant="ghost" label={cancelLabel} onclick={oncancel} />
    <Button
      variant={destructive ? 'destructive' : 'primary'}
      icon={destructive ? 'delete' : 'check'}
      label={confirmLabel}
      disabled={confirmDisabled}
      {busy}
      onclick={onconfirm}
    />
  {/snippet}
</Modal>

<style>
  .msg {
    margin: 0 0 var(--sp-3);
    color: var(--text-primary);
    line-height: 1.5;
  }
</style>
