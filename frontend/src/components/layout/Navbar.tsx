import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion, useScroll, useSpring } from 'motion/react'
import { useCategories } from '@/lib/queries'
import { cartCount, useCart } from '@/stores/cart'
import { useWishlist } from '@/stores/wishlist'
import { useSession } from '@/stores/session'
import { useUi } from '@/stores/ui'
import { cn } from '@/lib/cn'
import { Wordmark } from '@/components/brand/Wordmark'
import { Icon } from '@/components/ui/Icon'

const OUT = [0.16, 1, 0.3, 1] as const
const SPRING = { type: 'spring', stiffness: 380, damping: 34, mass: 0.9 } as const

const LINKS = [
  { key: 'objects', to: '/shop', label: 'Objects' },
  { key: 'collections', to: '/collections', label: 'Collections' },
  { key: 'process', to: '/about#process', label: 'Process' },
  { key: 'about', to: '/about', label: 'About' },
  { key: 'customise', to: '/customise', label: 'Customise' },
] as const
type Key = (typeof LINKS)[number]['key']

/** Which link the current page belongs to, so the highlight can rest on it. */
function activeKey(pathname: string, hash: string): Key | null {
  if (pathname === '/about') return hash === '#process' ? 'process' : 'about'
  if (pathname.startsWith('/collections')) return 'collections'
  if (pathname.startsWith('/customise')) return 'customise'
  if (/^\/(shop|new|bestsellers|product|search)/.test(pathname)) return 'objects'
  return null
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
        const hidden = pinned ? false : y > 320 && delta > 4 ? true : delta < -4 || y < 160 ? false : s.hidden
        const scrolled = y > 24
        return hidden === s.hidden && scrolled === s.scrolled ? s : { hidden, scrolled }
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [pinned])
  return state
}

/** A label that rolls on hover: the word slides up and out as a fresh copy rises from below. */
function Roll({ children }: { children: string }) {
  return (
    <span className="relative block overflow-hidden">
      <span className="block transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover/link:-translate-y-full">{children}</span>
      <span aria-hidden className="absolute inset-0 block translate-y-full transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover/link:translate-y-0">{children}</span>
    </span>
  )
}

/**
 * The header. At the top of a page the logo sits on the left, the links ride in a floating taupe pill in
 * the middle and the tools sit on the right. A soft ivory highlight glides between the links as you point
 * at them and rests on the section you're in. Once you scroll, the whole bar draws in to a single floating
 * capsule, tucks away as you read down and comes back the moment you scroll up. "Objects" opens a card of
 * ways to browse.
 */
export function Navbar() {
  const [shopOpen, setShopOpen] = useState(false)
  const [hovered, setHovered] = useState<Key | null>(null)
  const { pathname, hash } = useLocation()
  const items = useCart((s) => s.items)
  const saved = useWishlist((s) => s.ids.length)
  const user = useSession((s) => s.user)
  const { setCart, setSearch, setMenu } = useUi()
  const { data: categories } = useCategories()
  const { hidden, scrolled } = useHeaderVisibility(shopOpen)
  const bag = cartCount(items)
  const current = activeKey(pathname, hash)
  const lit = hovered ?? current

  useEffect(() => { setShopOpen(false); setHovered(null) }, [pathname, hash])
  // A hairline along the bottom of the capsule fills as you read down the page.
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 })
  const compact = scrolled || shopOpen

  const tool = 'relative grid size-10 place-items-center rounded-full text-ink transition-[background-color,transform] duration-500 ease-[var(--ease-out-quint)] hover:-translate-y-0.5 hover:bg-ink/[0.06]'

  return (
    <MotionConfig reducedMotion="user">
    <header
      className={cn('pointer-events-none sticky top-0 z-40 pt-2.5 transition-transform duration-700 ease-[var(--ease-out-quint)] lg:pt-3.5',
        hidden ? '-translate-y-[130%]' : 'translate-y-0')}
      onMouseLeave={() => { setShopOpen(false); setHovered(null) }}>
      {/* The bar: full width and open at the top of the page, a floating capsule once you scroll. */}
      {/* Clear at the top of the page; once you scroll, a capsule of frosted glass. */}
      <div className={cn('pointer-events-auto relative mx-auto flex items-center justify-between gap-4 transition-[max-width,padding,background-color,box-shadow,border-radius,height] duration-[900ms] ease-[var(--ease-out-quint)]',
        compact
          ? 'mx-3 h-14 max-w-[1120px] rounded-full bg-paper/45 pl-5 pr-2 shadow-[0_18px_40px_-22px_rgb(66_44_28/0.5),inset_0_1px_0_rgb(255_255_255/0.55)] ring-1 ring-ink/[0.07] backdrop-blur-2xl backdrop-saturate-150 sm:mx-6 lg:mx-auto lg:h-[60px] lg:pl-7'
          : 'h-14 max-w-[1520px] bg-transparent px-5 sm:px-8 lg:h-16 lg:px-10')}>
        <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: OUT }} className="shrink-0">
          <Link to="/" aria-label="Simply Odd home"
            className={cn('block origin-left text-ink transition-[font-size] duration-[900ms] ease-[var(--ease-out-quint)]', compact ? 'text-[16px] lg:text-[17px]' : 'text-[17px] lg:text-[19px]')}>
            <Wordmark />
          </Link>
        </motion.div>

        <nav aria-label="Main" className="hidden lg:block">
          {/* The pill opens outward from its centre on arrival; inside the capsule it drops its own glass. */}
          <motion.ul initial={{ clipPath: 'inset(0% 50% 0% 50% round 999px)', opacity: 0 }} animate={{ clipPath: 'inset(0% 0% 0% 0% round 999px)', opacity: 1 }}
            transition={{ duration: 1.1, ease: OUT, delay: 0.15 }}
            className={cn('flex items-center gap-0.5 rounded-full p-1.5 transition-[background-color,box-shadow] duration-[900ms]',
              compact ? 'bg-transparent shadow-none' : 'bg-paper/35 shadow-[0_8px_30px_-18px_rgb(66_44_28/0.45),inset_0_1px_0_rgb(255_255_255/0.6),inset_0_0_0_1px_rgb(42_31_23/0.08)] backdrop-blur-xl')}
            onMouseLeave={() => setHovered(null)}>
            {LINKS.map((l, i) => {
              const isLit = lit === l.key
              const isObjects = l.key === 'objects'
              return (
                <motion.li key={l.key} className="relative" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: OUT, delay: 0.45 + i * 0.07 }}>
                  {isLit && <motion.span layoutId="nav-highlight" transition={SPRING} className="absolute inset-0 rounded-full bg-ink shadow-[0_6px_16px_-6px_rgb(42_31_23/0.55)]" />}
                  <Link to={l.to}
                    onMouseEnter={() => { setHovered(l.key); setShopOpen(isObjects) }}
                    onFocus={() => { setHovered(l.key); setShopOpen(isObjects) }}
                    aria-current={current === l.key && !l.to.includes('#') ? 'page' : undefined}
                    {...(isObjects ? { 'aria-haspopup': 'true' as const, 'aria-expanded': shopOpen } : {})}
                    className={cn('group/link relative flex items-center gap-1 rounded-full py-2 text-[12px] font-medium uppercase tracking-[0.16em] transition-[color,padding] duration-500',
                      compact ? 'px-3.5' : 'px-4', isLit ? 'text-paper' : 'text-ink/80 hover:text-ink')}>
                    <Roll>{l.label}</Roll>
                    {isObjects && <Icon name="chevronDown" size={12} className={cn('transition-transform duration-500', shopOpen && 'rotate-180')} />}
                  </Link>
                </motion.li>
              )
            })}
          </motion.ul>
        </nav>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: OUT, delay: 0.3 }}
          className="flex shrink-0 items-center gap-0.5 sm:gap-1.5" onMouseEnter={() => setShopOpen(false)}>
          <button onClick={() => setSearch(true)} className={tool} aria-label="Search"><Icon name="search" size={19} /></button>
          <Link to="/wishlist" className={cn(tool, 'hidden sm:grid')} aria-label={`Saved pieces, ${saved}`}>
            <Icon name="heart" size={19} />
            {saved > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent" aria-hidden="true" />}
          </Link>
          <Link to={user ? '/account' : '/login'} className={cn(tool, 'hidden lg:grid')} aria-label={user ? 'My account' : 'Sign in'}>
            <Icon name="user" size={19} />
          </Link>
          <button onClick={() => setCart(true)} aria-label={`Bag, ${bag} items`}
            className="relative ml-1 grid size-11 place-items-center rounded-full bg-ink text-paper transition-transform duration-500 ease-[var(--ease-out-quint)] hover:scale-105 active:scale-95">
            <Icon name="bag" size={18} />
            {bag > 0 && (
              <motion.span key={bag} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-tan px-1 text-[11px] font-semibold tabular-nums text-ink">{bag}</motion.span>
            )}
          </button>
          <button onClick={() => setMenu(true)} className={cn(tool, 'lg:hidden')} aria-label="Open menu"><Icon name="menu" size={22} /></button>
        </motion.div>

        {/* Reading progress, drawn along the bottom of the capsule. */}
        <motion.span aria-hidden style={{ scaleX: progress }}
          className={cn('pointer-events-none absolute inset-x-8 bottom-0 h-px origin-left bg-accent/70 transition-opacity duration-700', compact && !shopOpen ? 'opacity-100' : 'opacity-0')} />
      </div>

      {/* Objects: a floating card of ways to browse, dropping from the pill. */}
      <AnimatePresence>
        {shopOpen && (
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.45, ease: OUT }}
            onMouseEnter={() => setHovered('objects')}
            className="pointer-events-auto absolute inset-x-0 top-full mx-auto mt-3 hidden max-w-[1000px] origin-top lg:block">
            <div className="grid grid-cols-12 gap-8 rounded-[2rem] bg-paper/80 p-9 shadow-[0_30px_60px_-30px_rgb(66_44_28/0.5),inset_0_1px_0_rgb(255_255_255/0.6)] ring-1 ring-ink/[0.07] backdrop-blur-2xl backdrop-saturate-150">
              <div className="col-span-5 flex flex-col gap-1">
                <p className="mb-3 text-[13px] text-fog">Browse</p>
                {[['/shop', 'Everything'], ['/new', 'New arrivals'], ['/bestsellers', 'Best sellers'], ['/shop?max=999&sort=price_asc', 'Gifts under ₹999']].map(([to, label]) => (
                  <Link key={to} to={to} className="group font-display text-[2.1rem] leading-[1.15] text-ink transition-colors hover:text-accent">
                    <span className="inline-block transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:translate-x-2 group-hover:italic">{label}</span>
                  </Link>
                ))}
              </div>
              <div className="col-span-7">
                <p className="mb-3 text-[13px] text-fog">Collections</p>
                <ul className="border-t border-rule">
                  {categories?.map((c) => (
                    <li key={c.id}>
                      <Link to={`/collections/${c.slug}`} className="group flex items-baseline gap-5 border-b border-rule py-3.5 text-ink">
                        <span className="flex-1 font-display text-[1.35rem] transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:translate-x-2 group-hover:text-accent">{c.name}</span>
                        <span className="text-[13px] tabular-nums text-fog">{c.product_count ? `${c.product_count} ${c.product_count === 1 ? 'piece' : 'pieces'}` : 'Coming soon'}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link to="/customise" className="mt-6 inline-flex items-baseline gap-3 text-[14px] text-smoke hover:text-ink">
                  <span className="font-script text-[1.9rem] leading-none text-accent">something else?</span>
                  <span className="link-draw">Customise a piece</span>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
    </MotionConfig>
  )
}
