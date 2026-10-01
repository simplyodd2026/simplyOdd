import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'

function useLockAndEscape(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])
}

function useFocusOnOpen(open: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const el = ref.current?.querySelector<HTMLElement>('[autofocus], input, button, a[href]')
    el?.focus()
    return () => prev?.focus?.()
  }, [open])
  return ref
}

export function Drawer({ open, onClose, title, children, footer, side = 'right', className }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode
  side?: 'right' | 'left'; className?: string
}) {
  useLockAndEscape(open, onClose)
  const ref = useFocusOnOpen(open)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
      <div className="animate-fade absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={ref} className={cn('animate-drawer absolute top-0 flex h-full w-full max-w-md flex-col bg-paper text-graphite shadow-2xl',
        side === 'right' ? 'right-0 border-l border-rule' : 'left-0 border-r border-rule', className)}>
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-rule px-5">
          <div className="text-lg font-semibold w-semi">{title}</div>
          <button onClick={onClose} className="-mr-2 p-2 text-smoke hover:text-ink" aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="shrink-0 border-t border-rule p-5">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Modal({ open, onClose, title, children, tone = 'dark', wide }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; tone?: 'dark' | 'light'; wide?: boolean
}) {
  useLockAndEscape(open, onClose)
  const ref = useFocusOnOpen(open)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="animate-fade absolute inset-0 bg-ink/40" onClick={onClose} />
      <div ref={ref} className={cn('animate-fade relative max-h-[90dvh] w-full overflow-y-auto rounded-3xl p-6 sm:p-8',
        wide ? 'max-w-3xl' : 'max-w-lg',
        tone === 'dark' ? 'border border-rule bg-paper text-graphite shadow-2xl' : 'bg-paper text-ink shadow-2xl')}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold w-semi">{title}</h2>
          <button onClick={onClose} className="-mr-2 -mt-1 p-2 opacity-60 hover:opacity-100" aria-label="Close"><Icon name="close" /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
