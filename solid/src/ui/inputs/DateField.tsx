/**
 * Date field (spec/ui-standards/inputs.md › Date entry). Values are NaiveDate (YYYY-MM-DD).
 * Uses the native date control as an acceptable fallback (its displayed format follows the
 * OS locale; a DD/MM/YYYY picker is the ideal but out of scope here — flagged ⚠️ VERIFY in
 * the spec). Everywhere a date is *displayed* it is DD/MM/YYYY via `formatDate`.
 */
import { type JSX } from 'solid-js';
import { FieldShell } from './FieldShell';
import { fieldWidth } from './field-widths';

export interface DateFieldProps {
  label?: string;
  /** NaiveDate string YYYY-MM-DD (or null). */
  value: string | null | undefined;
  onChange?: (value: string | null) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  compact?: boolean;
  min?: string;
  max?: string;
  width?: string;
}

export function DateField(props: DateFieldProps): JSX.Element {
  const cls = () =>
    `control${props.compact ? ' control--compact' : ''}${props.error ? ' control--invalid' : ''}`;
  return (
    <FieldShell label={props.label} required={props.required} error={props.error} width={props.width ?? fieldWidth.date}>
      {({ inputId, describedBy }) => (
        <input
          id={inputId}
          class={cls()}
          type="date"
          value={props.value ?? ''}
          min={props.min}
          max={props.max}
          disabled={props.disabled}
          aria-invalid={props.error ? 'true' : undefined}
          aria-describedby={describedBy}
          onChange={(e) => props.onChange?.(e.currentTarget.value || null)}
        />
      )}
    </FieldShell>
  );
}
