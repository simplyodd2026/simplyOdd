import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useCategories, usePopularSearches, useProducts, useSuggestions } from '@/lib/queries'
import { useRecentSearches } from '@/stores/recentSearches'
import { useUi } from '@/stores/ui'
import { useDebounced } from '@/lib/hooks'
import { money, plural } from '@/lib/format'
import { Icon } from '@/components/ui/Icon'

// Pastel fills that rotate across chips and category tiles.
const TONES = ['bg-pink', 'bg-butter', 'bg-lilac', 'bg-mint', 'bg-sky', 'bg-peach']

export function SearchOverlay() {
  const { searchOpen, setSearch } = useUi()
  const [q, setQ] = useState('')
  const debounced = useDebounced(q, 180)
  const { data: sug, isFetching } = useSuggestions(debounced)
  const { data: popular } = usePopularSearches()
  const { data: categories } = useCategories()
  const { data: trending } = useProducts({ sort: 'popular', page_size: 4 })
  const recent = useRecentSearches()
  const navigate = useNavigate()
  const close = () => setSearch(false)

  useEffect(() => {
    if (!searchOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !(e.target as HTMLElement).closest('input,textarea'))) {
        e.preventDefault()
        setSearch(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSearch])

  if (!searchOpen) return null

  const go = (term: string) => {
    if (!term.trim()) return
    recent.add(term)
    close()
    setQ('')
    navigate(`/search?q=${encodeURIComponent(term.trim())}`)
  }

  const chip = 'rounded-full border border-rule px-3 py-1.5 text-sm text-smoke hover:border-accent hover:text-ink'
  const showSuggestions = debounced.trim().length > 0 && sug

  return createPortal(
    <div className="animate-fade fixed inset-0 z-50 overflow-y-auto bg-paper" role="dialog" aria-modal="true" aria-label="Search">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <div className="flex justify-end">
          <button onClick={close} className="p-2 text-smoke hover:text-ink" aria-label="Close search"><Icon name="close" size={24} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); go(q) }} className="mt-4 flex items-center gap-4 border-b-2 border-graphite/30 pb-3 focus-within:border-accent">
          <Icon name="search" size={28} className="shrink-0 text-fog" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Lamps, vases, weird things…"
            aria-label="Search products"
            className="w-full bg-transparent font-display text-3xl text-ink outline-none placeholder:text-fog/50 sm:text-5xl" />
          {isFetching && <span className="text-sm text-fog">Searching</span>}
        </form>

        {showSuggestions ? (
          <div className="mt-10 grid gap-10 md:grid-cols-[1fr_16rem]">
            <div>
              {sug.products.length === 0 ? (
                <p className="text-smoke">Nothing matches “{debounced}”. Try a material, a room, or just “weird”.</p>
              ) : (
                <ul className="divide-y divide-rule">
                  {sug.products.map((p) => (
                    <li key={p.id}>
                      <Link to={`/product/${p.slug}`} onClick={() => { recent.add(debounced); close() }} className="group flex items-center gap-4 py-3">
                        <img src={p.images[0]?.url} alt="" className="aspect-[4/5] w-14 bg-ash object-cover" />
                        <span className="flex-1 text-lg font-semibold w-semi group-hover:text-accent">{p.name}</span>
                        <span className="tabular-nums text-smoke">{money(p.price)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {sug.products.length > 0 && (
                <button onClick={() => go(debounced)} className="mt-4 text-sm text-ink underline underline-offset-4 hover:text-accent">
                  See all results for “{debounced}”
                </button>
              )}
            </div>
            <div className="flex flex-col gap-6">
              {sug.categories.length > 0 && (
                <div>
                  <p className="mb-2 text-sm text-fog">Collections</p>
                  {sug.categories.map((c) => (
                    <Link key={c.id} to={`/collections/${c.slug}`} onClick={close} className="block py-1 text-lg hover:text-accent">{c.name}</Link>
                  ))}
                </div>
              )}
              {sug.tags.length > 0 && (
                <div>
                  <p className="mb-2 text-sm text-fog">Tags</p>
                  <div className="flex flex-wrap gap-2">{sug.tags.map((t) => <button key={t} className={chip} onClick={() => go(t)}>{t}</button>)}</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-12">
            {/* Quick chips: what you searched before, and what others are searching */}
            <div className="flex flex-col gap-3">
              {recent.terms.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-hand mr-1 text-sm text-smoke">you looked for</span>
                  {recent.terms.map((t) => (
                    <button key={t} onClick={() => go(t)} className="inline-flex items-center gap-1.5 rounded-full bg-paper-3 px-3 py-1.5 text-sm text-ink hover:bg-ink hover:text-paper">
                      <Icon name="clock" size={14} />{t}
                    </button>
                  ))}
                  <button onClick={recent.clear} className="text-sm text-fog underline-offset-4 hover:text-ink hover:underline">clear</button>
                </div>
              )}
              {!!popular?.length && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-hand mr-1 text-sm text-smoke">everyone's searching</span>
                  {popular.map((t, i) => (
                    <button key={t} onClick={() => go(t)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium text-ink transition-transform hover:-translate-y-0.5 ${TONES[i % TONES.length]}`}>
                      {t} <span aria-hidden="true">↗</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category recommendations */}
            {!!categories?.length && (
              <section aria-labelledby="search-cats">
                <p className="font-hand -rotate-1 text-lg text-accent">not sure what you want? <span aria-hidden="true">♡</span></p>
                <h2 id="search-cats" className="mt-1 font-display text-3xl text-ink">Browse by category</h2>
                <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {categories.map((c, i) => (
                    <li key={c.id}>
                      <Link to={`/collections/${c.slug}`} onClick={close}
                        className={`group flex h-full flex-col items-center rounded-2xl p-4 text-center transition-transform duration-300 ease-[var(--ease-spring)] hover:-translate-y-1 hover:rotate-1 ${TONES[(i + 2) % TONES.length]}`}>
                        <span className="block size-20 overflow-hidden rounded-full border-4 border-paper bg-ash shadow-sm">
                          {c.image && <img src={c.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />}
                        </span>
                        <span className="mt-3 font-semibold leading-tight text-ink">{c.name}</span>
                        <span className="font-hand mt-0.5 text-xs text-smoke">{plural(c.product_count, 'piece')}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Trending products */}
            {!!trending?.items.length && (
              <section aria-labelledby="search-trending">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="font-hand -rotate-1 text-lg text-accent">flying off the shelf</p>
                    <h2 id="search-trending" className="mt-1 font-display text-3xl text-ink">Trending right now</h2>
                  </div>
                  <Link to="/bestsellers" onClick={close} className="text-sm font-semibold text-ink underline-offset-4 hover:underline">See all</Link>
                </div>
                <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {trending.items.map((p) => (
                    <li key={p.id}>
                      <Link to={`/product/${p.slug}`} onClick={close} className="group block">
                        <div className="aspect-square overflow-hidden rounded-2xl bg-ash">
                          <img src={p.images[1]?.url ?? p.images[0]?.url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        </div>
                        <p className="mt-2 truncate font-semibold text-ink group-hover:text-accent">{p.name}</p>
                        <p className="text-sm tabular-nums text-smoke">{money(p.price)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
