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
    <Container className="pt-10 sm:pt-16">
      <h1 className="sr-only">{q ? `Search results for ${q}` : 'Search'}</h1>
      <form onSubmit={(e) => { e.preventDefault(); submit(draft) }}
        className="mb-12 flex items-center gap-4 border-b-2 border-graphite/30 pb-3 focus-within:border-accent">
        <Icon name="search" size={28} className="shrink-0 text-fog" />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search the shop" aria-label="Search products"
          className="w-full bg-transparent text-4xl font-black text-ink outline-none w-cond placeholder:text-fog/60 sm:text-6xl" />
      </form>

      {!q ? (
        <div>
          <p className="mb-3 text-sm text-fog">Popular right now</p>
          <div className="flex flex-wrap gap-2">
            {popular?.map((t) => (
              <button key={t} onClick={() => submit(t)} className="border border-rule px-3 py-1.5 text-smoke hover:border-accent hover:text-ink">{t}</button>
            ))}
          </div>
        </div>
      ) : (
        <ProductResults params={params} data={data} isLoading={isLoading} isFetching={isFetching}
          extraSorts={[{ value: 'relevance', label: 'Best match' }]}
          empty={
            <div>
              <EmptyState title={`Nothing called “${q}”. Yet.`}
                body={<>Check the spelling, try a broader word like “lamp” or “vase”, or search by colour or room.
                  {popular && <span className="mt-4 flex flex-wrap gap-2">{popular.slice(0, 5).map((t) => (
                    <button key={t} onClick={() => submit(t)} className="border border-rule px-3 py-1 text-sm text-smoke hover:border-accent hover:text-ink">{t}</button>
                  ))}</span>}</>} />
              {fallback && fallback.items.length > 0 && (
                <div className="mt-6">
                  <p className="mb-5 text-sm text-fog">Or start with what other people love</p>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{fallback.items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
                </div>
              )}
            </div>
          } />
      )}
    </Container>
  )
}
