import { Link } from 'react-router-dom'
import { useCart } from '@/stores/cart'
import { toast } from '@/stores/toast'
import { money } from '@/lib/format'
import { useTilt } from '@/lib/useTilt'
import { useImageAspect } from '@/lib/hooks'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
import { Reveal } from '@/components/motion/Reveal'
import { useHomePieces, objectNo } from './pieces'

/**
 * The object. One piece, very large, in a pebble-shaped frame on a linen band, with its own name set huge
 * and pale behind it. The words stay small and to one side: what it is, what it costs, how to have it.
 */
export function Spotlight() {
  const { spotlight, spotlightInset, all } = useHomePieces()
  const p = spotlight?.product
  const add = useCart((s) => s.add)
  const tilt = useTilt<HTMLDivElement>(4)
  const shape = useImageAspect(0.75, 1.6)
  if (!p) return null

  const main = spotlight?.image ?? p.images[0]
  const soldOut = p.availability === 'out_of_stock'
  const index = Math.max(0, all.findIndex((x) => x.id === p.id))
  const addToBag = () => {
    add(p.id)
    toast(`${p.name} added to your bag`, { action: { label: 'View bag', href: '/cart' } })
  }

  return (
    <section className="linen relative isolate overflow-hidden bg-stone pb-16 pt-20 sm:pb-20 sm:pt-24">
      <p aria-hidden className="pointer-events-none absolute right-[-0.06em] top-[clamp(1rem,6vw,5rem)] -z-10 select-none whitespace-nowrap font-display text-[clamp(7rem,21vw,22rem)] leading-none text-sage/30">
        {p.name}
      </p>
      <Container>
        <div className="mx-auto grid max-w-[1400px] items-end gap-14 lg:grid-cols-12 lg:gap-8">
          <Reveal y={60} className="relative mx-auto w-full lg:col-span-7" style={{ maxWidth: `calc((100svh - 20rem) * ${shape.ratio ?? 1.25})` }}>
            <div ref={tilt}>
              <Link to={`/product/${p.slug}`} aria-label={p.name} className="table-shadow pebble-2 block aspect-[5/4] overflow-hidden bg-ash" style={shape.style}>
                {main && <img {...shape.img} src={main.url} alt={main.alt || p.name} loading="lazy" decoding="async" className="size-full object-cover" />}
              </Link>
            </div>
            {spotlightInset && (
              <div className="plate absolute -bottom-10 right-[4%] w-[30%] overflow-hidden border-[6px] border-stone bg-ash sm:-bottom-14">
                <img src={spotlightInset} alt="" loading="lazy" className="aspect-square size-full object-cover" />
              </div>
            )}
          </Reveal>

          <div className="lg:col-span-4 lg:col-start-9 lg:pb-6">
            <p className="text-[14px] text-accent">{objectNo(index)}</p>
            <h2 className="mt-3 font-display text-[clamp(2.75rem,4.6vw,4.5rem)] leading-[0.98] text-ink">
              <Link to={`/product/${p.slug}`} className="link-draw">{p.name}</Link>
            </h2>
            {p.tagline && <p className="mt-3 font-odd text-[clamp(1.35rem,1.8vw,1.65rem)] leading-snug text-smoke">{p.tagline}</p>}
            {p.description && <p className="mt-6 line-clamp-3 max-w-[24rem] text-[16px] leading-[1.7] text-graphite text-pretty">{p.description}</p>}
            <p className="mt-8 flex items-baseline gap-4">
              <span className="font-display text-[2.1rem] leading-none tabular-nums text-ink">{money(p.price)}</span>
              {p.compare_at_price && p.compare_at_price > p.price && <s className="text-[14px] text-fog">{money(p.compare_at_price)}</s>}
              <span className="text-[14px] text-smoke">{soldOut ? 'Sold out' : p.availability === 'low_stock' ? `Only ${p.stock} left` : 'In stock'}</span>
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Button onClick={addToBag} disabled={soldOut} size="lg">{soldOut ? 'Sold out' : 'Add to bag'}</Button>
              <Link to={`/product/${p.slug}`} className="link-draw text-[15px] font-medium text-ink">Explore object</Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
