import { Link } from 'react-router-dom'
import { useCategories } from '@/lib/queries'
import { Container } from '@/components/layout/Container'
import { Reveal } from '@/components/motion/Reveal'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { Skeleton } from '@/components/ui/misc'
import { SectionTitle } from './SectionTitle'

/** Shop by category: one image per collection, name and count beneath. */
export function CategoryGrid() {
  const { data: categories, isLoading } = useCategories()
  return (
    <Container className="py-16 sm:py-24">
      <SectionTitle title="Shop by category" aside={<ArrowLink to="/collections">All collections</ArrowLink>} />
      <Reveal stagger={0.06} className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-6">
        {isLoading && Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-square" />)}
        {categories?.map((c) => (
          <Link key={c.id} to={`/collections/${c.slug}`} className="group block">
            <div className="aspect-square overflow-hidden rounded-lg bg-ash transition-shadow duration-700 group-hover:shadow-[0_24px_40px_-24px_rgb(155_44_44/0.35)]">
              {c.image && <img src={c.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-quint)] group-hover:scale-[1.07]" />}
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-2">
              <span className="text-[15px] font-medium text-ink"><span className="link-draw">{c.name}</span></span>
              <span className="font-mono text-[11px] text-fog">{c.product_count}</span>
            </div>
          </Link>
        ))}
      </Reveal>
    </Container>
  )
}
