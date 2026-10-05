import { Link } from 'react-router-dom'
import type { Category } from '@/lib/types'
import { useCategories, useProducts } from '@/lib/queries'
import { useDocumentTitle } from '@/lib/hooks'
import { money, plural } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Container } from '@/components/layout/Container'
import { ButtonLink } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/misc'
import { SplitReveal, Reveal } from '@/components/motion/Reveal'

// Behind each empty collection: a pebble in one of the palette's tones, carrying the collection's initial.
const EMPTY_TONES = ['bg-clay/35', 'bg-sage/45', 'bg-tan/45']

/**
 * The collections, one chapter each. A collection is shown through its own pieces: an arched photograph of
 * the most loved one, a second view set into the corner as a round plate, and the first few pieces listed
 * with their prices. Collections still being designed get a pebble with their initial and a way to ask for
 * something made to order instead.
 */
export default function CollectionsPage() {
  const { data: categories, isLoading } = useCategories()
  useDocumentTitle('Collections')

  return (
    <>
      <Container className="pb-16 pt-12 sm:pb-24 sm:pt-20">
        <div className="mx-auto max-w-[1360px]">
          <nav className="mb-10 flex gap-2 text-[13px] text-fog" aria-label="Breadcrumb">
            <Link to="/" className="link-draw hover:text-ink">Home</Link><span aria-hidden>/</span><span className="text-ink">Collections</span>
          </nav>
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
            <SplitReveal as="h1" on="load" delay={0.1} className="font-display text-[clamp(3.4rem,8vw,8rem)] leading-[0.95] text-ink lg:col-span-8">
              The collections,<br /><span className="font-odd">grouped by where they live.</span>
            </SplitReveal>
            <Reveal delay={0.3} y={16} className="lg:col-span-4">
              <p className="max-w-sm text-[16.5px] leading-[1.7] text-smoke">
                Lamps for the evening, vessels for the shelf, planters for everything green. Each piece is made to order in our studio.
              </p>
              {categories && (
                <ul className="mt-7 flex flex-wrap gap-2" aria-label="Jump to a collection">
                  {categories.map((c) => (
                    <li key={c.id}>
                      <a href={`#${c.slug}`} className="block rounded-full border border-ink/15 px-4 py-2 text-[14px] text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper">
                        {c.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Reveal>
          </div>
        </div>
      </Container>

      {isLoading && <Container><Skeleton className="mx-auto h-[28rem] max-w-[1360px] rounded-[2.5rem]" /></Container>}
      {categories?.map((c, i) => <Chapter key={c.id} category={c} index={i} />)}

      {/* The way out when nothing fits: make one. */}
      <Container className="py-24 sm:py-32">
        <div className="mx-auto flex max-w-[1360px] flex-col items-start justify-between gap-8 border-t border-rule pt-14 md:flex-row md:items-end">
          <div>
            <p className="font-script text-[clamp(2.6rem,4vw,3.4rem)] leading-none text-accent">not quite it?</p>
            <h2 className="mt-2 max-w-[18ch] font-display text-[clamp(2.2rem,4vw,3.8rem)] leading-[1.02] text-ink">Tell us the idea, and we’ll build it for you.</h2>
          </div>
          <ButtonLink to="/customise" variant="terra" size="lg">Customise a piece</ButtonLink>
        </div>
      </Container>
    </>
  )
}

function Chapter({ category: c, index }: { category: Category; index: number }) {
  const { data, isLoading } = useProducts({ category: c.slug, sort: 'popular', page_size: 3 })
  const pieces = data?.items ?? []
  const flip = index % 2 === 1
  const lead = pieces[0]
  const main = lead?.images[0]?.url ?? c.image ?? undefined
  const inset = lead?.images[1]?.url ?? pieces[1]?.images[0]?.url
  const empty = !isLoading && !pieces.length

  return (
    <section id={c.slug} className={cn('scroll-mt-28 py-20 sm:py-28', flip && 'linen bg-stone')}>
      <Container>
        <div className="mx-auto grid max-w-[1360px] items-center gap-14 lg:grid-cols-12 lg:gap-10">
          <Reveal y={50} className={cn('relative mx-auto w-full max-w-[min(30rem,calc((100svh-12rem)*0.75))] lg:col-span-5',
            flip ? 'lg:col-start-8' : 'lg:col-start-1')}>
            {empty ? (
              <div className={cn('pebble grid aspect-[3/4] place-items-center', EMPTY_TONES[index % EMPTY_TONES.length])}>
                <span aria-hidden className="font-odd text-[clamp(9rem,18vw,15rem)] leading-none text-ink/80">{c.name[0]}</span>
              </div>
            ) : (
              <>
                <Link to={`/collections/${c.slug}`} aria-label={`Shop ${c.name}`} className="table-shadow arch block aspect-[3/4] overflow-hidden bg-ash">
                  {main && <img src={main} alt={lead?.images[0]?.alt || c.name} loading="lazy" decoding="async"
                    className="size-full object-cover transition-transform duration-[1.4s] ease-[var(--ease-out-quint)] hover:scale-[1.03]" />}
                </Link>
                {inset && (
                  <div className={cn('plate absolute -bottom-8 w-[36%] overflow-hidden border-[6px] bg-ash', flip ? '-left-3 border-stone sm:-left-12' : '-right-3 border-paper sm:-right-12')}>
                    <img src={inset} alt="" loading="lazy" className="aspect-square size-full object-cover" />
                  </div>
                )}
              </>
            )}
          </Reveal>

          <div className={cn('lg:row-start-1', flip ? 'lg:col-span-6 lg:col-start-1' : 'lg:col-span-6 lg:col-start-7')}>
            <p className="text-[14px] text-accent">{empty ? 'On the workbench' : plural(c.product_count, 'piece')}</p>
            <h2 className="mt-2 font-display text-[clamp(3rem,6.4vw,6.25rem)] leading-[0.96] text-ink">{c.name}</h2>
            {c.description && <p className="mt-5 max-w-[30rem] font-odd text-[clamp(1.25rem,1.7vw,1.55rem)] leading-snug text-smoke">{c.description}</p>}

            {pieces.length > 0 && (
              <ul className="mt-9 max-w-[30rem] border-b border-ink/15">
                {pieces.map((p) => (
                  <li key={p.id} className="border-t border-ink/15">
                    <Link to={`/product/${p.slug}`} className="group flex items-baseline justify-between gap-4 py-3.5">
                      <span className="font-display text-[1.35rem] text-ink transition-transform duration-500 group-hover:translate-x-1.5">{p.name}</span>
                      <span className="text-[14px] tabular-nums text-smoke">{money(p.price)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
              {empty ? (
                <>
                  <p className="max-w-xs text-[15px] leading-relaxed text-smoke">We’re still designing this collection. Want one sooner? We can make it to order.</p>
                  <ButtonLink to="/customise" variant="outline" size="lg">Customise one</ButtonLink>
                </>
              ) : (
                <ButtonLink to={`/collections/${c.slug}`} size="lg">Shop {c.name.toLowerCase()}</ButtonLink>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
