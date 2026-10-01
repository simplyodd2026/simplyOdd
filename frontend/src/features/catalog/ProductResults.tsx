import { useState, type ReactNode } from 'react'
import type { Page, Product } from '@/lib/types'
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard'
import { Pagination } from '@/components/ui/misc'
import { Drawer } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { plural } from '@/lib/format'
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
  const sorts = [...extraSorts, ...SORT_OPTIONS]

  return (
    <div className="grid gap-10 lg:grid-cols-[15rem_1fr] xl:gap-14">
      <aside className="hidden lg:block" aria-label="Filters">
        <div className="sticky top-24"><Filters params={params} showCategories={showCategories} /></div>
      </aside>

      <div>
        <div className="mb-6 flex items-center justify-between gap-4 border-t border-rule pt-5">
          <p className="text-sm text-smoke tabular-nums" aria-live="polite">
            {data ? plural(data.total, 'object') : ' '}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setFiltersOpen(true)}
              className="flex h-10 items-center gap-2 border border-rule px-3 text-sm hover:border-accent lg:hidden">
              <Icon name="filter" size={16} /> Filters{params.activeCount ? ` (${params.activeCount})` : ''}
            </button>
            <label className="sr-only" htmlFor="sort">Sort by</label>
            <select id="sort" value={params.sort} onChange={(e) => params.update({ sort: e.target.value })}
              className="h-10 appearance-none rounded-xl border border-rule bg-transparent pl-3 pr-8 text-sm outline-none focus:border-accent "
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a3a3a3' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}>
              {sorts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : !data?.items.length ? (
          empty
        ) : (
          <>
            <div className={`grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-4 md:grid-cols-3 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
              {data.items.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 3} />)}
            </div>
            <div className="mt-14 flex justify-center">
              <Pagination page={data.page} pages={data.pages} onChange={(page) => { params.update({ page }, false); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
            </div>
          </>
        )}
      </div>

      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters"
        footer={<Button className="w-full" onClick={() => setFiltersOpen(false)}>Show {data ? plural(data.total, 'result') : 'results'}</Button>}>
        <div className="px-5"><Filters params={params} showCategories={showCategories} /></div>
      </Drawer>
    </div>
  )
}
