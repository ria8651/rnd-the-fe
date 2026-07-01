/**
 * Accessible modal dialog (spec/ui-standards/layout.md › Modals): scrim, Escape-to-close,
 * focus moves in on open and returns to the opener on close, a basic focus trap, and body
 * scroll lock. Rendered in a portal so it layers above the whole frame.
 */
import { type JSX, Show, createEffect, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Icon } from './Icon';
import { Button } from './Button';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  width?: string;
  children: JSX.Element;
  footer?: JSX.Element;
}

export function Modal(props: ModalProps): JSX.Element {
  let dialog: HTMLDivElement | undefined;

  createEffect(() => {
    if (!props.open) return;
    const opener = document.activeElement as HTMLElement | null;
    queueMicrotask(() => {
      const first = dialog?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? dialog)?.focus();
    });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    onCleanup(() => {
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    });
  });

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      props.onClose();
      return;
    }
    if (e.key === 'Tab' && dialog) {
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.hasAttribute('disabled'));
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <Show when={props.open}>
      <Portal>
        <div class="scrim" onClick={() => props.onClose()} />
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-label={props.title}
          tabindex={-1}
          ref={dialog}
          onKeyDown={onKeyDown}
          style={{ '--modal-w': props.width ?? '460px' }}
        >
          <header class="modal__header">
            <h2>{props.title}</h2>
            <button class="modal__close" type="button" aria-label="Close" onClick={() => props.onClose()}>
              <Icon name="close" size={18} />
            </button>
          </header>
          <div class="modal__body">{props.children}</div>
          <Show when={props.footer}>
            <footer class="modal__footer">{props.footer}</footer>
          </Show>
        </div>
      </Portal>
    </Show>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: JSX.Element;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A yes/no confirmation over a Modal (logout, finalise, reduce-to-zero, …). */
export function ConfirmDialog(props: ConfirmDialogProps): JSX.Element {
  return (
    <Modal
      open={props.open}
      title={props.title}
      onClose={props.onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={() => props.onCancel()}>
            {props.cancelLabel ?? 'Cancel'}
          </Button>
          <Button variant={props.danger ? 'danger' : 'primary'} busy={props.busy} onClick={() => props.onConfirm()}>
            {props.confirmLabel ?? 'Confirm'}
          </Button>
        </>
      }
    >
      <p style={{ margin: 0 }}>{props.message}</p>
    </Modal>
  );
}
