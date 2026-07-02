import { Show, type JSX } from 'solid-js';
import { Modal } from './Modal';
import { Button } from './Button';

/*
 * Confirmation dialog for irreversible / guarded actions (controls.md#menus--popovers,
 * #buttons). A destructive confirm uses the destructive button treatment. The confirm
 * action can be disabled (e.g. reduce-to-zero requires a reason first).
 */

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  confirmDisabled?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: JSX.Element;
}

export function ConfirmDialog(props: ConfirmDialogProps): JSX.Element {
  return (
    <Modal
      open={props.open}
      onClose={() => props.onCancel()}
      title={props.title}
      size="sm"
      disableDismiss={props.busy}
      footer={
        <>
          <Button label={props.cancelLabel ?? 'Cancel'} variant="ghost" onClick={() => props.onCancel()} disabled={props.busy} />
          <Button
            label={props.confirmLabel ?? 'Confirm'}
            variant={props.destructive ? 'destructive' : 'primary'}
            icon={props.destructive ? 'delete' : undefined}
            onClick={() => props.onConfirm()}
            disabled={props.confirmDisabled}
            busy={props.busy}
          />
        </>
      }
    >
      <Show when={props.message}>
        <p class="confirm-message">{props.message}</p>
      </Show>
      {props.children}
    </Modal>
  );
}
