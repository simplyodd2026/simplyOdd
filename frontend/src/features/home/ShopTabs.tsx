import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useProducts, type ProductQuery } from '@/lib/queries'
import { Container } from '@/components/layout/Container'
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { SectionTitle } from './SectionTitle'
import { cn } from '@/lib/cn'

const TABS: { label: string; query: ProductQuery; href: string }[] = [
  { label: 'Best sellers', query: { flag: 'bestseller', sort: 'popular' }, href: '/bestsellers' },
  { label: 'Top rated', query: { sort: 'rating' }, href: '/shop?sort=rating' },
  { label: 'Under ₹2,000', query: { max_price: 2000, sort: 'popular' }, href: '/shop?max=2000&sort=popular' },
]

/** Popular products with quick tabs, so a shopper can change the shelf without leaving the page. */
export function ShopTabs() {
  const [tab, setTab] = useState(0)
  const current = TABS[tab]
  const { data, isLoading } = useProducts({ page_size: 8, ...current.query })

  return (
    <Container className="py-16 sm:py-24">
      <SectionTitle title="Most popular" aside={<ArrowLink to={current.href}>View all</ArrowLink>} />
      <div className="-mt-2 mb-8 flex gap-1 overflow-x-auto scrollbar-none" role="tablist">
        {TABS.map((t, n) => (
          <button key={t.label} role="tab" aria-selected={n === tab} onClick={() => setTab(n)}
            className={cn('relative shrink-0 rounded-full px-4 py-2 text-[14px] transition-colors duration-300', n === tab ? 'text-paper' : 'text-smoke hover:text-ink')}>
            {n === tab && <motion.span layoutId="shop-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} className="grid grid-cols-2 gap-x-4 gap-y-12 lg:grid-cols-4 lg:gap-x-6"
          initial="hidden" animate="show" exit={{ opacity: 0, transition: { duration: 0.2 } }}
          variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
          {(isLoading ? Array.from({ length: 8 }, () => null) : data?.items ?? []).map((p, i) => (
            <motion.div key={p?.id ?? i} variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } } }}>
              {p ? <ProductCard product={p} /> : <ProductCardSkeleton />}
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </Container>
  )
}
