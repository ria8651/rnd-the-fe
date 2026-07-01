/**
 * Field wrapper: a static label above the control (always visible) and, when invalid, an
 * error message below with an icon (icon + text + border — never colour alone). Associates
 * the label and error with the control via ids for screen readers (spec/ui-standards/inputs.md).
 */
import { type JSX, Show, createUniqueId } from 'solid-js';
import { Icon } from '../Icon';

export interface FieldShellProps {
  label?: string;
  required?: boolean;
  error?: string;
  full?: boolean;
  /** width as a CSS value (e.g. '120px', '50%'). */
  width?: string;
  /** Receives ids to wire onto the control. */
  children: (ids: { inputId: string; errorId: string; describedBy?: string }) => JSX.Element;
}

export function FieldShell(props: FieldShellProps): JSX.Element {
  const inputId = createUniqueId();
  const errorId = createUniqueId();
  return (
    <div class={`field${props.full ? ' field--full' : ''}`} style={props.width ? { width: props.width } : undefined}>
      <Show when={props.label}>
        <label class="field__label" for={inputId}>
          {props.label}
          <Show when={props.required}>
            <span class="field__required" aria-hidden="true">
              *
            </span>
          </Show>
        </label>
      </Show>
      {props.children({ inputId, errorId, describedBy: props.error ? errorId : undefined })}
      <Show when={props.error}>
        <span class="field__error" id={errorId}>
          <Icon name="circle-alert" size={14} />
          {props.error}
        </span>
      </Show>
    </div>
  );
}
