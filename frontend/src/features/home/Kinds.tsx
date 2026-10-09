import { Link } from 'react-router-dom'
import { useCategories, useConfig } from '@/lib/queries'
import { money } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Container } from '@/components/layout/Container'
import { SplitReveal, Reveal } from '@/components/motion/Reveal'
import { Icon } from '@/components/ui/Icon'

// Terracotta, linen and olive, like three swatches laid across a strip of sand.
const TONES = [
  'bg-hot text-paper',
  'bg-paper-2 text-ink',
  'bg-olive text-paper',
]

/**
 * Shop by kind. The collections as cut slabs of colour laid over a band of sand, with a fourth, plain
 * slab tucked underneath the middle one. Each says what's inside and how many pieces there are today.
 */
export function Kinds() {
  const { data: categories } = useCategories()
  const { data: config } = useConfig()
  if (!categories?.length) return null

  return (
    <section className="pb-20 pt-28 sm:pb-28 sm:pt-36">
      <Container>
        <div className="mx-auto mb-14 flex max-w-[1360px] flex-wrap items-end justify-between gap-6">
          <SplitReveal as="h2" className="font-display text-[clamp(2.6rem,5vw,5rem)] leading-[1] text-ink">Shop by kind</SplitReveal>
          <p className="max-w-xs text-[15px] leading-[1.65] text-smoke">Every piece is made to order and ships free over {money(config?.free_shipping_threshold ?? 1999)}.</p>
        </div>
      </Container>

      <div className="relative">
        <div aria-hidden className="linen absolute inset-x-0 top-[18%] h-[52%] bg-sand max-md:hidden" />
        <Container>
          <Reveal stagger={0.1} y={40} className="relative mx-auto grid max-w-[1360px] gap-5 md:grid-cols-3 md:gap-6">
            {categories.map((c, i) => (
              <div key={c.id} className="relative">
                {i % 3 === 1 && <span aria-hidden className="slab absolute -bottom-12 left-[12%] right-[-14%] top-[30%] -z-0 bg-tan/70 max-md:hidden" />}
                <Link to={`/collections/${c.slug}`}
                  className={cn('group relative isolate flex min-h-[15rem] flex-col justify-between overflow-hidden p-7 transition-transform duration-700 ease-[var(--ease-out-quint)] hover:-translate-y-1.5 sm:p-9 md:aspect-[5/4.4] md:min-h-0',
                    i % 2 ? 'slab-r' : 'slab', c.image ? 'bg-ash text-paper' : TONES[i % TONES.length], !c.image && i % 3 === 1 && 'ring-1 ring-ink/5')}>
                  {c.image && (
                    <>
                      <img src={c.image} alt="" loading="lazy" decoding="async"
                        className="absolute inset-0 -z-10 size-full object-cover transition-transform duration-[1.4s] ease-[var(--ease-out-quint)] group-hover:scale-[1.04]" />
                      {/* Darken the top and foot so the count and the name stay legible over any photo. */}
                      <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/35 via-ink/0 via-40% to-ink/70" />
                    </>
                  )}
                  <span className="flex items-center justify-between text-[14px] opacity-80">
                    {c.product_count ? `${c.product_count} ${c.product_count === 1 ? 'piece' : 'pieces'}` : 'Coming soon'}
                    <Icon name="arrowUpRight" size={20} className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                  <span>
                    <span className="block font-display text-[clamp(2.2rem,3.4vw,3.2rem)] leading-none">{c.name}</span>
                    {c.description && <span className="mt-3 block max-w-[18rem] text-[14px] leading-snug opacity-80">{c.description}</span>}
                  </span>
                </Link>
              </div>
            ))}
          </Reveal>
        </Container>
      </div>
    </section>
  )
}
