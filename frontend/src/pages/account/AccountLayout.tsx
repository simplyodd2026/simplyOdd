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

  const first = name?.split(/\s+/)[0]

  return (
    <Container className="pb-24 pt-10 sm:pb-32 sm:pt-14">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-6 sm:mb-12">
          <div>
            <h1 className="font-display text-[clamp(2.75rem,5vw,4.75rem)] leading-[0.98] text-ink">Hello, {first}</h1>
            {user?.email && <p className="mt-4 text-[15px] text-smoke">{user.email}</p>}
          </div>
          {profile?.is_admin && (
            <NavLink to="/admin" className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/20 px-5 text-[14px] font-medium text-ink transition-colors hover:border-ink">
              Open admin dashboard <Icon name="arrowUpRight" size={15} />
            </NavLink>
          )}
        </header>

        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <nav className="-mx-5 flex gap-2 overflow-x-auto px-5 scrollbar-none sm:-mx-8 sm:px-8 lg:col-span-3 lg:mx-0 lg:flex-col lg:gap-1 lg:self-start lg:px-0 xl:col-span-2" aria-label="Account">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => cn('shrink-0 rounded-full px-4 py-2.5 text-[15px] transition-colors',
                  isActive ? 'bg-ink text-paper' : 'text-smoke hover:bg-ink/5 hover:text-ink')}>
                {n.label}
              </NavLink>
            ))}
            <button onClick={async () => { await auth.signOut(); navigate('/') }}
              className="flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-left text-[15px] text-smoke transition-colors hover:bg-ink/5 hover:text-ink lg:mt-4 lg:border-t lg:border-rule lg:rounded-none lg:pt-5">
              <Icon name="logout" size={17} /> Sign out
            </button>
          </nav>
          <div className="min-w-0 rounded-[20px] bg-paper-2 p-5 sm:p-8 lg:col-span-9 lg:p-10 xl:col-span-10"><Outlet /></div>
        </div>
      </div>
    </Container>
  )
}
