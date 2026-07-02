import { Show, splitProps, createUniqueId, type JSX } from 'solid-js';
import { Icon } from './Icon';

/*
 * Input fields (inputs.md). Labels sit above and are always visible. Invalid
 * combines an error border AND an icon + message (never colour alone). Focus
 * changes colour, not geometry.
 */

export interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  fieldId: string;
  class?: string;
  children: JSX.Element;
}

export function Field(props: FieldProps): JSX.Element {
  return (
    <div class={`field${props.error ? ' field-invalid' : ''}${props.class ? ` ${props.class}` : ''}`}>
      <Show when={props.label}>
        <label class="field-label" for={props.fieldId}>
          {props.label}
          {props.required && <span class="field-required" aria-hidden="true"> *</span>}
        </label>
      </Show>
      {props.children}
      <Show when={props.error}>
        <div class="field-error" id={`${props.fieldId}-error`} role="alert">
          <Icon name="circle-alert" size={16} />
          <span>{props.error}</span>
        </div>
      </Show>
      <Show when={props.hint && !props.error}>
        <div class="field-hint">{props.hint}</div>
      </Show>
    </div>
  );
}

type BaseInputProps = {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  containerClass?: string;
};

export function TextInput(
  props: JSX.InputHTMLAttributes<HTMLInputElement> & BaseInputProps,
): JSX.Element {
  const [local, rest] = splitProps(props, [
    'label',
    'error',
    'hint',
    'required',
    'containerClass',
    'id',
    'class',
  ]);
  const id = local.id ?? createUniqueId();
  return (
    <Field
      label={local.label}
      error={local.error}
      hint={local.hint}
      required={local.required}
      fieldId={id}
      class={local.containerClass}
    >
      <input
        {...rest}
        id={id}
        type={rest.type ?? 'text'}
        class={`input${local.class ? ` ${local.class}` : ''}`}
        aria-invalid={local.error ? 'true' : undefined}
        aria-describedby={local.error ? `${id}-error` : undefined}
      />
    </Field>
  );
}

export function TextArea(
  props: JSX.TextareaHTMLAttributes<HTMLTextAreaElement> & BaseInputProps,
): JSX.Element {
  const [local, rest] = splitProps(props, [
    'label',
    'error',
    'hint',
    'required',
    'containerClass',
    'id',
    'class',
  ]);
  const id = local.id ?? createUniqueId();
  return (
    <Field
      label={local.label}
      error={local.error}
      hint={local.hint}
      required={local.required}
      fieldId={id}
      class={local.containerClass}
    >
      <textarea
        {...rest}
        id={id}
        rows={rest.rows ?? 3}
        class={`input textarea${local.class ? ` ${local.class}` : ''}`}
        aria-invalid={local.error ? 'true' : undefined}
        aria-describedby={local.error ? `${id}-error` : undefined}
      />
    </Field>
  );
}

export interface NumericInputProps extends BaseInputProps {
  value: number | null | undefined;
  onValue: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  class?: string;
  onBlur?: () => void;
}

export function NumericInput(props: NumericInputProps): JSX.Element {
  const id = props.id ?? createUniqueId();
  return (
    <Field
      label={props.label}
      error={props.error}
      hint={props.hint}
      required={props.required}
      fieldId={id}
      class={props.containerClass}
    >
      <input
        id={id}
        type="number"
        inputmode="decimal"
        class={`input input-numeric tabular${props.class ? ` ${props.class}` : ''}`}
        value={props.value ?? ''}
        min={props.min}
        max={props.max}
        step={props.step}
        disabled={props.disabled}
        placeholder={props.placeholder}
        aria-invalid={props.error ? 'true' : undefined}
        aria-describedby={props.error ? `${id}-error` : undefined}
        onInput={(e) => {
          const v = e.currentTarget.value;
          props.onValue(v === '' ? null : Number(v));
        }}
        onBlur={() => props.onBlur?.()}
      />
    </Field>
  );
}

export interface DateInputProps extends BaseInputProps {
  value: string; // ISO yyyy-mm-dd
  onValue: (value: string) => void;
  disabled?: boolean;
  id?: string;
}

export function DateInput(props: DateInputProps): JSX.Element {
  const id = props.id ?? createUniqueId();
  return (
    <Field
      label={props.label}
      error={props.error}
      hint={props.hint}
      required={props.required}
      fieldId={id}
      class={props.containerClass}
    >
      <input
        id={id}
        type="date"
        class="input input-date"
        value={props.value}
        disabled={props.disabled}
        aria-invalid={props.error ? 'true' : undefined}
        onInput={(e) => props.onValue(e.currentTarget.value)}
      />
    </Field>
  );
}
