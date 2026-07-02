<script lang="ts">
  // Split (multi-action) button (spec ui-standards/controls.md › split button).
  // Primary segment fires the currently-selected option directly; disclosure segment
  // opens a menu of ALL options. Invalid options are shown-but-disabled (the menu
  // doubles as a lifecycle legend). Selecting an option makes it primary; it does NOT
  // fire immediately.
  import Icon from './Icon.svelte';
  import Popover from './Popover.svelte';
  import type { IconName } from '../icons/icons';

  export type SplitOption = { value: string; label: string; disabled?: boolean };

  type Props = {
    options: SplitOption[];
    selected: string;
    icon?: IconName;
    onprimary: (value: string) => void;
    onselect: (value: string) => void;
  };
  let { options, selected, icon = 'arrow-right', onprimary, onselect }: Props = $props();

  let open = $state(false);
  let disclosure = $state<HTMLElement | null>(null);
  let current = $derived(options.find((o) => o.value === selected) ?? options[0]);

  function choose(opt: SplitOption) {
    if (opt.disabled) return;
    onselect(opt.value);
    open = false;
  }
</script>

<div class="split">
  <button class="split__primary" type="button" onclick={() => onprimary(selected)}>
    <Icon name={icon} size={20} />
    <span>{current?.label}</span>
  </button>
  <button
    class="split__disclosure"
    type="button"
    bind:this={disclosure}
    aria-label="More status options"
    aria-expanded={open}
    onclick={() => (open = !open)}
  >
    <Icon name="chevron-down" size={16} />
  </button>
</div>

<Popover anchor={disclosure} {open} onclose={() => (open = false)} label="Status options">
  <ul class="menu" role="menu">
    {#each options as opt (opt.value)}
      <li>
        <button
          type="button"
          role="menuitemradio"
          aria-checked={opt.value === selected}
          class="menu__item"
          class:selected={opt.value === selected}
          disabled={opt.disabled}
          onclick={() => choose(opt)}
        >
          <span class="check">{#if opt.value === selected}<Icon name="check" size={16} />{/if}</span>
          {opt.label}
        </button>
      </li>
    {/each}
  </ul>
</Popover>

<style>
  .split {
    display: inline-flex;
    border-radius: var(--radius-button);
    box-shadow: var(--elev-raised);
    overflow: hidden;
  }
  .split__primary,
  .split__disclosure {
    border: 1px solid var(--border-default);
    background: var(--surface-default);
    color: var(--text-primary);
    cursor: pointer;
    height: 40px;
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    font-weight: var(--type-emphasis-weight);
    font-size: var(--type-body-size);
  }
  .split__primary {
    padding: 0 var(--sp-4);
    border-radius: var(--radius-button) 0 0 var(--radius-button);
    border-right: 0;
  }
  .split__primary :global(.icon) {
    color: var(--brand-primary);
  }
  .split__disclosure {
    padding: 0 var(--sp-2);
    border-radius: 0 var(--radius-button) var(--radius-button) 0;
    border-left: 1px solid var(--border-default);
  }
  .split__primary:hover,
  .split__disclosure:hover {
    background: var(--hover-overlay);
  }
  .menu {
    list-style: none;
    margin: 0;
    padding: 0;
    min-width: 200px;
  }
  .menu__item {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    width: 100%;
    padding: var(--sp-2) var(--sp-3);
    border: 0;
    background: transparent;
    color: var(--text-primary);
    text-align: start;
    cursor: pointer;
    border-radius: var(--radius-sm);
    font: inherit;
  }
  .menu__item:hover:not(:disabled) {
    background: var(--hover-overlay);
  }
  .menu__item.selected {
    font-weight: var(--type-emphasis-weight);
  }
  .menu__item:disabled {
    color: var(--text-disabled);
    cursor: not-allowed;
  }
  .check {
    width: 16px;
    display: inline-flex;
    color: var(--brand-primary);
  }
</style>
