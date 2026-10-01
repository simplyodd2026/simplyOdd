import { useEffect, useState } from 'react'
import { useCategories } from '@/lib/queries'
import { cn } from '@/lib/cn'
import { Checkbox } from '@/components/ui/Field'
import type { useCatalogParams } from './useCatalogParams'

type Params = ReturnType<typeof useCatalogParams>

const PRICE_PRESETS: [string, number | undefined, number | undefined][] = [
  ['Under ₹1,500', undefined, 1500],
  ['₹1,500 – ₹2,500', 1500, 2500],
  ['₹2,500 – ₹4,000', 2500, 4000],
  ['Over ₹4,000', 4000, undefined],
]

export function Filters({ params, showCategories = true }: { params: Params; showCategories?: boolean }) {
  const { data: categories } = useCategories()
  const [min, setMin] = useState(params.min_price?.toString() ?? '')
  const [max, setMax] = useState(params.max_price?.toString() ?? '')
  useEffect(() => { setMin(params.min_price?.toString() ?? ''); setMax(params.max_price?.toString() ?? '') }, [params.min_price, params.max_price])

  const group = 'border-t border-rule py-5'
  const heading = 'mb-3 text-sm text-fog'
  const option = (active: boolean) => cn('flex w-full items-baseline justify-between py-1.5 text-left text-[15px] transition-colors',
    active ? 'text-ink' : 'text-smoke hover:text-ink')

  return (
    <div>
      {showCategories && (
        <div className={group}>
          <p className={heading}>Category</p>
          <button className={option(!params.category)} onClick={() => params.update({ category: null })}>
            <span className={cn(!params.category && 'underline decoration-accent decoration-2 underline-offset-4')}>All</span>
          </button>
          {categories?.map((c) => (
            <button key={c.id} className={option(params.category === c.slug)} onClick={() => params.update({ category: c.slug })}>
              <span className={cn(params.category === c.slug && 'underline decoration-accent decoration-2 underline-offset-4')}>{c.name}</span>
              <span className="text-sm tabular-nums text-fog">{c.product_count}</span>
            </button>
          ))}
        </div>
      )}

      <div className={group}>
        <p className={heading}>Price</p>
        {PRICE_PRESETS.map(([label, lo, hi]) => {
          const active = params.min_price === lo && params.max_price === hi
          return (
            <button key={label} className={option(active)} onClick={() => params.update(active ? { min: null, max: null } : { min: lo, max: hi })}>
              <span className={cn(active && 'underline decoration-accent decoration-2 underline-offset-4')}>{label}</span>
            </button>
          )
        })}
        <form className="mt-3 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); params.update({ min: min || null, max: max || null }) }}>
          <input value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Min" aria-label="Minimum price"
            className="h-9 w-full rounded-xl border border-rule bg-transparent px-2.5 text-sm outline-none focus:border-accent" />
          <span className="text-fog">–</span>
          <input value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Max" aria-label="Maximum price"
            className="h-9 w-full rounded-xl border border-rule bg-transparent px-2.5 text-sm outline-none focus:border-accent" />
          <button type="submit" className="h-9 shrink-0 border border-rule px-3 text-sm hover:border-accent">Go</button>
        </form>
      </div>

      <div className={group}>
        <p className={heading}>Availability</p>
        <Checkbox label="In stock only" checked={params.in_stock} onChange={(e) => params.update({ in_stock: e.target.checked })} />
      </div>

      {params.activeCount > 0 && (
        <div className="border-t border-rule pt-5">
          <button onClick={params.clear} className="text-sm text-ink underline underline-offset-4 hover:text-accent">Clear all filters</button>
        </div>
      )}
    </div>
  )
}
