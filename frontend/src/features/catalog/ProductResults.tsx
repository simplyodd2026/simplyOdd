import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import type { Page, Product } from '@/lib/types'
import { useCategories } from '@/lib/queries'
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard'
import { Pagination } from '@/components/ui/misc'
import { Drawer } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { plural } from '@/lib/format'
import { scrollToY } from '@/lib/scroll'
import { cn } from '@/lib/cn'
import { Filters } from './Filters'
import { SORT_OPTIONS, type useCatalogParams } from './useCatalogParams'

type Params = ReturnType<typeof useCatalogParams>

export function ProductResults({ params, data, isLoading, isFetching, empty, showCategories = true, extraSorts = [] }: {
  params: Params
  data: Page<Product> | undefined
  isLoading: boolean
  isFetching: boolean
  empty: ReactNode
  showCategories?: boolean
  extraSorts?: { value: string; label: string }[]
}) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { data: categories } = useCategories()
  const sorts = [...extraSorts, ...SORT_OPTIONS]
  const tab = (active: boolean) => cn('shrink-0 rounded-full px-4 py-2 text-[14px] transition-colors duration-300',
    active ? 'bg-ink text-paper' : 'text-smoke hover:bg-ink/5 hover:text-ink')

  return (
    <div>
      {/* Toolbar: collections as tabs, then filter and sort */}
      <div className="sticky top-0 z-20 -mx-5 mb-10 flex items-center gap-4 border-y border-rule bg-paper/95 px-5 py-3 backdrop-blur-sm sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        {showCategories && categories ? (
          <div className="-ml-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-none">
            <button className={tab(!params.category)} onClick={() => params.update({ category: null })}>All</button>
            {categories.map((c) => (
              <button key={c.id} className={tab(params.category === c.slug)} onClick={() => params.update({ category: c.slug })}>{c.name}</button>
            ))}
          </div>
        ) : (
          <p className="flex-1 tabular-nums text-[12px] text-fog" aria-live="polite">{data ? plural(data.total, 'piece') : ' '}</p>
        )}
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={() => setFiltersOpen(true)}
            className="flex h-10 items-center gap-2 rounded-full border border-ink/15 px-4 text-[14px] text-ink transition-colors hover:border-ink">
            <Icon name="filter" size={16} /> <span className="hidden sm:inline">Filter</span>
            {params.activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-hot tabular-nums text-[10px] text-paper">{params.activeCount}</span>}
          </button>
          <label className="sr-only" htmlFor="sort">Sort by</label>
          <select id="sort" value={params.sort} onChange={(e) => params.update({ sort: e.target.value })}
            className="hidden h-10 appearance-none rounded-full border border-ink/15 bg-transparent pl-4 pr-9 text-[14px] text-ink outline-none transition-colors hover:border-ink focus:border-ink sm:block"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%232B201B' stroke-width='1.6'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}>
            {sorts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {showCategories && data && (
        <p className="-mt-4 mb-8 tabular-nums text-[12px] text-fog" aria-live="polite">{plural(data.total, 'piece')}</p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-12 xl:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : !data?.items.length ? (
        empty
      ) : (
        <>
          <div className={cn('grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-12 xl:grid-cols-5 transition-opacity duration-500', isFetching && 'opacity-50')}>
            {data.items.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '0px 0px -8% 0px' }}
                transition={{ duration: 1, delay: (i % 3) * 0.08, ease: [0.16, 1, 0.3, 1] }}>
                <ProductCard product={p} priority={i < 5} />
              </motion.div>
            ))}
          </div>
          <div className="mt-20 flex justify-center border-t border-rule pt-10">
            <Pagination page={data.page} pages={data.pages} onChange={(page) => { params.update({ page }, false); scrollToY(0) }} />
          </div>
        </>
      )}

      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter"
        footer={<Button size="lg" className="w-full" onClick={() => setFiltersOpen(false)}>Show {data ? plural(data.total, 'result') : 'results'}</Button>}>
        <div className="px-6 sm:px-8">
          <div className="border-b border-rule py-6 sm:hidden">
            <p className="label mb-4 text-fog">Sort by</p>
            <div className="flex flex-wrap gap-2">
              {sorts.map((o) => (
                <button key={o.value} onClick={() => params.update({ sort: o.value })}
                  className={cn('rounded-full border px-4 py-2 text-[14px]', params.sort === o.value ? 'border-ink bg-ink text-paper' : 'border-ink/15 text-ink')}>{o.label}</button>
              ))}
            </div>
          </div>
          <Filters params={params} showCategories={showCategories} />
        </div>
      </Drawer>
    </div>
  )
}
