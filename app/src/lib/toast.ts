export interface Toast {
  id: number;
  message: string;
}

type Handler = (toast: Toast) => void;

let idSeq = 0;
const subscribers = new Set<Handler>();

export function pushToast(message: string): void {
  const toast: Toast = { id: ++idSeq, message };
  subscribers.forEach((s) => s(toast));
}

export function subscribeToasts(handler: Handler): () => void {
  subscribers.add(handler);
  return () => {
    subscribers.delete(handler);
  };
}
