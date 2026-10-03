import { useProducts, type ProductQuery } from '@/lib/queries'
import type { Product } from '@/lib/types'
import { Container, SectionHeading } from '@/components/layout/Container'
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard'
import { Reveal } from '@/components/motion/Reveal'
import { ArrowLink } from '@/components/ui/ArrowLink'

/** A row of four products; a swipe strip on small screens. */
export function ProductRail({ title, kicker, query = {}, products, href, linkLabel, className }: {
  title: string; kicker?: string; query?: ProductQuery; products?: Product[]; href: string; linkLabel: string; className?: string; ranked?: boolean
}) {
  const fetched = useProducts({ page_size: 4, ...query }, !products)
  const data = products ? { items: products } : fetched.data
  const isLoading = !products && fetched.isLoading
  if (!isLoading && !data?.items.length) return null
  return (
    <Container className={className ?? 'py-24 sm:py-32'}>
      <SectionHeading kicker={kicker} title={title} aside={<ArrowLink to={href}>{linkLabel}</ArrowLink>} />
      <Reveal stagger={0.08} className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 scrollbar-none sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-8 lg:overflow-visible lg:px-0">
        {(isLoading ? Array.from({ length: 4 }, () => null) : data!.items.slice(0, 4)).map((p, i) => (
          <div key={p?.id ?? i} className="w-[70vw] shrink-0 snap-start sm:w-[42vw] lg:w-auto">
            {p ? <ProductCard product={p} /> : <ProductCardSkeleton />}
          </div>
        ))}
      </Reveal>
    </Container>
  )
}
