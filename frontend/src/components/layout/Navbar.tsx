import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useCategories } from '@/lib/queries'
import { cartCount, useCart } from '@/stores/cart'
import { useWishlist } from '@/stores/wishlist'
import { useSession } from '@/stores/session'
import { useUi } from '@/stores/ui'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'
import { Wordmark } from '@/components/brand/Wordmark'

const LINKS = [
  { to: '/collections', label: 'Collections' },
  { to: '/new', label: 'New arrivals' },
  { to: '/bestsellers', label: 'Best sellers' },
  { to: '/about', label: 'About' },
]

function Count({ n }: { n: number }) {
  if (!n) return null
  return (
    <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold tabular-nums text-paper">
      {n > 99 ? '99+' : n}
    </span>
  )
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const { pathname } = useLocation()
  const items = useCart((s) => s.items)
  const saved = useWishlist((s) => s.ids.length)
  const user = useSession((s) => s.user)
  const { setCart, setSearch, setMenu } = useUi()
  const { data: categories } = useCategories()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => { setShopOpen(false) }, [pathname])

  const iconBtn = 'relative grid size-10 place-items-center rounded-full text-ink hover:bg-pink hover:text-accent transition-colors'
  const link = ({ isActive }: { isActive: boolean }) =>
    cn('relative py-3 transition-colors hover:text-accent after:absolute after:inset-x-0 after:bottom-1.5 after:h-[3px] after:origin-left after:rounded-full after:bg-accent after:transition-transform',
      isActive ? 'text-accent after:scale-x-100' : 'text-ink after:scale-x-0 hover:after:scale-x-100')

  return (
    <header className={cn('sticky top-0 z-40 border-b bg-paper transition-shadow duration-300',
      scrolled ? 'border-rule shadow-[0_8px_24px_-18px_rgb(0_0_0/0.35)]' : 'border-transparent')}
      onMouseLeave={() => setShopOpen(false)}>
      <div className="mx-auto grid h-16 max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6 lg:h-20 lg:px-10">
        <div className="flex items-center gap-1">
          <button className={cn(iconBtn, '-ml-2 lg:hidden')} onClick={() => setMenu(true)} aria-label="Open menu">
            <Icon name="menu" size={22} />
          </button>
          <button onClick={() => setSearch(true)} aria-label="Search"
            className="hidden h-10 w-64 items-center gap-2 rounded-full border border-rule bg-paper-2 px-4 text-sm text-fog transition-colors hover:border-ink/30 lg:flex">
            <Icon name="search" size={18} /> <span className="whitespace-nowrap">Search oddities…</span>
            <kbd className="ml-auto rounded-md border border-rule bg-paper px-1.5 text-[11px] font-medium">/</kbd>
          </button>
        </div>

        <Link to="/" className="text-[26px] text-accent transition-colors hover:text-ink lg:text-[36px]" aria-label="Simply Odd home">
          <Wordmark />
        </Link>

        <div className="flex items-center justify-end gap-0.5 sm:gap-1">
          <button className={cn(iconBtn, 'lg:hidden')} onClick={() => setSearch(true)} aria-label="Search">
            <Icon name="search" />
          </button>
          <Link to="/wishlist" className={cn(iconBtn, 'hidden sm:grid')} aria-label={`Wishlist, ${saved} saved`}>
            <Icon name="heart" /><Count n={saved} />
          </Link>
          <Link to={user ? '/account' : '/login'} className={cn(iconBtn, 'hidden sm:grid')} aria-label={user ? 'Your account' : 'Sign in'}>
            <Icon name="user" />
          </Link>
          <button className={cn(iconBtn, '-mr-2')} onClick={() => setCart(true)} aria-label={`Bag, ${cartCount(items)} items`}>
            <Icon name="bag" /><Count n={cartCount(items)} />
          </button>
        </div>
      </div>

      <nav className="hidden items-center justify-center gap-9 border-t border-rule text-[15px] font-semibold lg:flex" aria-label="Main">
        <NavLink to="/shop" onMouseEnter={() => setShopOpen(true)} onFocus={() => setShopOpen(true)}
          className={(a) => cn(link(a), 'flex items-center gap-1')} aria-expanded={shopOpen} aria-haspopup="true">
          Shop <Icon name="chevronDown" size={14} className={cn('transition-transform', shopOpen && 'rotate-180')} />
        </NavLink>
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} onMouseEnter={() => setShopOpen(false)} className={link}>
            {l.label}
          </NavLink>
        ))}
        <NavLink to="/custom" onMouseEnter={() => setShopOpen(false)} className={(a) => cn(link(a), 'flex items-center gap-1.5')}>
          Custom ✦
          <span className="font-hand -rotate-6 rounded-full bg-pink-2 px-1.5 text-[11px] leading-4 text-ink">new</span>
        </NavLink>
        <NavLink to="/shop?max=999&sort=price_asc" onMouseEnter={() => setShopOpen(false)}
          className="flex items-center gap-1.5 py-3 text-accent hover:text-ink">
          <span className="font-hand text-base leading-none">psst,</span> gifts under ₹999
        </NavLink>
      </nav>

      {shopOpen && (
        <div className="animate-fade absolute inset-x-0 top-full hidden border-y border-rule bg-paper shadow-[0_24px_40px_-24px_rgb(0_0_0/0.25)] lg:block">
          <div className="mx-auto grid max-w-[1600px] grid-cols-12 gap-10 px-10 py-10">
            <div className="col-span-3 flex flex-col gap-3 rounded-3xl bg-pink p-7">
              <p className="font-hand -rotate-2 text-lg text-accent">start here</p>
              <Link to="/shop" className="font-display text-4xl text-ink hover:text-accent">Everything</Link>
              <Link to="/new" className="font-medium text-graphite hover:text-accent">New arrivals</Link>
              <Link to="/bestsellers" className="font-medium text-graphite hover:text-accent">Best sellers</Link>
            </div>
            <ul className="col-span-9 grid grid-cols-3 gap-x-6 gap-y-2">
              {categories?.map((c) => (
                <li key={c.id}>
                  <Link to={`/collections/${c.slug}`} className="group flex items-center gap-4 rounded-2xl p-2 transition-colors hover:bg-paper-2">
                    <span className="size-14 shrink-0 overflow-hidden rounded-full bg-ash ring-2 ring-transparent transition group-hover:ring-accent">
                      {c.image && <img src={c.image} alt="" className="h-full w-full object-cover" />}
                    </span>
                    <span className="flex-1 text-lg font-semibold text-ink group-hover:text-accent">{c.name}</span>
                    <span className="text-sm tabular-nums text-fog">{c.product_count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </header>
  )
}
