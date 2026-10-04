import type { ReactNode } from 'react'
import { SplitReveal } from '@/components/motion/Reveal'

/** Retail section header: a title in gallery capitals, with controls or a link on the right. */
export function SectionTitle({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4 sm:mb-12">
      <SplitReveal as="h2" className="font-display text-[clamp(2.4rem,4.4vw,4.5rem)] leading-[0.95] text-ink">{title}</SplitReveal>
      {aside && <div className="flex items-center gap-6">{aside}</div>}
    </div>
  )
}
