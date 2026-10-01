import { Link } from 'react-router-dom'
import { Container, SectionHeading } from '@/components/layout/Container'
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard'
import { useProducts, type ProductQuery } from '@/lib/queries'
import { Bolt, Daisy } from '@/components/scrapbook/Stickers'

const more = 'inline-flex h-10 items-center rounded-full border-2 border-ink px-5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-paper'

/** A row of products. `ranked` scribbles a "no. 1, no. 2…" above each card, circling the top three. */
export function ProductRail({ title, kicker, query, href, linkLabel, ranked }: {
  title: string; kicker?: string; query: ProductQuery; href: string; linkLabel: string; ranked?: boolean
}) {
  const { data, isLoading } = useProducts({ page_size: 8, ...query })
  if (!isLoading && !data?.items.length) return null
  return (
    <Container className="relative py-14 sm:py-16">
      <Bolt className="absolute left-[33%] top-10 hidden w-12 -rotate-12 lg:block" />
      <Daisy className="absolute right-[24%] top-14 hidden w-12 rotate-12 lg:block" petal="#F4D3D7" />
      <SectionHeading variant="highlight" kicker={kicker} title={title} aside={<Link to={href} className={more}>{linkLabel}</Link>} />
      <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 pt-2 scrollbar-none sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-y-10 lg:overflow-visible lg:px-0">
        {(isLoading ? Array.from({ length: 4 }, () => null) : data!.items.slice(0, 8)).map((p, i) => (
          <div key={p?.id ?? i} className="w-[68vw] shrink-0 snap-start sm:w-[40vw] lg:w-auto">
            {ranked && <Rank n={i + 1} />}
            {p ? <ProductCard product={p} /> : <ProductCardSkeleton />}
          </div>
        ))}
      </div>
    </Container>
  )
}

function Rank({ n }: { n: number }) {
  return (
    <p className="font-hand relative mb-2 ml-1 inline-block -rotate-3 text-2xl leading-none text-ink">
      no. {n}
      {n <= 3 && (
        <svg viewBox="0 0 120 50" aria-hidden="true" className="absolute -inset-x-3 -inset-y-2 h-[calc(100%+1rem)] w-[calc(100%+1.5rem)] text-accent">
          <path d="M20 8C60 0 112 6 114 24C116 44 50 48 18 42C-4 38 2 14 36 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}
    </p>
  )
}
