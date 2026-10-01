import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCategories } from '@/lib/queries'
import { useSession } from '@/stores/session'
import { useUi } from '@/stores/ui'
import { Drawer } from '@/components/ui/Overlay'
import { Wordmark } from '@/components/brand/Wordmark'

export function MobileMenu() {
  const { menuOpen, setMenu } = useUi()
  const { data: categories } = useCategories()
  const user = useSession((s) => s.user)
  const { pathname } = useLocation()
  useEffect(() => { setMenu(false) }, [pathname, setMenu])

  const big = 'block py-2 font-display text-4xl hover:text-accent'
  return (
    <Drawer open={menuOpen} onClose={() => setMenu(false)} side="left" title={<Wordmark className="text-xl" />}>
      <nav className="flex flex-col px-5 py-6" aria-label="Mobile">
        <Link to="/shop" className={big}>Shop all</Link>
        <Link to="/new" className={big}>New arrivals</Link>
        <Link to="/bestsellers" className={big}>Best sellers</Link>
        <Link to="/custom" className={big}>Custom orders ✦</Link>
        <Link to="/about" className={big}>About</Link>
        <p className="mt-8 border-b border-rule pb-2 text-sm text-fog">Collections</p>
        {categories?.map((c) => (
          <Link key={c.id} to={`/collections/${c.slug}`} className="flex justify-between border-b border-rule py-3 text-lg">
            {c.name}<span className="text-sm tabular-nums text-fog">{c.product_count}</span>
          </Link>
        ))}
        <div className="mt-8 flex flex-col gap-3 text-smoke">
          <Link to="/wishlist" className="hover:text-ink">Wishlist</Link>
          <Link to={user ? '/account' : '/login'} className="hover:text-ink">{user ? 'Your account' : 'Sign in'}</Link>
          <Link to="/help/shipping" className="hover:text-ink">Shipping & returns</Link>
        </div>
      </nav>
    </Drawer>
  )
}
