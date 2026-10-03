import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useCategories } from '@/lib/queries'
import { cartCount, useCart } from '@/stores/cart'
import { useWishlist } from '@/stores/wishlist'
import { useSession } from '@/stores/session'
import { useUi } from '@/stores/ui'
import { cn } from '@/lib/cn'
import { Wordmark } from '@/components/brand/Wordmark'
import { Icon } from '@/components/ui/Icon'

const EASE = [0.76, 0, 0.24, 1] as const

const LINKS = [
  { to: '/collections', label: 'Collections' },
  { to: '/about', label: 'Studio' },
  { to: '/custom', label: 'Commissions' },
]

/** A two-digit counter in brackets, like a readout: (02). */
function Count({ n }: { n: number }) {
  return <span className="font-mono text-[11px] tabular-nums text-fog transition-colors group-hover:text-current">({String(n).padStart(2, '0')})</span>
}

/** Hides while you read downward, returns the moment you scroll back up. */
function useHeaderVisibility(pinned: boolean) {
  const [state, setState] = useState({ hidden: false, scrolled: false })
  const last = useRef(0)
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      const delta = y - last.current
      last.current = y
      setState((s) => {
        const hidden = pinned ? false : y > 240 && delta > 4 ? true : delta < -4 || y < 120 ? false : s.hidden
        const scrolled = y > 10
        return hidden === s.hidden && scrolled === s.scrolled ? s : { hidden, scrolled }
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [pinned])
  return state
}

export function Navbar() {
  const [shopOpen, setShopOpen] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const { pathname } = useLocation()
  const items = useCart((s) => s.items)
  const saved = useWishlist((s) => s.ids.length)
  const user = useSession((s) => s.user)
  const { setCart, setSearch, setMenu } = useUi()
  const { data: categories } = useCategories()
  const { hidden, scrolled } = useHeaderVisibility(shopOpen)
  const bag = cartCount(items)

  useEffect(() => { setShopOpen(false) }, [pathname])
  useEffect(() => { if (!preview && categories?.[0]?.image) setPreview(categories[0].image) }, [categories, preview])

  const text = 'group relative items-center gap-1.5 py-2 text-[14px] text-ink transition-colors hover:text-accent'

  return (
    <header
      className={cn('sticky top-0 z-40 transition-[transform,background-color,border-color] duration-700 ease-[var(--ease-out-quint)]',
        hidden ? '-translate-y-full' : 'translate-y-0',
        scrolled || shopOpen ? 'border-b border-rule bg-paper' : 'border-b border-transparent bg-paper')}
      onMouseLeave={() => setShopOpen(false)}>
      <div className="mx-auto grid h-16 max-w-[1680px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 sm:px-8 lg:h-[76px] lg:px-10">
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
          <NavLink to="/shop" onMouseEnter={() => setShopOpen(true)} onFocus={() => setShopOpen(true)}
            aria-expanded={shopOpen} aria-haspopup="true"
            className={({ isActive }) => cn(text, 'inline-flex', isActive && 'text-accent')}>
            <span className="link-draw">Shop</span>
            <Icon name="chevronDown" size={13} className={cn('transition-transform duration-500', shopOpen && 'rotate-180')} />
          </NavLink>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} onMouseEnter={() => setShopOpen(false)}
              className={({ isActive }) => cn(text, 'inline-flex', isActive && 'text-accent')}>
              {({ isActive }) => <span className="link-draw" aria-current={isActive ? 'page' : undefined}>{l.label}</span>}
            </NavLink>
          ))}
        </nav>
        <Link to="/" className="justify-self-start text-[26px] text-ink lg:hidden" aria-label="Simply Odd home">
          <Wordmark />
        </Link>

        <Link to="/" className="hidden text-[34px] text-ink transition-colors duration-500 hover:text-accent lg:block" aria-label="Simply Odd home">
          <Wordmark />
        </Link>
        <span className="lg:hidden" />

        <div className="flex items-center justify-end gap-1 sm:gap-6">
          <button onClick={() => setSearch(true)} className={cn(text, 'hidden lg:inline-flex')} aria-label="Search">
            <span className="link-draw">Search</span>
            <kbd className="rounded-sm border border-rule px-1 font-mono text-[10px] text-fog">/</kbd>
          </button>
          <Link to={user ? '/account' : '/login'} className={cn(text, 'hidden lg:inline-flex')}>
            <span className="link-draw">{user ? 'Account' : 'Sign in'}</span>
          </Link>
          <Link to="/wishlist" className={cn(text, 'hidden sm:inline-flex')} aria-label={`Wishlist, ${saved} saved`}>
            <span className="link-draw">Saved</span><Count n={saved} />
          </Link>
          <button onClick={() => setSearch(true)} className="grid size-10 place-items-center rounded-full text-ink lg:hidden" aria-label="Search">
            <Icon name="search" />
          </button>
          <button onClick={() => setCart(true)} className={cn(text, 'inline-flex')} aria-label={`Bag, ${bag} items`}>
            <span className="link-draw">Bag</span><Count n={bag} />
          </button>
          <button onClick={() => setMenu(true)} className="-mr-2 ml-1 grid size-10 place-items-center rounded-full text-ink lg:hidden" aria-label="Open menu">
            <Icon name="menu" size={22} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {shopOpen && (
          <motion.div
            initial={{ clipPath: 'inset(0% 0% 100% 0%)' }} animate={{ clipPath: 'inset(0% 0% 0% 0%)' }} exit={{ clipPath: 'inset(0% 0% 100% 0%)' }}
            transition={{ duration: 0.7, ease: EASE }}
            className="absolute inset-x-0 top-full hidden border-b border-rule bg-paper lg:block">
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto grid max-w-[1680px] grid-cols-12 gap-10 px-10 pb-12 pt-10">
              <div className="col-span-3 flex flex-col gap-1">
                <p className="label mb-4 text-fog">Browse</p>
                {[['/shop', 'Everything'], ['/new', 'New arrivals'], ['/bestsellers', 'Best sellers'], ['/shop?max=999&sort=price_asc', 'Gifts under ₹999']].map(([to, label]) => (
                  <Link key={to} to={to} className="group flex items-center gap-3 font-display text-[2.4rem] leading-[1.1] text-ink transition-colors hover:text-accent">
                    <span className="transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:translate-x-2">{label}</span>
                  </Link>
                ))}
              </div>
              <div className="col-span-5 col-start-5">
                <p className="label mb-4 text-fog">Collections</p>
                <ul className="border-t border-rule">
                  {categories?.map((c, i) => (
                    <li key={c.id}>
                      <Link to={`/collections/${c.slug}`} onMouseEnter={() => setPreview(c.image)}
                        className="group flex items-baseline gap-5 border-b border-rule py-3 text-ink">
                        <span className="font-mono text-[11px] text-fog">{String(i + 1).padStart(2, '0')}</span>
                        <span className="flex-1 text-[17px] transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:translate-x-2 group-hover:text-accent">{c.name}</span>
                        <span className="font-mono text-[11px] tabular-nums text-fog">{c.product_count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-span-3 col-start-10">
                <div className="relative aspect-[4/5] overflow-hidden bg-ash">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {preview && (
                      <motion.img key={preview} src={preview} alt="" className="absolute inset-0 h-full w-full object-cover"
                        initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} />
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
