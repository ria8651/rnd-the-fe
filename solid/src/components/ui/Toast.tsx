import {
  createContext,
  createSignal,
  For,
  useContext,
  type ParentComponent,
} from 'solid-js';
import { Icon } from './Icon';

type ToastKind = 'info' | 'success' | 'error';
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastCtx {
  show: (message: string, kind?: ToastKind) => void;
}

const Context = createContext<ToastCtx>();

let nextId = 1;

export const ToastProvider: ParentComponent = (props) => {
  const [toasts, setToasts] = createSignal<ToastItem[]>([]);

  const show = (message: string, kind: ToastKind = 'info') => {
    const id = nextId++;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  };

  const icon = (k: ToastKind) =>
    k === 'error' ? 'alert' : k === 'success' ? 'check-circle' : 'info';

  return (
    <Context.Provider value={{ show }}>
      {props.children}
      <div class="toast-region" role="status" aria-live="polite">
        <For each={toasts()}>
          {(t) => (
            <div class={`toast toast--${t.kind}`}>
              <Icon name={icon(t.kind)} />
              <span>{t.message}</span>
            </div>
          )}
        </For>
      </div>
    </Context.Provider>
  );
};

export function useToast(): ToastCtx {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
