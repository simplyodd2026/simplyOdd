import { cn } from '@/lib/cn'

/**
 * The brand's signature: bubbly letters that each sit at their own tilt and
 * height, like fridge magnets, so even the name looks a little odd.
 */
const JIGGLE: [number, number][] = [
  [-6, 0.02], [4, -0.06], [-3, 0.04], [7, -0.03], [-5, 0.05],
  [0, 0],
  [5, -0.04], [-4, 0.05], [6, -0.02], [-7, 0.03],
]

export function Wordmark({ className, animate = false, text = 'Simply Odd' }: { className?: string; animate?: boolean; text?: string }) {
  return (
    <span className={cn('font-display inline-flex items-baseline leading-none', className)} aria-label="Simply Odd" role="img">
      {[...text].map((ch, i) => {
        if (ch === ' ') return <span key={i} className="w-[0.22em]" />
        const [rot, dy] = JIGGLE[i % JIGGLE.length]
        return (
          <span key={i} aria-hidden="true" className={cn('inline-block', animate && 'overflow-hidden pb-[0.1em]')}>
            <span className={cn('inline-block', animate && 'animate-reveal')}
              style={{ transform: `rotate(${rot}deg) translateY(${dy}em)`, animationDelay: animate ? `${80 + i * 55}ms` : undefined }}>
              {ch}
            </span>
          </span>
        )
      })}
    </span>
  )
}
