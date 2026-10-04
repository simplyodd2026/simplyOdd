import { useRef, useState, useEffect } from 'react'
import { useProducts, type ProductQuery } from '@/lib/queries'
import { Container } from '@/components/layout/Container'
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard'
import { Reveal } from '@/components/motion/Reveal'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { Icon } from '@/components/ui/Icon'
import { SectionTitle } from './SectionTitle'

/** A swipeable row of products, four at a time on desktop, paged with arrow buttons. */
export function ProductCarousel({ title, query, href, linkLabel }: { title: string; query: ProductQuery; href: string; linkLabel: string }) {
  const { data, isLoading } = useProducts({ page_size: 10, ...query })
  const track = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ start: true, end: false })

  const update = () => {
    const el = track.current
    if (!el) return
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 })
  }
  useEffect(update, [data])
  const page = (dir: number) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.9, behavior: 'smooth' })

  if (!isLoading && !data?.items.length) return null
  const arrow = 'grid size-11 place-items-center rounded-full border border-ink/15 text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink'

  return (
    <Container className="py-20 sm:py-28"><div className="mx-auto max-w-[1440px]">
      <SectionTitle title={title} aside={<>
        <span className="hidden sm:block"><ArrowLink to={href}>{linkLabel}</ArrowLink></span>
        <div className="hidden gap-2 md:flex">
          <button className={arrow} disabled={edge.start} onClick={() => page(-1)} aria-label="Previous products"><Icon name="arrowLeft" size={17} /></button>
          <button className={arrow} disabled={edge.end} onClick={() => page(1)} aria-label="Next products"><Icon name="arrowRight" size={17} /></button>
        </div>
      </>} />
      <Reveal>
        <div ref={track} onScroll={update}
          className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 scrollbar-none sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:mx-0 lg:scroll-px-0 lg:gap-6 lg:px-0">
          {(isLoading ? Array.from({ length: 4 }, () => null) : data!.items).map((p, i) => (
            <div key={p?.id ?? i} className="w-[68vw] shrink-0 snap-start sm:w-[42vw] md:w-[30vw] lg:w-[calc((100%-4.5rem)/4)]">
              {p ? <ProductCard product={p} priority={i < 4} /> : <ProductCardSkeleton />}
            </div>
          ))}
        </div>
      </Reveal>
      <div className="mt-8 sm:hidden"><ArrowLink to={href}>{linkLabel}</ArrowLink></div>
    </div></Container>
  )
}
