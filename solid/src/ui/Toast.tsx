import { For, type JSX } from 'solid-js';
import { Portal } from 'solid-js/web';
import { toasts, dismissToast, type ToastKind } from '../state/toast';
import { Icon } from './Icon';

const ICONS: Record<ToastKind, string> = {
  info: 'info',
  success: 'check-circle',
  warning: 'alert',
  error: 'circle-alert',
};

export function ToastHost(): JSX.Element {
  return (
    <Portal>
      <div class="toast-host" role="status" aria-live="polite">
        <For each={toasts()}>
          {(t) => (
            <div class={`toast toast-${t.kind}`}>
              <Icon name={ICONS[t.kind]} size={20} />
              <span class="toast-msg">{t.message}</span>
              <button type="button" class="toast-close" aria-label="Dismiss" onClick={() => dismissToast(t.id)}>
                <Icon name="close" size={16} />
              </button>
            </div>
          )}
        </For>
      </div>
    </Portal>
  );
}
