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

  const group = 'border-b border-rule py-6'
  const heading = 'label mb-4 text-fog'
  const option = (active: boolean) => cn('group flex w-full items-center justify-between py-2 text-left text-[15px] transition-colors',
    active ? 'text-ink' : 'text-smoke hover:text-ink')
  const dot = (active: boolean) => <span className={cn('mr-3 inline-block size-1.5 rounded-full transition-colors', active ? 'bg-hot' : 'bg-ink/15 group-hover:bg-ink/40')} />

  return (
    <div>
      {showCategories && (
        <div className={group}>
          <p className={heading}>Collection</p>
          <button className={option(!params.category)} onClick={() => params.update({ category: null })}>
            <span className="flex items-center">{dot(!params.category)}All</span>
          </button>
          {categories?.map((c) => (
            <button key={c.id} className={option(params.category === c.slug)} onClick={() => params.update({ category: c.slug })}>
              <span className="flex items-center">{dot(params.category === c.slug)}{c.name}</span>
              <span className="font-mono text-[11px] tabular-nums text-fog">{c.product_count}</span>
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
              <span className="flex items-center">{dot(active)}{label}</span>
            </button>
          )
        })}
        <form className="mt-4 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); params.update({ min: min || null, max: max || null }) }}>
          <input value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Min ₹" aria-label="Minimum price"
            className="h-10 w-full rounded-full border border-rule bg-transparent px-4 text-sm outline-none focus:border-ink" />
          <span className="text-fog">–</span>
          <input value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Max ₹" aria-label="Maximum price"
            className="h-10 w-full rounded-full border border-rule bg-transparent px-4 text-sm outline-none focus:border-ink" />
          <button type="submit" className="h-10 shrink-0 rounded-full bg-ink px-4 text-sm text-paper transition-colors hover:bg-hot">Apply</button>
        </form>
      </div>

      <div className={group}>
        <p className={heading}>Availability</p>
        <Checkbox label="In stock only" checked={params.in_stock} onChange={(e) => params.update({ in_stock: e.target.checked })} />
      </div>

      {params.activeCount > 0 && (
        <div className="pt-6">
          <button onClick={params.clear} className="link-draw text-sm text-ink">Clear all filters</button>
        </div>
      )}
    </div>
  )
}
