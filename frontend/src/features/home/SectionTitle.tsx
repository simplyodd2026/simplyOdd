import type { ReactNode } from 'react'
import { SplitReveal } from '@/components/motion/Reveal'

/** Compact retail section header: a title that rises in, with controls or a link on the right. */
export function SectionTitle({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
      <SplitReveal as="h2" className="font-display text-[clamp(2rem,3.6vw,3.5rem)] leading-none text-ink">{title}</SplitReveal>
      {aside && <div className="flex items-center gap-6">{aside}</div>}
    </div>
  )
}
