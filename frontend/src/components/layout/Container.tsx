import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Ransom } from '@/components/scrapbook/Ransom'

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10', className)}>{children}</div>
}

type HeadingStyle = 'ransom' | 'label' | 'highlight' | 'stamp' | 'marker'

/** Renders a plain-string title in one of the scrapbook lettering styles. */
function Lettering({ text, variant }: { text: string; variant: HeadingStyle }) {
  switch (variant) {
    case 'label':
      return <span className="label-tape inline-block -rotate-1 rounded-[4px] px-5 py-2.5 text-[0.62em] font-bold uppercase tracking-[0.2em]">{text}</span>
    case 'highlight':
      return <span className="highlight inline-block -rotate-1 px-2 font-display">{text}</span>
    case 'stamp':
      return (
        <span className="grain inline-block -rotate-2 rounded-lg border-[3px] border-accent px-4 py-1.5 text-[0.7em] font-bold uppercase tracking-[0.16em] text-accent opacity-90"
          style={{ fontFamily: '"DM Serif Display", serif' }}>{text}</span>
      )
    case 'marker':
      return (
        <span className="relative inline-block font-display">
          {text}
          <svg viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true" className="absolute -bottom-3 left-0 h-3 w-full text-accent-soft">
            <path d="M3 13C60 5 120 4 180 8S270 15 297 6" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          </svg>
        </span>
      )
    default:
      return <Ransom text={text} />
  }
}

export function SectionHeading({ title, kicker, aside, className, center, variant = 'ransom' }: {
  title: ReactNode; kicker?: ReactNode; aside?: ReactNode; className?: string; center?: boolean; variant?: HeadingStyle
}) {
  return (
    <div className={cn('mb-8 flex flex-wrap gap-4 sm:mb-10', center ? 'flex-col items-center text-center' : 'items-end justify-between', className)}>
      <div>
        {kicker && <p className="font-hand -rotate-2 text-lg leading-none text-accent sm:text-xl">{kicker} <span aria-hidden="true">♡</span></p>}
        <h2 className="mt-3 text-[length:var(--text-heading)] leading-none text-ink">
          {typeof title === 'string' ? <Lettering text={title} variant={variant} /> : title}
        </h2>
      </div>
      {aside}
    </div>
  )
}
