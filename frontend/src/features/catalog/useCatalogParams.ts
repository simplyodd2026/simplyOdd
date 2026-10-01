import { useSearchParams } from 'react-router-dom'
import type { SortKey } from '@/lib/types'

const SORTS: SortKey[] = ['relevance', 'newest', 'popular', 'price_asc', 'price_desc', 'rating']

/** Filter state lives in the URL so results are shareable and back-button friendly. */
export function useCatalogParams(defaultSort: SortKey = 'newest') {
  const [sp, setSp] = useSearchParams()
  const num = (k: string) => {
    const v = sp.get(k)
    return v && !Number.isNaN(Number(v)) ? Number(v) : undefined
  }
  const sortParam = sp.get('sort') as SortKey | null
  const state = {
    q: sp.get('q') ?? undefined,
    category: sp.get('category') ?? undefined,
    min_price: num('min'),
    max_price: num('max'),
    in_stock: sp.get('in_stock') === '1',
    sort: sortParam && SORTS.includes(sortParam) ? sortParam : defaultSort,
    page: num('page') ?? 1,
  }
  const update = (patch: Record<string, string | number | boolean | undefined | null>, resetPage = true) => {
    const next = new URLSearchParams(sp)
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === null || v === '' || v === false) next.delete(k)
      else next.set(k, v === true ? '1' : String(v))
    }
    if (resetPage && !('page' in patch)) next.delete('page')
    setSp(next, { replace: false })
  }
  const activeCount = [state.category, state.min_price, state.max_price, state.in_stock || undefined].filter((x) => x !== undefined).length
  return { ...state, update, activeCount, clear: () => update({ category: null, min: null, max: null, in_stock: null }) }
}

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most popular' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Highest rated' },
]
