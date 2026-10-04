import { Link } from 'react-router-dom'
import { useCategories } from '@/lib/queries'
import { Container } from '@/components/layout/Container'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { Skeleton } from '@/components/ui/misc'
import { SectionTitle } from './SectionTitle'

/** Browse by what a piece is: each collection gets a plinth, a name in gallery capitals and a one-line description. */
export function CategoryGrid() {
  const { data: categories, isLoading } = useCategories()
  return (
    <Container className="py-20 sm:py-28">
      <div className="mx-auto max-w-[1440px]">
        <SectionTitle title="Shop by kind" aside={<ArrowLink to="/collections">All collections</ArrowLink>} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:gap-x-6 lg:gap-y-14">
          {isLoading && Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-[5/4] rounded-[10px]" />)}
          {categories?.map((c) => (
            <Link key={c.id} to={`/collections/${c.slug}`} className="group block">
              <div className="aspect-[5/4] overflow-hidden rounded-[10px] bg-paper-2">
                {c.image && <img src={c.image} alt="" loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-quint)] group-hover:scale-[1.04]" />}
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-ink/70 pt-3">
                <span className="font-display text-[clamp(1.4rem,2vw,1.9rem)] leading-none text-ink"><span className="link-draw">{c.name}</span></span>
                <span className="shrink-0 text-[13px] tabular-nums text-fog">{c.product_count} {c.product_count === 1 ? 'piece' : 'pieces'}</span>
              </div>
              {c.description && <p className="mt-2 hidden max-w-sm text-[14px] text-smoke sm:block">{c.description}</p>}
            </Link>
          ))}
        </div>
      </div>
    </Container>
  )
}
