<script lang="ts">
  // Single-select: a type-to-filter combobox (spec ui-standards/controls.md ›
  // single-select dropdown), not a native <select>. Clear-× follows optionality
  // (divergence D5): optional shows it when a value is set, required never does.
  // Selected marked with a check; a separate "active" option tracks keyboard focus
  // through the FILTERED set. Focus returns to the trigger on select/dismiss (D6).
  import Icon from './Icon.svelte';
  import Popover from './Popover.svelte';

  export type Option = { value: string; label: string; disabled?: boolean };

  type Props = {
    value: string | null;
    options: Option[];
    placeholder?: string;
    required?: boolean; // required => no clear ×
    disabled?: boolean;
    invalid?: boolean;
    compact?: boolean;
    id?: string;
    onchange: (value: string | null) => void;
  };
  let {
    value,
    options,
    placeholder = 'Select…',
    required = false,
    disabled = false,
    invalid = false,
    compact = false,
    id,
    onchange,
  }: Props = $props();

  let open = $state(false);
  let filter = $state('');
  let activeIndex = $state(-1);
  let control = $state<HTMLElement | null>(null);
  let input = $state<HTMLInputElement | null>(null);

  let selected = $derived(options.find((o) => o.value === value) ?? null);
  let filtered = $derived(
    filter.trim()
      ? options.filter((o) => o.label.toLowerCase().includes(filter.trim().toLowerCase()))
      : options,
  );
  let showClear = $derived(!required && value != null && !disabled);

  function openList() {
    if (disabled) return;
    open = true;
    filter = '';
    activeIndex = filtered.findIndex((o) => o.value === value);
  }
  function close() {
    open = false;
    filter = '';
  }
  function pick(opt: Option) {
    if (opt.disabled) return;
    onchange(opt.value);
    close();
    input?.focus();
  }
  function clear(e: MouseEvent) {
    e.stopPropagation();
    onchange(null);
    input?.focus();
  }

  function moveActive(delta: number) {
    const n = filtered.length;
    if (!n) return;
    let i = activeIndex;
    for (let step = 0; step < n; step++) {
      i = (i + delta + n) % n;
      if (!filtered[i].disabled) break;
    }
    activeIndex = i;
  }

  function onKey(e: KeyboardEvent) {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveActive(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveActive(-1);
        break;
      case 'Home':
        e.preventDefault();
        activeIndex = filtered.findIndex((o) => !o.disabled);
        break;
      case 'End':
        e.preventDefault();
        for (let i = filtered.length - 1; i >= 0; i--)
          if (!filtered[i].disabled) {
            activeIndex = i;
            break;
          }
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[activeIndex]) pick(filtered[activeIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close();
        break;
    }
  }

  $effect(() => {
    if (filter !== undefined && open) activeIndex = filtered.findIndex((o) => !o.disabled);
  });
</script>

<div
  class="control"
  class:compact
  class:invalid
  class:disabled
  class:open
  bind:this={control}
  role="combobox"
  aria-expanded={open}
  aria-controls="{id}-listbox"
  aria-haspopup="listbox"
>
  <input
    bind:this={input}
    {id}
    class="control__input"
    type="text"
    autocomplete="off"
    {disabled}
    placeholder={selected ? selected.label : placeholder}
    value={open ? filter : (selected?.label ?? '')}
    aria-autocomplete="list"
    aria-invalid={invalid}
    oninput={(e) => (filter = e.currentTarget.value)}
    onfocus={openList}
    onclick={openList}
    onkeydown={onKey}
  />
  {#if showClear}
    <button class="control__clear" type="button" aria-label="Clear" onclick={clear} tabindex="-1">
      <Icon name="close" size={16} />
    </button>
  {/if}
  <span class="control__chevron"><Icon name="chevron-down" size={16} /></span>
</div>

<Popover anchor={control} {open} onclose={close} matchAnchorWidth label="Options">
  <ul class="listbox" id="{id}-listbox" role="listbox">
    {#if filtered.length === 0}
      <li class="empty">No matches</li>
    {:else}
      {#each filtered as opt, i (opt.value)}
        <li
          role="option"
          aria-selected={opt.value === value}
          class="option"
          class:active={i === activeIndex}
          class:disabled={opt.disabled}
          onpointerdown={(e) => {
            e.preventDefault();
            pick(opt);
          }}
          onpointerenter={() => (activeIndex = i)}
        >
          <span class="check">{#if opt.value === value}<Icon name="check" size={16} />{/if}</span>
          <span class="option__label">{opt.label}</span>
        </li>
      {/each}
    {/if}
  </ul>
</Popover>

<style>
  .control {
    position: relative;
    display: flex;
    align-items: center;
    height: 40px;
    background: var(--surface-sunken);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-control);
    padding: 0 var(--sp-2) 0 0;
  }
  .control.compact {
    height: 32px;
  }
  .control:hover:not(.disabled) {
    border-color: var(--border-strong);
  }
  /* focus ring on the wrapper; the inner input suppresses its own outline */
  .control:focus-within {
    border-color: var(--focus-ring);
    box-shadow: 0 0 0 2px var(--focus-ring);
  }
  .control.invalid {
    border-color: var(--state-error);
  }
  .control.invalid:focus-within {
    box-shadow: 0 0 0 2px var(--state-error);
  }
  .control.disabled {
    opacity: 0.6;
  }
  .control__input {
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 0 var(--sp-3);
    border: 0;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
  }
  .control__input:focus-visible {
    outline: none;
  }
  .control__input::placeholder {
    color: var(--text-disabled);
  }
  .control__clear,
  .control__chevron {
    display: inline-flex;
    align-items: center;
    color: var(--text-secondary);
  }
  .control__clear {
    border: 0;
    background: transparent;
    cursor: pointer;
    padding: var(--sp-1);
    border-radius: var(--radius-sm);
  }
  .control__clear:hover {
    background: var(--hover-overlay);
  }

  .listbox {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .option {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--text-primary);
  }
  .option.active {
    background: var(--selected);
  }
  .option[aria-selected='true'] {
    font-weight: var(--type-emphasis-weight);
  }
  .option.disabled {
    color: var(--text-disabled);
    cursor: not-allowed;
  }
  .check {
    width: 16px;
    display: inline-flex;
    color: var(--brand-primary);
  }
  .empty {
    padding: var(--sp-2) var(--sp-3);
    color: var(--text-secondary);
  }
</style>
