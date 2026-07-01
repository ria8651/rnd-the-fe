import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from '@/icons/Icon';
import './Toast.css';

/** Transient notice / toast (spec S5 uses toasts for "no lines to finalise", etc.). */
type ToastTone = 'info' | 'success' | 'warning' | 'error';
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  show: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_ICON: Record<ToastTone, IconName> = {
  info: 'info',
  success: 'check-circle',
  warning: 'alert',
  error: 'circle-alert',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = nextId.current++;
      setItems((list) => [...list, { id, tone, message }]);
      setTimeout(() => remove(id), 5000);
    },
    [remove],
  );

  const api = useRef<ToastApi>({
    show,
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
    info: (m) => show(m, 'info'),
  });
  // Keep the closure current.
  api.current.show = show;
  api.current.success = (m) => show(m, 'success');
  api.current.error = (m) => show(m, 'error');
  api.current.info = (m) => show(m, 'info');

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      {createPortal(
        <div className="oms-toasts" role="region" aria-live="polite" aria-label="Notifications">
          {items.map((t) => (
            <div key={t.id} className={`oms-toast oms-toast--${t.tone}`}>
              <Icon name={TONE_ICON[t.tone]} size={18} />
              <span className="oms-toast__msg">{t.message}</span>
              <button
                type="button"
                className="oms-toast__close"
                aria-label="Dismiss"
                onClick={() => remove(t.id)}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
