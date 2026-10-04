import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { SplitReveal } from '@/components/motion/Reveal'

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1520px] px-5 sm:px-8 lg:px-10', className)}>{children}</div>
}

/** A section opener: a mono index/kicker above a display title that rises into place, with an optional aside. */
export function SectionHeading({ title, kicker, index, aside, className, center }: {
  title: ReactNode; kicker?: ReactNode; index?: string; aside?: ReactNode; className?: string; center?: boolean
  variant?: string
}) {
  return (
    <div className={cn('mb-10 flex flex-wrap gap-6 sm:mb-14', center ? 'flex-col items-center text-center' : 'items-end justify-between', className)}>
      <div>
        {(kicker || index) && (
          <p className="label mb-5 flex items-center gap-3 text-fog">
            {index && <span className="text-ink">({index})</span>}
            {kicker}
          </p>
        )}
        <SplitReveal as="h2" className="max-w-4xl font-display text-[length:var(--text-heading)] leading-[0.98] text-ink text-balance">{title}</SplitReveal>
      </div>
      {aside}
    </div>
  )
}
