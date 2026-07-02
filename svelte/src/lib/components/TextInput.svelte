<script lang="ts">
  // Text/number/date input following the shared field interaction states
  // (spec ui-standards/inputs.md). Focus changes colour, not geometry.
  type Props = {
    value: string;
    type?: 'text' | 'number' | 'date';
    placeholder?: string;
    disabled?: boolean;
    readonly?: boolean;
    invalid?: boolean;
    compact?: boolean;
    multiline?: boolean;
    id?: string;
    align?: 'left' | 'right';
    min?: number;
    step?: number;
    describedby?: string;
    oninput?: (value: string) => void;
    onblur?: () => void;
  };
  let {
    value = $bindable(),
    type = 'text',
    placeholder,
    disabled = false,
    readonly = false,
    invalid = false,
    compact = false,
    multiline = false,
    id,
    align = 'left',
    min,
    step,
    describedby,
    oninput,
    onblur,
  }: Props = $props();

  // One-way value + explicit string write-back (NOT native bind:value): Svelte coerces
  // bind:value on type="number" to a number, which breaks callers that keep the value as
  // a string. Reading e.currentTarget.value always yields the raw string.
  function handle(e: Event) {
    value = (e.currentTarget as HTMLInputElement | HTMLTextAreaElement).value;
    oninput?.(value);
  }
</script>

{#if multiline}
  <textarea
    {id}
    class="input"
    class:invalid
    class:compact
    {placeholder}
    {disabled}
    {readonly}
    aria-invalid={invalid}
    aria-describedby={describedby}
    rows="3"
    {value}
    oninput={handle}
    {onblur}
  ></textarea>
{:else}
  <input
    {id}
    class="input"
    class:invalid
    class:compact
    style="text-align:{align}"
    {type}
    {placeholder}
    {disabled}
    {readonly}
    {min}
    {step}
    aria-invalid={invalid}
    aria-describedby={describedby}
    {value}
    oninput={handle}
    {onblur}
  />
{/if}

<style>
  .input {
    width: 100%;
    height: 40px;
    padding: 0 var(--sp-3);
    background: var(--surface-sunken);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-control);
    color: var(--text-primary);
    font: inherit;
  }
  textarea.input {
    height: auto;
    padding: var(--sp-2) var(--sp-3);
    resize: vertical;
    line-height: 1.5;
  }
  .input.compact {
    height: 32px;
  }
  .input:hover:not(:disabled):not(:read-only) {
    border-color: var(--border-strong);
  }
  .input:focus-visible {
    outline: none;
    border-color: var(--focus-ring);
    box-shadow: 0 0 0 2px var(--focus-ring);
  }
  .input.invalid {
    border-color: var(--state-error);
  }
  .input.invalid:focus-visible {
    box-shadow: 0 0 0 2px var(--state-error);
  }
  .input:disabled,
  .input:read-only {
    background: var(--surface-base);
    color: var(--text-secondary);
    cursor: default;
  }
  .input::placeholder {
    color: var(--text-disabled);
  }
</style>
