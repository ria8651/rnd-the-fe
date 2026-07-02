<script lang="ts">
  // Async / catalogue-lookup single-select (spec ui-standards/controls.md › async
  // variant). Same combobox shell as Select, but options come from a debounced remote
  // query keyed on the typed text. Popover reflects the request lifecycle:
  // idle → loading → results → empty → error(retry).
  import Icon from './Icon.svelte';
  import Popover from './Popover.svelte';

  export type AsyncOption = { value: string; label: string; sublabel?: string };

  type Props = {
    selectedLabel?: string | null;
    search: (query: string) => Promise<AsyncOption[]>;
    placeholder?: string;
    minChars?: number;
    disabled?: boolean;
    onselect: (opt: AsyncOption) => void;
  };
  let {
    selectedLabel = null,
    search,
    placeholder = 'Search…',
    minChars = 1,
    disabled = false,
    onselect,
  }: Props = $props();

  let open = $state(false);
  let query = $state('');
  let results = $state<AsyncOption[]>([]);
  let activeIndex = $state(-1);
  let phase = $state<'idle' | 'loading' | 'results' | 'empty' | 'error'>('idle');
  let control = $state<HTMLElement | null>(null);
  let input = $state<HTMLInputElement | null>(null);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let seq = 0;

  function run(q: string) {
    if (q.trim().length < minChars) {
      phase = 'idle';
      results = [];
      return;
    }
    phase = 'loading';
    const my = ++seq;
    search(q)
      .then((rows) => {
        if (my !== seq) return;
        results = rows;
        phase = rows.length ? 'results' : 'empty';
        activeIndex = rows.length ? 0 : -1;
      })
      .catch(() => {
        if (my !== seq) return;
        phase = 'error';
      });
  }

  function onInput(v: string) {
    query = v;
    open = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => run(v), 300);
  }

  function pick(opt: AsyncOption) {
    onselect(opt);
    open = false;
    query = '';
    input?.focus();
  }

  function onKey(e: KeyboardEvent) {
    if (!open && ['ArrowDown', 'Enter'].includes(e.key)) {
      open = true;
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length) activeIndex = (activeIndex + 1) % results.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length) activeIndex = (activeIndex - 1 + results.length) % results.length;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[activeIndex]) pick(results[activeIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      open = false;
    }
  }
</script>

<div
  class="control"
  bind:this={control}
  class:disabled
  role="combobox"
  aria-expanded={open}
  aria-controls="async-listbox"
  aria-haspopup="listbox"
>
  <span class="lead"><Icon name="search" size={16} /></span>
  <input
    bind:this={input}
    class="control__input"
    type="text"
    autocomplete="off"
    {disabled}
    placeholder={selectedLabel ?? placeholder}
    value={query}
    aria-autocomplete="list"
    oninput={(e) => onInput(e.currentTarget.value)}
    onfocus={() => (open = true)}
    onkeydown={onKey}
  />
</div>

<Popover anchor={control} {open} onclose={() => (open = false)} matchAnchorWidth label="Search results">
  <ul class="listbox" role="listbox" id="async-listbox">
    {#if phase === 'idle'}
      <li class="msg">Type to search…</li>
    {:else if phase === 'loading'}
      <li class="msg"><span class="spinner"></span> Searching…</li>
    {:else if phase === 'error'}
      <li class="msg error">
        Search failed.
        <button type="button" onclick={() => run(query)}>Retry</button>
      </li>
    {:else if phase === 'empty'}
      <li class="msg">No matches</li>
    {:else}
      {#each results as opt, i (opt.value)}
        <li
          role="option"
          aria-selected={false}
          class="option"
          class:active={i === activeIndex}
          onpointerdown={(e) => {
            e.preventDefault();
            pick(opt);
          }}
          onpointerenter={() => (activeIndex = i)}
        >
          <span class="option__label">{opt.label}</span>
          {#if opt.sublabel}<span class="option__sub">{opt.sublabel}</span>{/if}
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
    padding-left: var(--sp-3);
  }
  .control:hover:not(.disabled) {
    border-color: var(--border-strong);
  }
  .control:focus-within {
    border-color: var(--focus-ring);
    box-shadow: 0 0 0 2px var(--focus-ring);
  }
  .lead {
    color: var(--text-secondary);
    display: inline-flex;
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
  .listbox {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .option {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--sp-2) var(--sp-3);
    border-radius: var(--radius-sm);
    cursor: pointer;
  }
  .option.active {
    background: var(--selected);
  }
  .option__sub {
    font-size: var(--type-caption-size);
    color: var(--text-secondary);
  }
  .msg {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-3);
    color: var(--text-secondary);
  }
  .msg.error {
    color: var(--state-error);
  }
  .msg button {
    margin-inline-start: auto;
  }
  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--border-strong);
    border-top-color: var(--brand-primary);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
