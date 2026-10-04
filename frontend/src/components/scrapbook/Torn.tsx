import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { seeded, tornPolygon } from './random'

function jagged(seed: string, base: number, amp: number) {
  const r = seeded(seed)
  let d = `M0,${base}`
  for (let x = 0; x < 1000; x += 8 + r() * 22) d += ` L${x.toFixed(0)},${(base - r() * amp - (r() > 0.85 ? amp * 0.8 : 0)).toFixed(1)}`
  return d + ` L1000,${base - r() * amp} L1000,80 L0,80 Z`
}

/**
 * A torn paper edge that sits on top of a coloured block. The pale "fibre"
 * layer peeks out above the colour, the way real torn paper shows its core.
 * Use `flip` to tear the bottom of a block instead.
 */
export function TornEdge({ color, fibre = '#F1E7D3', seed = 'edge', flip, className }: {
  color: string; fibre?: string | null; seed?: string; flip?: boolean; className?: string
}) {
  return (
    <svg viewBox="0 0 1000 80" preserveAspectRatio="none" aria-hidden="true"
      className={cn('block h-10 w-full sm:h-14', flip && 'rotate-180', className)}>
      {fibre && <path d={jagged(seed + "f", 52, 30)} style={{ fill: fibre }} />}
      <path d={jagged(seed, 62, 26)} style={{ fill: color }} />
    </svg>
  )
}

/** A torn scrap of note paper. The drop shadow sits on the wrapper so it follows the tear. */
export function TornNote({ children, seed = 'note', className, paperClassName, style, paperStyle }: {
  children: ReactNode; seed?: string; className?: string; paperClassName?: string; style?: CSSProperties; paperStyle?: CSSProperties
}) {
  return (
    <div className={cn('cutout', className)} style={style}>
      <div className={cn('grain bg-cream', paperClassName)} style={{ clipPath: tornPolygon(seed), ...paperStyle }}>
        {children}
      </div>
    </div>
  )
}
