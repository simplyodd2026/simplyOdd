import type { ReactNode } from 'react'
import { SplitReveal, Reveal } from '@/components/motion/Reveal'
import { Container } from './Container'
import { cn } from '@/lib/cn'

/** The opening of every inner page: a mono trail, an oversized title that rises in, and a short standfirst. */
export function PageHeader({ trail, title, count, intro, aside, className }: {
  trail?: ReactNode; title: ReactNode; count?: number; intro?: ReactNode; aside?: ReactNode; className?: string
}) {
  return (
    <Container className={cn('pb-12 pt-12 sm:pb-16 sm:pt-20', className)}>
      {trail && <Reveal y={12} className="label mb-8 flex flex-wrap items-center gap-2 text-fog">{trail}</Reveal>}
      <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
        <div className="flex items-start gap-3 lg:col-span-8">
          <SplitReveal as="h1" on="load" by="lines" delay={0.15} className="font-display text-[length:var(--text-title)] leading-[0.92] text-ink">
            {title}
          </SplitReveal>
          {count !== undefined && <sup className="mt-[0.6em] font-mono text-[13px] text-fog">({String(count).padStart(2, '0')})</sup>}
        </div>
        {(intro || aside) && (
          <Reveal delay={0.35} y={20} className="flex flex-col gap-6 lg:col-span-4">
            {intro && <p className="max-w-md text-[17px] leading-relaxed text-smoke text-pretty">{intro}</p>}
            {aside}
          </Reveal>
        )}
      </div>
    </Container>
  )
}
