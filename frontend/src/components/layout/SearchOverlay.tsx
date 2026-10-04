import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useCategories, usePopularSearches, useProducts, useSuggestions } from '@/lib/queries'
import { useRecentSearches } from '@/stores/recentSearches'
import { useUi } from '@/stores/ui'
import { useDebounced } from '@/lib/hooks'
import { money, plural } from '@/lib/format'
import { Icon } from '@/components/ui/Icon'
import { useFocusOnOpen, useOverlay } from '@/components/ui/Overlay'

const EASE = [0.76, 0, 0.24, 1] as const
const OUT = [0.16, 1, 0.3, 1] as const
const list = { animate: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } } }
const item = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: OUT } } }

export function SearchOverlay() {
  const { searchOpen, setSearch } = useUi()
  const close = () => setSearch(false)
  useOverlay(searchOpen, close)

  // "/" or Cmd/Ctrl+K opens search from anywhere that isn't a text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !(e.target as HTMLElement).closest('input,textarea,select'))) {
        e.preventDefault()
        setSearch(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSearch])

  return createPortal(
    <AnimatePresence>
      {searchOpen && (
        <motion.div role="dialog" aria-modal="true" aria-label="Search"
          initial={{ clipPath: 'inset(0% 0% 100% 0%)' }} animate={{ clipPath: 'inset(0% 0% 0% 0%)' }} exit={{ clipPath: 'inset(0% 0% 100% 0%)' }}
          transition={{ duration: 0.75, ease: EASE }}
          className="fixed inset-0 z-50 bg-paper">
          <SearchPanel close={close} />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function SearchPanel({ close }: { close: () => void }) {
  const [q, setQ] = useState('')
  const debounced = useDebounced(q, 180)
  const { data: sug, isFetching } = useSuggestions(debounced)
  const { data: popular } = usePopularSearches()
  const { data: categories } = useCategories()
  const { data: trending } = useProducts({ sort: 'popular', page_size: 4 })
  const recent = useRecentSearches()
  const navigate = useNavigate()
  const ref = useFocusOnOpen(true)

  const go = (term: string) => {
    if (!term.trim()) return
    recent.add(term)
    close()
    navigate(`/search?q=${encodeURIComponent(term.trim())}`)
  }
  const chip = 'rounded-full border border-rule px-4 py-2 text-[14px] text-graphite transition-colors duration-300 hover:border-ink hover:bg-ink hover:text-paper'
  const showSuggestions = debounced.trim().length > 0 && sug

  return (
    <div ref={ref} data-lenis-prevent className="h-full overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-[1520px] px-5 pb-20 sm:px-8 lg:px-10">
        <div className="flex h-16 items-center justify-between lg:h-[76px]">
          <span className="label text-fog">Search the studio</span>
          <button onClick={close} className="group -mr-2 inline-flex items-center gap-2 text-[14px] text-ink" aria-label="Close search">
            <span className="hidden sm:inline">Close</span>
            <span className="grid size-10 place-items-center rounded-full transition-colors group-hover:bg-ink group-hover:text-paper"><Icon name="close" /></span>
          </button>
        </div>

        <motion.form initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.9, ease: OUT }}
          onSubmit={(e) => { e.preventDefault(); go(q) }}
          className="mt-6 flex items-center gap-4 border-b border-ink pb-4 sm:mt-12">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lamps, vases, objects"
            aria-label="Search products"
            className="w-full bg-transparent font-display text-[clamp(2.5rem,7vw,6.5rem)] leading-none text-ink outline-none placeholder:text-ink/20" />
          {isFetching ? <span className="label shrink-0 text-fog">Searching</span>
            : q && <button type="submit" className="grid size-14 shrink-0 place-items-center rounded-full bg-ink text-paper transition-colors hover:bg-hot" aria-label="Search"><Icon name="arrowRight" /></button>}
        </motion.form>

        {showSuggestions ? (
          <div className="mt-12 grid gap-12 md:grid-cols-[1fr_18rem]">
            <div>
              {sug.products.length === 0 ? (
                <p className="text-lg text-smoke">Nothing matches “{debounced}”. Try a material, a room or a collection.</p>
              ) : (
                <motion.ul key={debounced} variants={list} initial="initial" animate="animate" className="border-t border-rule">
                  {sug.products.map((p, i) => (
                    <motion.li key={p.id} variants={item}>
                      <Link to={`/product/${p.slug}`} onClick={() => { recent.add(debounced); close() }} className="group flex items-center gap-5 border-b border-rule py-4">
                        <span className="w-6 tabular-nums text-[11px] text-fog">{String(i + 1).padStart(2, '0')}</span>
                        <span className="aspect-[4/5] w-14 shrink-0 overflow-hidden bg-ash">
                          <img src={p.images[0]?.url} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        </span>
                        <span className="flex-1 font-display text-2xl text-ink transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:translate-x-2 sm:text-3xl">{p.name}</span>
                        <span className="tabular-nums text-[13px] text-smoke">{money(p.price)}</span>
                      </Link>
                    </motion.li>
                  ))}
                </motion.ul>
              )}
              {sug.products.length > 0 && (
                <button onClick={() => go(debounced)} className="link-draw mt-6 text-[15px] text-ink">See all results for “{debounced}”</button>
              )}
            </div>
            <div className="flex flex-col gap-8">
              {sug.categories.length > 0 && (
                <div>
                  <p className="label mb-3 text-fog">Collections</p>
                  {sug.categories.map((c) => (
                    <Link key={c.id} to={`/collections/${c.slug}`} onClick={close} className="link-draw block w-fit py-1 text-lg text-ink">{c.name}</Link>
                  ))}
                </div>
              )}
              {sug.tags.length > 0 && (
                <div>
                  <p className="label mb-3 text-fog">Tags</p>
                  <div className="flex flex-wrap gap-2">{sug.tags.map((t) => <button key={t} className={chip} onClick={() => go(t)}>{t}</button>)}</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <motion.div variants={list} initial="initial" animate="animate" className="mt-12 grid gap-16 lg:grid-cols-12">
            <motion.div variants={item} className="flex flex-col gap-10 lg:col-span-4">
              {recent.terms.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="label text-fog">Recent</p>
                    <button onClick={recent.clear} className="label text-fog hover:text-ink">Clear</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recent.terms.map((t) => (
                      <button key={t} onClick={() => go(t)} className={`${chip} inline-flex items-center gap-2`}><Icon name="clock" size={14} />{t}</button>
                    ))}
                  </div>
                </div>
              )}
              {!!popular?.length && (
                <div>
                  <p className="label mb-3 text-fog">Popular searches</p>
                  <div className="flex flex-wrap gap-2">{popular.map((t) => <button key={t} onClick={() => go(t)} className={chip}>{t}</button>)}</div>
                </div>
              )}
              {!!categories?.length && (
                <div>
                  <p className="label mb-3 text-fog">Collections</p>
                  <ul className="border-t border-rule">
                    {categories.map((c) => (
                      <li key={c.id}>
                        <Link to={`/collections/${c.slug}`} onClick={close} className="group flex items-baseline justify-between border-b border-rule py-3">
                          <span className="text-lg text-ink transition-transform duration-500 group-hover:translate-x-2">{c.name}</span>
                          <span className="tabular-nums text-[11px] text-fog">{plural(c.product_count, 'piece')}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>

            {!!trending?.items.length && (
              <motion.section variants={item} aria-labelledby="search-trending" className="lg:col-span-7 lg:col-start-6">
                <div className="mb-4 flex items-end justify-between">
                  <p id="search-trending" className="label text-fog">Trending right now</p>
                  <Link to="/bestsellers" onClick={close} className="link-draw text-[14px] text-ink">See all</Link>
                </div>
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {trending.items.map((p) => (
                    <li key={p.id}>
                      <Link to={`/product/${p.slug}`} onClick={close} className="group block">
                        <div className="aspect-[4/5] overflow-hidden bg-ash">
                          <img src={p.images[1]?.url ?? p.images[0]?.url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-out-quint)] group-hover:scale-105" />
                        </div>
                        <p className="mt-3 truncate text-[15px] text-ink">{p.name}</p>
                        <p className="tabular-nums text-[12px] text-fog">{money(p.price)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.section>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
