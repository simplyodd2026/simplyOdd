import { useId } from 'react'
import { cn } from '@/lib/cn'

/** A silver paperclip, drawn as one bent wire. */
export function PaperClip({ className }: { className?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 28 80" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor="#7D7D7D" /><stop offset="0.5" stopColor="#E6E6E6" /><stop offset="1" stopColor="#8A8A8A" />
        </linearGradient>
      </defs>
      <path d="M9 26 V60 a5 5 0 0 0 10 0 V14 a8 8 0 0 0 -16 0 V64 a11 11 0 0 0 22 0 V24" fill="none" stroke={`url(#${id})`} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

/** A strip of translucent washi tape with softly torn ends. */
export function Tape({ className, tone = 'sand' }: { className?: string; tone?: 'sand' | 'sage' | 'clay' }) {
  const fill = { sand: 'rgb(220 205 185 / 0.82)', sage: 'rgb(154 163 143 / 0.7)', clay: 'rgb(201 135 116 / 0.62)' }[tone]
  return (
    <span aria-hidden="true" className={cn('block h-6 w-24 shadow-[0_1px_2px_rgb(0_0_0/0.08)]', className)}
      style={{
        background: fill,
        clipPath: 'polygon(2% 8%, 7% 0, 12% 10%, 18% 2%, 82% 0, 88% 9%, 93% 1%, 98% 10%, 100% 90%, 94% 100%, 88% 91%, 81% 100%, 19% 98%, 12% 90%, 6% 100%, 0 92%)',
      }} />
  )
}

/** A round push pin with a highlight, in one of the palette's colours. */
export function PushPin({ color, className }: { color: string; className?: string }) {
  return (
    <span aria-hidden="true" data-pin className={cn('block size-5 rounded-full shadow-[2px_4px_4px_rgb(0_0_0/0.3)]', className)}
      style={{ background: `radial-gradient(circle at 35% 30%, #ffffffcc 0 16%, ${color} 22%)` }} />
  )
}
