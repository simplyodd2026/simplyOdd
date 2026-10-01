import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { Container, SectionHeading } from '@/components/layout/Container'
import { ProductCardSkeleton } from '@/components/product/ProductCard'
import { HeartPatch, Lollipop, Planet, Sparkle } from '@/components/scrapbook/Stickers'
import { useProducts } from '@/lib/queries'
import { money } from '@/lib/format'
import type { Product } from '@/lib/types'

// Each card is printed on its own pastel stock, like a set of collectibles.
const FRAMES = [
  { frame: 'bg-pink-2', window: 'bg-pink', type: 'main character' },
  { frame: 'bg-butter', window: 'bg-cream', type: 'rare find' },
  { frame: 'bg-sky', window: 'bg-paper-2', type: 'fan favourite' },
  { frame: 'bg-mint', window: 'bg-paper-2', type: 'certified odd' },
  { frame: 'bg-lilac', window: 'bg-paper-2', type: 'shelf candy' },
  { frame: 'bg-peach', window: 'bg-cream', type: 'limited run' },
]

/** Featured pieces as a fanned-out hand of collectible trading cards. Hover pulls one out of the fan. */
export function Featured() {
  const { data, isLoading } = useProducts({ flag: 'featured', sort: 'newest', page_size: 6 })
  const cards = data?.items ?? []
  const mid = (cards.length - 1) / 2

  return (
    <Container className="relative overflow-hidden py-16 sm:py-24 lg:overflow-visible">
      <Planet className="absolute left-[25%] top-14 hidden w-24 rotate-6 lg:block" color="#CBDABF" ring="#E8B4BC" />
      <Lollipop className="absolute right-[20%] top-12 hidden w-11 rotate-12 lg:block" a="#9DB2D8" />
      <SectionHeading center variant="highlight" className="[--hl:var(--color-lilac)]" kicker="collect them all" title="Hand-picked by us" />
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)}</div>
      ) : (
        <div className="relative">
          <Sparkle className="absolute left-[6%] top-4 hidden w-12 lg:block" />
          <HeartPatch className="absolute -top-6 right-[3%] hidden w-14 rotate-12 lg:block" color="#F2CBAE" />
          {/* On phones the hand becomes a swipeable row; from lg up it fans out. */}
          <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-10 pt-6 scrollbar-none sm:-mx-6 sm:px-6 lg:mx-0 lg:justify-center lg:gap-0 lg:overflow-visible lg:px-0 lg:pb-16 lg:pt-10">
            {cards.map((p, i) => {
              const offset = i - mid
              return (
                <li key={p.id} className="group relative shrink-0 snap-center lg:-mx-1 lg:hover:!z-30"
                  style={{ '--fan-r': `${offset * 4.5}deg`, '--fan-y': `${offset * offset * 9}px`, zIndex: i + 1 } as CSSProperties}>
                  <TradingCard product={p} n={i + 1} of={cards.length} style={FRAMES[i % FRAMES.length]} />
                </li>
              )
            })}
          </ul>
          <p className="font-hand -mt-2 text-center text-base text-smoke">psst, hover to pull a card <span aria-hidden="true">♡</span></p>
        </div>
      )}
    </Container>
  )
}

function TradingCard({ product: p, n, of, style }: { product: Product; n: number; of: number; style: typeof FRAMES[number] }) {
  // A silly, stable "odd-o-meter" score from the product's rating (or its position).
  const oddness = Math.max(3, Math.min(5, Math.round(p.rating.average || 5 - (n % 2))))
  return (
    <Link to={`/product/${p.slug}`}
      className={`grain block w-60 rounded-2xl p-2.5 shadow-[0_18px_36px_-16px_rgb(67_48_42/0.55)] transition-transform duration-300 ease-[var(--ease-spring)]
        lg:[transform:translateY(var(--fan-y))_rotate(var(--fan-r))] lg:group-hover:[transform:translateY(-28px)_rotate(0deg)_scale(1.06)] ${style.frame}`}>
      <div className="rounded-xl border-2 border-ink/10 bg-paper/70 p-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-display text-xl leading-none text-ink">{p.name}</p>
          <span className="shrink-0 rounded-full bg-ink px-2 py-0.5 text-xs font-bold tabular-nums text-paper">{money(p.price)}</span>
        </div>
        <div className={`relative mt-2 aspect-[4/3] overflow-hidden rounded-lg border-[3px] border-paper shadow-inner ${style.window}`}>
          <img src={p.images[1]?.url ?? p.images[0]?.url} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
          <span className="absolute left-1.5 top-1.5 rounded-full bg-paper/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">{style.type}</span>
        </div>
        <p className="font-hand mt-2.5 line-clamp-2 min-h-[2.6em] text-sm leading-snug text-graphite">{p.tagline}</p>
        <div className="mt-2 flex items-center justify-between border-t-2 border-dashed border-ink/15 pt-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-smoke">odd-o-meter</span>
          <span className="text-sm tracking-widest text-accent" aria-label={`${oddness} out of 5 odd`}>
            {'♥'.repeat(oddness)}<span className="text-ink/20">{'♥'.repeat(5 - oddness)}</span>
          </span>
        </div>
      </div>
      <p className="mt-1.5 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-ink/50">no. {n} of {of}</p>
    </Link>
  )
}
