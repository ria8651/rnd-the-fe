import { onCleanup, onMount, type JSX } from 'solid-js';
import { Icon } from './Icon';

export interface ModalProps {
  title: string;
  onClose: () => void;
  children: JSX.Element;
  footer?: JSX.Element;
  maxWidth?: number;
}

// Dialog surface with scrim; Escape / outside-click / close-button dismiss
// (controls.md#menus--popovers, applied to modal).
export function Modal(props: ModalProps): JSX.Element {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') props.onClose();
  };
  onMount(() => document.addEventListener('keydown', onKey));
  onCleanup(() => document.removeEventListener('keydown', onKey));

  return (
    <div
      class="scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div class="modal" role="dialog" aria-modal="true" aria-label={props.title} style={props.maxWidth ? { 'max-width': `${props.maxWidth}px` } : undefined}>
        <div class="modal__header">
          <h2 class="modal__title">{props.title}</h2>
          <button class="btn btn--ghost btn--icon" aria-label="Close" onClick={() => props.onClose()}>
            <Icon name="close" />
          </button>
        </div>
        <div class="modal__body">{props.children}</div>
        {props.footer && <div class="modal__footer">{props.footer}</div>}
      </div>
    </div>
  );
}
