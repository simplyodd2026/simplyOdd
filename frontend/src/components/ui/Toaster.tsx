import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useToasts } from '@/stores/toast'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'

export function Toaster() {
  const { toasts, dismiss } = useToasts()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex flex-col items-center gap-2 px-4"
      role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div key={t.id} layout
            initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className={cn('pointer-events-auto flex w-full max-w-md items-center gap-4 rounded-full py-2 pl-5 pr-2 text-[14px] shadow-[0_24px_48px_-20px_rgb(43_32_27/0.6)]',
              t.tone === 'error' ? 'bg-accent text-paper' : 'bg-ink text-paper')}>
            <span className={cn('size-1.5 shrink-0 rounded-full', t.tone === 'error' ? 'bg-paper' : 'bg-hot')} />
            <span className="flex-1 py-1.5">{t.message}</span>
            {t.action && (
              <Link to={t.action.href} onClick={() => dismiss(t.id)} className="rounded-full bg-paper/10 px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-paper hover:text-ink">
                {t.action.label}
              </Link>
            )}
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="grid size-8 place-items-center rounded-full opacity-60 hover:opacity-100"><Icon name="close" size={16} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
