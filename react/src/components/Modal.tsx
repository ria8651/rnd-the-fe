import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/icons/Icon';
import { Button } from './Button';
import './Modal.css';

/**
 * Modal / dialog layered above the whole frame for a focused sub-task
 * (spec/ui-standards/layout.md#modals--dialogs): owns its sub-task while open,
 * traps focus, dismisses on Escape / backdrop, returns focus to the trigger on close.
 */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Footer actions (rendered right-aligned). */
  footer?: ReactNode;
  /** Max content width. */
  size?: 'sm' | 'md' | 'lg';
  /** Disable backdrop-click dismissal (e.g. while saving). */
  dismissable?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  dismissable = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const titleId = useRef(`modal-${Math.random().toString(36).slice(2)}`).current;

  // Read the latest callbacks/flags from the keydown handler without making them
  // effect deps — otherwise a parent that passes a fresh onClose each render would
  // re-run the mount effect and steal focus from inputs on every keystroke.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const dismissableRef = useRef(dismissable);
  dismissableRef.current = dismissable;

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;
    const dialog = dialogRef.current;

    // Focus the first focusable element (or the dialog itself) — once, on open.
    const focusables = dialog?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    (focusables?.[0] ?? dialog)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissableRef.current) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      // Simple focus trap.
      if (e.key === 'Tab' && dialog) {
        const items = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.offsetParent !== null);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
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

    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
      // Return focus to the trigger on close.
      (triggerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="oms-modal-scrim"
      onMouseDown={(e) => {
        if (dismissable && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`oms-modal oms-modal--${size}`}
      >
        <header className="oms-modal__head">
          <h2 id={titleId} className="oms-modal__title">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="compact"
            icon="close"
            aria-label="Close"
            title="Close"
            onClick={onClose}
          />
        </header>
        <div className="oms-modal__body">{children}</div>
        {footer && <footer className="oms-modal__footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

/** Small convenience wrapper for the close (×) icon in a header, if needed elsewhere. */
export function CloseGlyph() {
  return <Icon name="close" size={20} />;
}
