<script lang="ts">
  // Status badge — colour + label together (never colour alone). Used in the list.
  import type { StocktakeStatus } from '../api/types';
  type Props = { status: StocktakeStatus };
  let { status }: Props = $props();
  const LABEL: Record<StocktakeStatus, string> = { NEW: 'New', FINALISED: 'Finalised' };
</script>

<span class="badge badge--{status.toLowerCase()}">{LABEL[status]}</span>

<style>
  .badge {
    display: inline-block;
    padding: 2px var(--sp-2);
    border-radius: var(--radius-sm);
    font-size: var(--type-caption-size);
    font-weight: var(--type-emphasis-weight);
    border: 1px solid transparent;
  }
  .badge--new {
    background: var(--state-info-subtle);
    color: var(--state-info);
    border-color: var(--state-info);
  }
  .badge--finalised {
    background: var(--state-success-subtle);
    color: var(--state-success);
    border-color: var(--state-success);
  }
</style>
