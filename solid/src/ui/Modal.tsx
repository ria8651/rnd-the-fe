import { Show, createEffect, onCleanup, type JSX } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Icon } from './Icon';

/*
 * Modal / dialog (layout.md#modals--dialogs): layered above the whole frame for a
 * focused sub-task. Owns focus while open (trap) and returns focus to the trigger
 * on close. Backdrop uses surface.scrim; Escape closes unless suppressed (a dirty
 * modal guards its own close — the caller intercepts onClose).
 */

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: JSX.Element;
  footer?: JSX.Element;
  /** small | medium | large — controls max width. */
  size?: 'sm' | 'md' | 'lg';
  /** Disable Escape / backdrop dismissal (e.g. while saving). */
  disableDismiss?: boolean;
  headerActions?: JSX.Element;
}

export function Modal(props: ModalProps): JSX.Element {
  let dialog: HTMLDivElement | undefined;

  createEffect(() => {
    if (!props.open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    requestAnimationFrame(() => {
      const focusable = dialog?.querySelector<HTMLElement>(
        'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])',
      );
      (focusable ?? dialog)?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !props.disableDismiss) {
        e.stopPropagation();
        props.onClose();
        return;
      }
      if (e.key === 'Tab' && dialog) {
        const nodes = dialog.querySelectorAll<HTMLElement>(
          'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])',
        );
        const items = Array.from(nodes).filter((n) => !n.hasAttribute('disabled'));
        if (items.length === 0) return;
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
    document.addEventListener('keydown', onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    onCleanup(() => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    });
  });

  return (
    <Show when={props.open}>
      <Portal>
        <div
          class="modal-scrim"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget && !props.disableDismiss) props.onClose();
          }}
        >
          <div
            ref={dialog}
            class={`modal modal-${props.size ?? 'md'}`}
            role="dialog"
            aria-modal="true"
            aria-label={props.title}
            tabindex="-1"
          >
            <header class="modal-header">
              <h2 class="modal-title">{props.title}</h2>
              <div class="modal-header-actions">
                {props.headerActions}
                <button
                  type="button"
                  class="modal-close"
                  aria-label="Close"
                  onClick={() => props.onClose()}
                >
                  <Icon name="close" size={20} />
                </button>
              </div>
            </header>
            <div class="modal-body">{props.children}</div>
            <Show when={props.footer}>
              <footer class="modal-footer">{props.footer}</footer>
            </Show>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
