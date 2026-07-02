<script lang="ts">
  // Unimplemented nav sections — only stocktakes is built out. Keeps the shell
  // navigable without pretending the vertical exists.
  import Icon from '../lib/components/Icon.svelte';
  type Props = { title: string };
  let { title }: Props = $props();
</script>

<div class="placeholder">
  <Icon name="info-outline" size={48} />
  <h2>{title}</h2>
  <p>This section is not part of the current build. The implemented vertical is <a href="./inventory/stocktakes">Stocktakes</a>.</p>
</div>

<style>
  .placeholder {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--sp-3);
    color: var(--text-secondary);
    text-align: center;
    padding: var(--sp-8);
  }
</style>
