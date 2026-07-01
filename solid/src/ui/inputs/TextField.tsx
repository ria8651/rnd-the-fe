/**
 * Single-line or multi-line text field (spec/ui-standards/inputs.md). Controlled value;
 * `onInput` fires per keystroke (for debounced/in-place saving), `onChange` on commit/blur.
 */
import { type JSX, Show } from 'solid-js';
import { FieldShell } from './FieldShell';

export interface TextFieldProps {
  label?: string;
  value: string;
  onInput?: (value: string) => void;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  compact?: boolean;
  multiline?: boolean;
  rows?: number;
  width?: string;
  full?: boolean;
  autofocus?: boolean;
}

export function TextField(props: TextFieldProps): JSX.Element {
  const cls = () => `control${props.compact ? ' control--compact' : ''}${props.error ? ' control--invalid' : ''}`;
  return (
    <FieldShell label={props.label} required={props.required} error={props.error} full={props.full} width={props.width}>
      {({ inputId, describedBy }) => (
        <Show
          when={props.multiline}
          fallback={
            <input
              id={inputId}
              class={cls()}
              type="text"
              value={props.value}
              placeholder={props.placeholder}
              disabled={props.disabled}
              aria-invalid={props.error ? 'true' : undefined}
              aria-describedby={describedBy}
              autofocus={props.autofocus}
              onInput={(e) => props.onInput?.(e.currentTarget.value)}
              onChange={(e) => props.onChange?.(e.currentTarget.value)}
              onBlur={() => props.onBlur?.()}
            />
          }
        >
          <textarea
            id={inputId}
            class={cls()}
            rows={props.rows ?? 3}
            value={props.value}
            placeholder={props.placeholder}
            disabled={props.disabled}
            aria-invalid={props.error ? 'true' : undefined}
            aria-describedby={describedBy}
            onInput={(e) => props.onInput?.(e.currentTarget.value)}
            onChange={(e) => props.onChange?.(e.currentTarget.value)}
            onBlur={() => props.onBlur?.()}
          />
        </Show>
      )}
    </FieldShell>
  );
}
