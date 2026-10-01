import { Link } from 'react-router-dom'
import { Container, SectionHeading } from '@/components/layout/Container'
import { Bolt, Planet, Sparkle } from '@/components/scrapbook/Stickers'
import { useCategories, useProducts } from '@/lib/queries'
import { cn } from '@/lib/cn'
import { plural } from '@/lib/format'

interface Tile { key: string; to: string; name: string; note: string; image?: string | null }

// Ring colours rotate through the pastels so the row reads as a set, not a generated list.
const RINGS = ['ring-pink-2', 'ring-butter', 'ring-lilac', 'ring-mint', 'ring-sky', 'ring-peach']

/** "Shop by category": a row of round photo bubbles with pastel rings, scrollable on small screens. */
export function CategoryMosaic() {
  const { data: categories } = useCategories()
  const { data: fresh } = useProducts({ flag: 'new', page_size: 1 })
  const { data: best } = useProducts({ flag: 'bestseller', sort: 'popular', page_size: 1 })
  if (!categories) return null

  const tiles: Tile[] = [
    { key: 'new', to: '/new', name: 'New in', note: 'Fresh off the printer', image: fresh?.items[0]?.images[1]?.url },
    { key: 'best', to: '/bestsellers', name: 'Best sellers', note: 'What people keep buying', image: best?.items[0]?.images[1]?.url },
    ...categories.map((c) => ({ key: c.id, to: `/collections/${c.slug}`, name: c.name, note: plural(c.product_count, 'piece'), image: c.image })),
  ]

  return (
    <Container className="relative py-16 sm:py-20">
      <Sparkle className="absolute left-[18%] top-14 hidden w-10 lg:block" />
      <Sparkle className="absolute right-[20%] top-24 hidden w-7 lg:block" />
      <Planet className="absolute left-[4%] top-8 hidden w-24 -rotate-12 lg:block" />
      <Bolt className="absolute right-[7%] top-10 hidden w-12 rotate-12 lg:block" color="#BFD1E8" />
      <SectionHeading center kicker="pick your kind of odd" title="Shop by category" />
      <ul className="-mx-4 flex snap-x gap-5 overflow-x-auto px-4 pb-4 pt-3 scrollbar-none sm:-mx-6 sm:gap-8 sm:px-6 lg:mx-0 lg:justify-center lg:px-0">
        {tiles.map((t, i) => (
          <li key={t.key} className="shrink-0 snap-start">
            <Link to={t.to} className="group flex w-28 flex-col items-center text-center sm:w-36">
              <span className={cn('relative block size-28 overflow-hidden rounded-full bg-ash ring-[6px] ring-offset-4 ring-offset-paper transition-transform duration-300 ease-[var(--ease-spring)] group-hover:-translate-y-1.5 group-hover:rotate-3 sm:size-36',
                RINGS[i % RINGS.length])}>
                {t.image && <img src={t.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />}
                {i === 0 && (
                  <span className="font-hand absolute inset-x-0 bottom-2 mx-auto w-max rounded-full bg-accent px-2.5 py-0.5 text-[11px] text-paper">new!</span>
                )}
              </span>
              <span className="mt-4 font-bold leading-tight text-ink group-hover:text-accent">{t.name}</span>
              <span className="font-hand mt-0.5 text-xs text-fog">{t.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  )
}
