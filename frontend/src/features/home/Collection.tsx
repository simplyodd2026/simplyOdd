import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { money } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useTilt } from '@/lib/useTilt'
import { useImageAspect } from '@/lib/hooks'
import { Container } from '@/components/layout/Container'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { Icon } from '@/components/ui/Icon'
import { Reveal } from '@/components/motion/Reveal'
import { useHomePieces, objectNo, type Piece } from './pieces'

/** One object as a magazine would caption it: the picture first, then a small index, its name, a line, the price. */
function ObjectTile({ piece, index, frame, aspect, className, shape }: {
  piece: Piece; index: number; frame: string; aspect: string; className?: string; shape?: string
}) {
  const p = piece.product
  const tilt = useTilt<HTMLDivElement>(4)
  const fit = useImageAspect(0.66, 1.3)
  // The chosen photo, if any, and on hover the product's next photo.
  const primary = piece.image ?? p.images[0]
  const secondary = p.images.find((i) => i.url !== primary?.url)
  return (
    <article className={cn('group relative', className)}>
      {/* A coloured slab behind the picture, offset so the object seems to stand in front of it. */}
      {shape && <span aria-hidden className={cn('absolute -z-10', shape)} />}
      <div ref={tilt}>
        <Link to={`/product/${p.slug}`} aria-label={`${p.name}, ${money(p.price)}`}
          className={cn('relative block overflow-hidden bg-ash table-shadow', frame, aspect)} style={fit.style}>
          {primary && <img {...fit.img} src={primary.url} alt={primary.alt || p.name} loading="lazy" decoding="async"
            className={cn('absolute inset-0 size-full object-cover transition-[opacity,transform] duration-[1.4s] ease-[var(--ease-out-quint)] group-hover:scale-[1.03]', secondary && 'group-hover:opacity-0')} />}
          {secondary && <img src={secondary.url} alt="" aria-hidden loading="lazy" decoding="async"
            className="absolute inset-0 size-full scale-[1.05] object-cover opacity-0 transition-[opacity,transform] duration-[1.4s] ease-[var(--ease-out-quint)] group-hover:scale-100 group-hover:opacity-100" />}
        </Link>
      </div>
      <div className="mt-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] text-accent">{objectNo(index)}</p>
          <h3 className="mt-1 font-display text-[clamp(1.6rem,2.2vw,2.1rem)] leading-[1.05] text-ink">
            <Link to={`/product/${p.slug}`} className="link-draw">{p.name}</Link>
          </h3>
          {p.tagline && <p className="mt-1 font-odd text-[1.05rem] text-smoke">{p.tagline}</p>}
        </div>
        <p className="shrink-0 pt-6 text-right font-display text-[1.25rem] tabular-nums text-ink">{money(p.price)}</p>
      </div>
    </article>
  )
}

const FRAMES = ['arch', 'pebble', 'slab', 'plate']
// The staggered heights of the old row of four, repeated along the slider so it still reads as a spread.
const OFFSETS = ['lg:mt-0', 'lg:mt-16', 'lg:mt-6', 'lg:mt-20']

/**
 * The rest of the collection as a row that slides sideways: four at a time on a desktop, two and a bit on a
 * phone, so the next piece peeking in shows there's more. Swipe, scroll sideways, or use the arrows.
 */
function Slider({ pieces }: { pieces: Piece[] }) {
  const track = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: true })

  const measure = () => {
    const el = track.current
    if (el) setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 })
  }
  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [pieces.length])
  const slide = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.75, behavior: 'smooth' })

  return (
    <div className="mt-24">
      {!(edges.start && edges.end) && (
        <div className="mb-8 flex justify-end gap-2">
          {([[-1, 'chevronLeft', 'Previous pieces', edges.start], [1, 'chevronRight', 'Next pieces', edges.end]] as const).map(([dir, icon, label, off]) => (
            <button key={dir} type="button" onClick={() => slide(dir)} disabled={off} aria-label={label}
              className="grid size-11 place-items-center rounded-full border border-ink/20 text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper disabled:pointer-events-none disabled:opacity-30">
              <Icon name={icon} size={18} />
            </button>
          ))}
        </div>
      )}
      {/* Padding inside the track keeps the tiles' shadows and hover lift from being clipped by the scroll edge. */}
      <div ref={track} onScroll={measure}
        className="-mx-5 flex snap-x snap-mandatory scroll-px-5 items-start gap-5 overflow-x-auto px-5 pb-10 pt-2 scrollbar-none sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:mx-0 lg:gap-8 lg:scroll-px-0 lg:px-0">
        {pieces.map((p, i) => (
          <ObjectTile key={p.product.id} piece={p} index={i + 2} frame={FRAMES[i % FRAMES.length]} aspect="aspect-[4/5]"
            className={cn('w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-[calc((100%-6rem)/4)]', OFFSETS[i % OFFSETS.length])} />
        ))}
      </div>
    </div>
  )
}

/**
 * The collection, laid out like a spread rather than a grid: one large object, a second standing on a
 * terracotta slab, a line of large italic type in the gap between them, and the rest in a staggered row.
 * The word "collected" runs behind the whole composition in pale sage.
 */
export function Collection() {
  const { collectionLarge, collectionRow: more, total } = useHomePieces()
  if (!collectionLarge.length) return null
  const [a, b] = collectionLarge

  return (
    <section className="relative isolate overflow-hidden py-28 sm:py-40">
      <p aria-hidden className="pointer-events-none absolute left-1/2 top-[clamp(6rem,12vw,11rem)] -z-10 -translate-x-1/2 select-none whitespace-nowrap font-odd text-[clamp(7rem,22vw,24rem)] leading-none text-sage/25">
        collected
      </p>
      <Container>
        <div className="mx-auto max-w-[1360px]">
          <div className="mb-16 flex flex-wrap items-end justify-between gap-6 sm:mb-24">
            <p className="text-[14px] text-fog">The collection</p>
            <ArrowLink to="/shop">See all {total ? `${total} objects` : 'objects'}</ArrowLink>
          </div>

          <div className="grid gap-20 lg:grid-cols-12 lg:gap-8">
            <Reveal y={60} className="mx-auto w-full max-w-[calc((100svh-12rem)*0.8)] lg:col-span-6">
              <ObjectTile piece={a} index={0} frame="pebble-3" aspect="aspect-[4/5]" />
            </Reveal>

            <div className="flex flex-col gap-16 lg:col-span-5 lg:col-start-8 lg:pt-40">
              {b && (
                <Reveal y={60} className="px-6 sm:px-10 lg:px-0">
                  <ObjectTile piece={b} index={1} frame="slab" aspect="aspect-[4/5]" className="mx-auto max-w-[24rem] lg:mx-0"
                    shape="-bottom-6 -right-6 top-10 left-10 slab-r bg-clay/70 sm:-right-10" />
                </Reveal>
              )}
              <p className="font-odd text-[clamp(2rem,3.4vw,3.4rem)] leading-[1.08] text-ink text-balance lg:-ml-24">
                Things worth keeping around, for a long time.
              </p>
            </div>
          </div>

          {more.length > 0 && <Slider pieces={more} />}
        </div>
      </Container>
    </section>
  )
}
