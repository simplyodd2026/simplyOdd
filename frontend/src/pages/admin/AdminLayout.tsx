import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Wordmark } from '@/components/brand/Wordmark'
import { Toaster } from '@/components/ui/Toaster'
import { Icon } from '@/components/ui/Icon'
import { useSession } from '@/stores/session'
import { cn } from '@/lib/cn'

const NAV = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/homepage', label: 'Home page' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/coupons', label: 'Coupons' },
  { to: '/admin/reviews', label: 'Reviews' },
  { to: '/admin/custom-requests', label: 'Custom requests' },
  { to: '/admin/newsletter', label: 'Newsletter' },
]

export default function AdminLayout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const profile = useSession((s) => s.profile)
  useEffect(() => { setOpen(false) }, [pathname])

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Admin">
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end}
          className={({ isActive }) => cn('px-3 py-2 text-[15px] transition-colors', isActive ? 'bg-ink font-medium text-paper' : 'text-smoke hover:bg-black/5 hover:text-ink')}>
          {n.label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="hidden border-r border-rule bg-paper-2 lg:flex lg:flex-col">
        <div className="sticky top-0 flex h-dvh flex-col gap-8 p-5">
          <Link to="/admin" className="text-xl text-ink"><Wordmark /></Link>
          {nav}
          <div className="mt-auto flex flex-col gap-2 text-sm text-fog">
            <span className="truncate">{profile?.email}</span>
            <Link to="/" className="inline-flex items-center gap-1.5 hover:text-ink"><Icon name="external" size={14} /> View storefront</Link>
          </div>
        </div>
      </aside>
      <div className="flex h-14 items-center justify-between border-b border-rule px-4 lg:hidden">
        <Link to="/admin" className="text-lg"><Wordmark /></Link>
        <button onClick={() => setOpen(!open)} className="p-2" aria-label="Admin menu" aria-expanded={open}><Icon name={open ? 'close' : 'menu'} /></button>
      </div>
      {open && <div className="border-b border-rule bg-paper-2 p-4 lg:hidden">{nav}<Link to="/" className="mt-3 block px-3 text-sm text-fog">View storefront</Link></div>}
      <main className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"><Outlet /></main>
      <Toaster />
    </div>
  )
}
