import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { lockScroll, unlockScroll } from '@/lib/scroll'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'

const EASE = [0.76, 0, 0.24, 1] as const
const EASE_OUT = [0.16, 1, 0.3, 1] as const

/** Locks page scroll and listens for Escape while an overlay is open. */
export function useOverlay(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    lockScroll()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', onKey)
    return () => {
      unlockScroll()
      window.removeEventListener('keydown', onKey)
    }
  }, [open])
}

/** Moves focus into the panel when it opens and back to whatever opened it when it closes. */
export function useFocusOnOpen<T extends HTMLElement = HTMLDivElement>(open: boolean) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const t = setTimeout(() => {
      ref.current?.querySelector<HTMLElement>('[autofocus], input, button, a[href]')?.focus({ preventScroll: true })
    }, 60)
    return () => { clearTimeout(t); prev?.focus?.({ preventScroll: true }) }
  }, [open])
  return ref
}

export function Drawer({ open, onClose, title, label, children, footer, side = 'right', className }: {
  open: boolean; onClose: () => void; title: ReactNode; label?: string; children: ReactNode; footer?: ReactNode
  side?: 'right' | 'left'; className?: string
}) {
  useOverlay(open, onClose)
  const ref = useFocusOnOpen(open)
  const from = side === 'right' ? '100%' : '-100%'
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={label ?? (typeof title === 'string' ? title : undefined)}>
          <motion.div className="absolute inset-0 bg-ink/45" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: EASE }} />
          <motion.div ref={ref}
            initial={{ x: from }} animate={{ x: 0 }} exit={{ x: from }} transition={{ duration: 0.75, ease: EASE }}
            className={cn('absolute top-0 flex h-full w-full max-w-[30rem] flex-col bg-paper text-graphite',
              side === 'right' ? 'right-0' : 'left-0', className)}>
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-rule px-6 sm:h-20 sm:px-8">
              <div className="font-display text-2xl text-ink">{title}</div>
              <button onClick={onClose} className="-mr-2 grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-ink/5" aria-label="Close">
                <Icon name="close" />
              </button>
            </div>
            <motion.div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.8, ease: EASE_OUT }}>
              {children}
            </motion.div>
            {footer && <div className="shrink-0 border-t border-rule p-6 sm:px-8">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; tone?: 'dark' | 'light'; wide?: boolean
}) {
  useOverlay(open, onClose)
  const ref = useFocusOnOpen(open)
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
          <motion.div className="absolute inset-0 bg-ink/45" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} />
          <motion.div ref={ref} data-lenis-prevent
            initial={{ opacity: 0, y: 32, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className={cn('relative max-h-[90dvh] w-full overflow-y-auto rounded-lg bg-paper p-6 text-graphite shadow-[0_40px_80px_-30px_rgb(43_32_27/0.5)] sm:p-8',
              wide ? 'max-w-3xl' : 'max-w-lg')}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <h2 className="font-display text-3xl text-ink">{title}</h2>
              <button onClick={onClose} className="-mr-2 -mt-1 grid size-10 place-items-center rounded-full hover:bg-ink/5" aria-label="Close"><Icon name="close" /></button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
