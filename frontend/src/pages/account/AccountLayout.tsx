import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { auth } from '@/lib/auth'
import { useSession } from '@/stores/session'
import { Container } from '@/components/layout/Container'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'

const NAV = [
  { to: '/account', label: 'Profile', end: true },
  { to: '/account/orders', label: 'Orders' },
  { to: '/account/addresses', label: 'Addresses' },
  { to: '/wishlist', label: 'Wishlist' },
]

export default function AccountLayout() {
  const { user, profile } = useSession()
  const navigate = useNavigate()
  const name = profile?.name || user?.name || user?.email?.split('@')[0]

  return (
    <Container className="pt-10 sm:pt-16">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[length:var(--text-title)] font-display leading-[0.95]">Hello, {name}</h1>
        {profile?.is_admin && (
          <NavLink to="/admin" className="inline-flex items-center gap-2 border border-accent px-3 py-2 text-sm text-accent hover:bg-accent hover:text-paper">
            Open admin dashboard
          </NavLink>
        )}
      </header>
      {user && !user.emailVerified && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-l-2 border-accent bg-accent/10 px-4 py-3 text-sm">
          <span>Confirm your email address so we can send order updates.</span>
          <NavLink to="/verify-email" className="underline underline-offset-4">Confirm email</NavLink>
        </div>
      )}
      <div className="grid gap-10 lg:grid-cols-12">
        <nav className="flex gap-5 overflow-x-auto border-b border-rule pb-3 text-[17px] scrollbar-none lg:col-span-2 lg:flex-col lg:gap-3 lg:border-0" aria-label="Account">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => cn('shrink-0', isActive ? 'text-ink underline decoration-accent decoration-2 underline-offset-8' : 'text-smoke hover:text-ink')}>
              {n.label}
            </NavLink>
          ))}
          <button onClick={async () => { await auth.signOut(); navigate('/') }}
            className="flex shrink-0 items-center gap-2 text-left text-smoke hover:text-ink lg:mt-6">
            <Icon name="logout" size={18} /> Sign out
          </button>
        </nav>
        <div className="min-w-0 lg:col-span-10"><Outlet /></div>
      </div>
    </Container>
  )
}
