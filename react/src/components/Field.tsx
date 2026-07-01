import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { Icon } from '@/icons/Icon';
import './Field.css';

/**
 * Field label + control + validation, per spec/ui-standards/inputs.md.
 * Labels sit above the control and are always visible. An invalid field combines
 * an error-colour border AND an icon + message — never colour alone.
 */
interface FieldShellProps {
  label?: ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function FieldShell({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: FieldShellProps) {
  // Stable ids so a control's aria-describedby resolves to the message (a11y).
  const errId = htmlFor ? `${htmlFor}-err` : undefined;
  const hintId = htmlFor ? `${htmlFor}-hint` : undefined;
  return (
    <div className={`oms-field${className ? ` ${className}` : ''}`}>
      {label != null && (
        <label className="oms-field__label" htmlFor={htmlFor}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={errId} className="oms-field__error" role="alert">
          <Icon name="circle-alert" size={14} />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="oms-field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
  hint?: string;
  fieldClassName?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, error, hint, required, id, fieldClassName, className, ...rest },
  ref,
) {
  const genId = useId();
  const inputId = id ?? genId;
  const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;
  return (
    <FieldShell
      label={label}
      htmlFor={inputId}
      error={error}
      hint={hint}
      required={required}
      className={fieldClassName}
    >
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`oms-input${error ? ' oms-input--invalid' : ''}${
          className ? ` ${className}` : ''
        }`}
        {...rest}
      />
    </FieldShell>
  );
});

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  error?: string;
  hint?: string;
  fieldClassName?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, error, hint, required, id, fieldClassName, className, rows = 3, ...rest },
  ref,
) {
  const genId = useId();
  const inputId = id ?? genId;
  const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;
  return (
    <FieldShell
      label={label}
      htmlFor={inputId}
      error={error}
      hint={hint}
      required={required}
      className={fieldClassName}
    >
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`oms-input oms-textarea${error ? ' oms-input--invalid' : ''}${
          className ? ` ${className}` : ''
        }`}
        {...rest}
      />
    </FieldShell>
  );
});
