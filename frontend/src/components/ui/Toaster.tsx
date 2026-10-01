import { Link } from 'react-router-dom'
import { useToasts } from '@/stores/toast'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'

export function Toaster() {
  const { toasts, dismiss } = useToasts()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
      role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={cn('animate-toast pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-2xl',
          t.tone === 'error' ? 'bg-accent text-paper' : 'bg-ink text-paper')}>
          <span className="flex-1">{t.message}</span>
          {t.action && <Link to={t.action.href} onClick={() => dismiss(t.id)} className="font-semibold underline underline-offset-4">{t.action.label}</Link>}
          <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="opacity-50 hover:opacity-100"><Icon name="close" size={16} /></button>
        </div>
      ))}
    </div>
  )
}
