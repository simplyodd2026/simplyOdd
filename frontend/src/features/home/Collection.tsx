import { Link } from 'react-router-dom'
import type { Product } from '@/lib/types'
import { money } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useTilt } from '@/lib/useTilt'
import { Container } from '@/components/layout/Container'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { Reveal } from '@/components/motion/Reveal'
import { useHomePieces, objectNo } from './pieces'

/** One object as a magazine would caption it: the picture first, then a small index, its name, a line, the price. */
function ObjectTile({ product: p, index, frame, aspect, className, shape }: {
  product: Product; index: number; frame: string; aspect: string; className?: string; shape?: string
}) {
  const tilt = useTilt<HTMLDivElement>(4)
  const [primary, secondary] = p.images
  return (
    <article className={cn('group relative', className)}>
      {/* A coloured slab behind the picture, offset so the object seems to stand in front of it. */}
      {shape && <span aria-hidden className={cn('absolute -z-10', shape)} />}
      <div ref={tilt}>
        <Link to={`/product/${p.slug}`} aria-label={`${p.name}, ${money(p.price)}`}
          className={cn('relative block overflow-hidden bg-ash table-shadow', frame, aspect)}>
          {primary && <img src={primary.url} alt={primary.alt || p.name} loading="lazy" decoding="async"
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

/**
 * The collection, laid out like a spread rather than a grid: one large object, a second standing on a
 * terracotta slab, a line of large italic type in the gap between them, and the rest in a staggered row.
 * The word "collected" runs behind the whole composition in pale sage.
 */
export function Collection() {
  const { all, total } = useHomePieces()
  if (!all.length) return null
  const [a, b, ...rest] = all
  const more = rest.slice(0, 4)
  const offsets = ['lg:mt-0', 'lg:mt-24', 'lg:mt-8', 'lg:mt-32']

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
              <ObjectTile product={a} index={0} frame="pebble-3" aspect="aspect-[4/5]" />
            </Reveal>

            <div className="flex flex-col gap-16 lg:col-span-5 lg:col-start-8 lg:pt-40">
              {b && (
                <Reveal y={60} className="px-6 sm:px-10 lg:px-0">
                  <ObjectTile product={b} index={1} frame="slab" aspect="aspect-[4/5]" className="mx-auto max-w-[24rem] lg:mx-0"
                    shape="-bottom-6 -right-6 top-10 left-10 slab-r bg-clay/70 sm:-right-10" />
                </Reveal>
              )}
              <p className="font-odd text-[clamp(2rem,3.4vw,3.4rem)] leading-[1.08] text-ink text-balance lg:-ml-24">
                Things worth keeping around, for a long time.
              </p>
            </div>
          </div>

          {more.length > 0 && (
            <div className="mt-24 grid grid-cols-2 gap-x-5 gap-y-16 lg:grid-cols-4 lg:gap-x-8">
              {more.map((p, i) => (
                <ObjectTile key={p.id} product={p} index={i + 2} frame={['arch', 'pebble', 'slab', 'plate'][i]} aspect="aspect-[4/5]" className={offsets[i]} />
              ))}
            </div>
          )}
        </div>
      </Container>
    </section>
  )
}
