import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { EmptyState } from '@/components/ui/misc'
import { ProductResults } from '@/features/catalog/ProductResults'
import { useCatalogParams } from '@/features/catalog/useCatalogParams'
import { usePopularSearches, useProducts } from '@/lib/queries'
import { useRecentSearches } from '@/stores/recentSearches'
import { useDocumentTitle } from '@/lib/hooks'
import { Icon } from '@/components/ui/Icon'
import { ProductCard } from '@/components/product/ProductCard'

export default function SearchPage() {
  const params = useCatalogParams('relevance')
  const q = params.q ?? ''
  const [draft, setDraft] = useState(q)
  useEffect(() => { setDraft(q) }, [q])
  const addRecent = useRecentSearches((s) => s.add)
  const navigate = useNavigate()
  const { data: popular } = usePopularSearches()
  const { data, isLoading, isFetching } = useProducts({
    q, category: params.category, min_price: params.min_price, max_price: params.max_price, in_stock: params.in_stock,
    sort: params.sort, page: params.page, page_size: 12, track: params.page === 1,
  }, q.length > 0)
  const { data: fallback } = useProducts({ flag: 'bestseller', sort: 'popular', page_size: 3 }, !!data && data.total === 0)
  useDocumentTitle(q ? `Search: ${q}` : 'Search')

  const submit = (term: string) => {
    if (!term.trim()) return
    addRecent(term)
    navigate(`/search?q=${encodeURIComponent(term.trim())}`)
  }

  return (
    <Container className="pb-28 pt-12 sm:pt-20">
      <p className="label mb-6 text-fog">{q && data ? `${data.total} results` : 'Search'}</p>
      <h1 className="sr-only">{q ? `Search results for ${q}` : 'Search'}</h1>
      <form onSubmit={(e) => { e.preventDefault(); submit(draft) }}
        className="mb-12 flex items-center gap-4 border-b border-ink pb-4">
        <Icon name="search" size={28} className="shrink-0 text-ink" />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search the shop" aria-label="Search products"
          className="w-full bg-transparent font-display text-[clamp(2.5rem,7vw,6.5rem)] leading-none text-ink outline-none placeholder:text-ink/20" />
      </form>

      {!q ? (
        <div>
          <p className="label mb-4 text-fog">Popular searches</p>
          <div className="flex flex-wrap gap-2">
            {popular?.map((t) => (
              <button key={t} onClick={() => submit(t)} className="rounded-full border border-rule px-4 py-2 text-[14px] text-graphite transition-colors hover:border-ink hover:bg-ink hover:text-paper">{t}</button>
            ))}
          </div>
        </div>
      ) : (
        <ProductResults params={params} data={data} isLoading={isLoading} isFetching={isFetching}
          extraSorts={[{ value: 'relevance', label: 'Best match' }]}
          empty={
            <div>
              <EmptyState title={`No results for “${q}”.`}
                body={<>Check the spelling, try a broader word like “lamp” or “vase”, or search by colour or room.
                  {popular && <span className="mt-4 flex flex-wrap gap-2">{popular.slice(0, 5).map((t) => (
                    <button key={t} onClick={() => submit(t)} className="rounded-full border border-rule px-4 py-1.5 text-sm text-graphite transition-colors hover:border-ink hover:bg-ink hover:text-paper">{t}</button>
                  ))}</span>}</>} />
              {fallback && fallback.items.length > 0 && (
                <div className="mt-6">
                  <p className="label mb-6 text-fog">Or start with our most collected pieces</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 lg:gap-x-8">{fallback.items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
                </div>
              )}
            </div>
          } />
      )}
    </Container>
  )
}
