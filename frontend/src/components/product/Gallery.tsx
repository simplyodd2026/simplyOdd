import { useRef, useState } from 'react'
import type { ProductImage } from '@/lib/types'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'

/** Primary image with thumbnails, hover-zoom on desktop and swipe on touch. */
export function Gallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)
  const touch = useRef<number | null>(null)
  const count = images.length
  const go = (i: number) => { setIndex((i + count) % count); setZoom(null) }
  const current = images[index]

  if (!count) return <div className="aspect-[4/5] bg-ash" />

  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row">
      <div className="flex gap-2 overflow-x-auto scrollbar-none lg:w-20 lg:flex-col" role="tablist" aria-label="Product images">
        {images.map((img, i) => (
          <button key={img.url} role="tab" aria-selected={i === index} aria-label={`Image ${i + 1} of ${count}`}
            onClick={() => go(i)}
            className={cn('relative aspect-[4/5] w-16 shrink-0 overflow-hidden bg-ash lg:w-full',
              i === index ? 'outline-2 outline-accent outline-offset-2 outline' : 'opacity-60 hover:opacity-100')}>
            <img src={img.url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      <div
        className={cn('relative aspect-[4/5] flex-1 touch-pan-y overflow-hidden bg-ash', zoom ? 'cursor-zoom-out' : 'lg:cursor-zoom-in')}
        onMouseMove={(e) => {
          if (!zoom) return
          const r = e.currentTarget.getBoundingClientRect()
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
        }}
        onClick={(e) => {
          if (window.matchMedia('(pointer: coarse)').matches) return
          const r = e.currentTarget.getBoundingClientRect()
          setZoom(zoom ? null : { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
        }}
        onMouseLeave={() => setZoom(null)}
        onTouchStart={(e) => { touch.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (touch.current === null) return
          const dx = e.changedTouches[0].clientX - touch.current
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1))
          touch.current = null
        }}
      >
        <img src={current.url} alt={current.alt || name} draggable={false}
          className="h-full w-full object-cover transition-transform duration-300 ease-out"
          style={zoom ? { transform: 'scale(2.2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} />
        {count > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); go(index - 1) }} aria-label="Previous image"
              className="absolute left-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center bg-ink/80 text-paper hover:bg-ink lg:hidden">
              <Icon name="chevronLeft" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); go(index + 1) }} aria-label="Next image"
              className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center bg-ink/80 text-paper hover:bg-ink lg:hidden">
              <Icon name="chevronRight" />
            </button>
          </>
        )}
        <span className="pointer-events-none absolute bottom-3 right-3 hidden items-center gap-1.5 bg-paper/80 px-2 py-1 text-xs text-ink lg:inline-flex">
          <Icon name="zoom" size={14} /> {zoom ? 'Click to zoom out' : 'Click to zoom'}
        </span>
        <span className="absolute bottom-3 left-3 bg-paper/80 px-2 py-1 text-xs tabular-nums text-ink lg:hidden">{index + 1} / {count}</span>
      </div>
    </div>
  )
}
