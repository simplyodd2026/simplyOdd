import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { tornPolygon } from './random'

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
