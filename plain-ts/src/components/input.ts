import { h } from '../core/dom';
import { icon } from '../icons';
import { type Getter } from '../core/signal';

let idCounter = 0;
const nextId = () => `fld-${++idCounter}`;

export interface TextFieldOpts {
  label?: string;
  value?: Getter<string>;
  placeholder?: string;
  disabled?: Getter<boolean> | boolean;
  invalid?: Getter<boolean>;
  error?: Getter<string | null>;
  compact?: boolean;
  multiline?: boolean;
  type?: string;
  maxWidth?: string;
  ariaLabel?: string;
  /** Fires on each input event (for optimistic/debounced auto-save). */
  onInput?: (value: string) => void;
  /** Fires on blur / Enter (commit point). */
  onCommit?: (value: string) => void;
}

export function textField(opts: TextFieldOpts): HTMLElement {
  const id = nextId();
  const errId = id + '-err';
  const tag = opts.multiline ? 'textarea' : 'input';

  const control = h(tag, {
    id,
    class: () => {
      const c = ['input'];
      if (opts.compact) c.push('input--compact');
      if (opts.invalid?.() || opts.error?.()) c.push('invalid');
      return c.join(' ');
    },
    type: opts.multiline ? undefined : opts.type ?? 'text',
    placeholder: opts.placeholder,
    value: opts.value,
    disabled: typeof opts.disabled === 'function' ? opts.disabled : opts.disabled ?? false,
    'aria-label': opts.ariaLabel ?? opts.label,
    'aria-invalid': () => (opts.error?.() ? 'true' : undefined),
    'aria-describedby': () => (opts.error?.() ? errId : undefined),
    oninput: (e: Event) => opts.onInput?.((e.target as HTMLInputElement).value),
    onblur: (e: Event) => opts.onCommit?.((e.target as HTMLInputElement).value),
    onkeydown: (e: KeyboardEvent) => {
      if (!opts.multiline && e.key === 'Enter') (e.target as HTMLInputElement).blur();
    },
    style: opts.maxWidth ? { 'max-width': opts.maxWidth } : undefined,
  });

  return h(
    'div',
    { class: 'field', style: opts.maxWidth ? { 'max-width': opts.maxWidth } : undefined },
    opts.label ? h('label', { class: 'field__label', for: id }, opts.label) : null,
    control,
    opts.error
      ? () => {
          const msg = opts.error!();
          return msg ? h('div', { class: 'field__error', id: errId, role: 'alert' }, icon('circle-alert'), msg) : null;
        }
      : null,
  );
}
