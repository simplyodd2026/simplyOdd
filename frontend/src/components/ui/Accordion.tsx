import { useId, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** A disclosure row whose body eases open (grid-rows 0fr → 1fr keeps it a single cheap transition). */
export function Accordion({ title, children, defaultOpen = false }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <div className="border-b border-rule">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id}
        className="group flex w-full items-center justify-between py-5 text-left text-[16px] text-ink">
        <span className="link-draw">{title}</span>
        <span className="relative grid size-6 place-items-center" aria-hidden="true">
          <span className="absolute h-px w-3.5 bg-current" />
          <span className={cn('absolute h-3.5 w-px bg-current transition-transform duration-500 ease-[var(--ease-out-quint)]', open && 'rotate-90 scale-y-0')} />
        </span>
      </button>
      <div id={id} className={cn('grid transition-[grid-template-rows] duration-500 ease-[var(--ease-out-quint)]', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="min-h-0 overflow-hidden">
          <div className={cn('pb-6 text-[15px] leading-relaxed text-smoke transition-opacity duration-500', open ? 'opacity-100' : 'opacity-0')}>{children}</div>
        </div>
      </div>
    </div>
  )
}
