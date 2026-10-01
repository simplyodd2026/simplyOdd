import { create } from 'zustand'

export interface Toast { id: number; message: string; tone: 'default' | 'error'; action?: { label: string; href: string } }

interface ToastState {
  toasts: Toast[]
  push: (message: string, opts?: Partial<Omit<Toast, 'id' | 'message'>>) => void
  dismiss: (id: number) => void
}

let seq = 0
export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, opts) => {
    const id = ++seq
    set({ toasts: [...get().toasts.slice(-2), { id, message, tone: 'default', ...opts }] })
    setTimeout(() => get().dismiss(id), 4500)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

export const toast = (message: string, opts?: Partial<Omit<Toast, 'id' | 'message'>>) =>
  useToasts.getState().push(message, opts)
export const toastError = (e: unknown) =>
  toast(e instanceof Error ? e.message : 'Something went wrong. Try again.', { tone: 'error' })
