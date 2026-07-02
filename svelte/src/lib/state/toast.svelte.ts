// Lightweight toast/notice queue for transient feedback (e.g. "nothing counted to
// finalise", save errors). Announced via an aria-live region in the Toast component.

export type ToastKind = 'info' | 'success' | 'error' | 'warning';
export type Toast = { id: number; kind: ToastKind; message: string };

let nextId = 1;

class ToastState {
  items = $state<Toast[]>([]);

  push(message: string, kind: ToastKind = 'info', ttl = 4000) {
    const id = nextId++;
    this.items = [...this.items, { id, kind, message }];
    if (ttl > 0) setTimeout(() => this.dismiss(id), ttl);
    return id;
  }
  error(message: string) {
    return this.push(message, 'error', 6000);
  }
  success(message: string) {
    return this.push(message, 'success');
  }
  dismiss(id: number) {
    this.items = this.items.filter((t) => t.id !== id);
  }
}

export const toasts = new ToastState();
