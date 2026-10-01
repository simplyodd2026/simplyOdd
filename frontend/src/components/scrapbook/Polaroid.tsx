import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'

/** A taped instant photo that links to a product. */
export function Polaroid({ to, src, alt, caption, className, style, tape = true, tabIndex }: {
  to: string; src?: string; alt: string; caption?: string; className?: string; style?: CSSProperties; tape?: boolean; tabIndex?: number
}) {
  return (
    <Link to={to} tabIndex={tabIndex} style={style}
      className={cn('group relative block bg-paper p-2.5 pb-3 shadow-[0_14px_30px_-12px_rgb(67_48_42/0.45)] transition-transform duration-300 ease-[var(--ease-spring)] hover:z-10 hover:!rotate-0 hover:scale-105 sm:p-3',
        tape && 'tape', className)}>
      <div className="aspect-square overflow-hidden bg-ash">
        {src && <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />}
      </div>
      {caption && <p className="font-hand mt-2 truncate text-center text-sm text-ink sm:text-base">{caption} <span aria-hidden="true">♡</span></p>}
    </Link>
  )
}
