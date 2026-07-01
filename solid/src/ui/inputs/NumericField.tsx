/**
 * Numeric quantity field (spec/ui-standards/inputs.md; typography.md › tabular figures).
 * Right-aligned tabular digits, fixed narrow width. Emits `number | null` (empty ⇒ null).
 */
import { type JSX } from 'solid-js';
import { FieldShell } from './FieldShell';
import { fieldWidth } from './field-widths';

export interface NumericFieldProps {
  label?: string;
  value: number | null | undefined;
  onInput?: (value: number | null) => void;
  onChange?: (value: number | null) => void;
  onBlur?: () => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  compact?: boolean;
  placeholder?: string;
  width?: string;
}

export function NumericField(props: NumericFieldProps): JSX.Element {
  const parse = (raw: string): number | null => {
    if (raw.trim() === '') return null;
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  };
  const cls = () =>
    `control${props.compact ? ' control--compact' : ''}${props.error ? ' control--invalid' : ''}`;
  return (
    <FieldShell
      label={props.label}
      required={props.required}
      error={props.error}
      width={props.width ?? fieldWidth.quantity}
    >
      {({ inputId, describedBy }) => (
        <input
          id={inputId}
          class={cls()}
          type="number"
          inputmode="decimal"
          style={{ 'text-align': 'right', 'font-variant-numeric': 'tabular-nums' }}
          value={props.value ?? ''}
          min={props.min}
          max={props.max}
          step={props.step}
          placeholder={props.placeholder}
          disabled={props.disabled}
          aria-invalid={props.error ? 'true' : undefined}
          aria-describedby={describedBy}
          onInput={(e) => props.onInput?.(parse(e.currentTarget.value))}
          onChange={(e) => props.onChange?.(parse(e.currentTarget.value))}
          onBlur={() => props.onBlur?.()}
        />
      )}
    </FieldShell>
  );
}
