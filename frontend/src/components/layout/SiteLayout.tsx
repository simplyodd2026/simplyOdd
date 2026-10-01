import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { CartDrawer } from './CartDrawer'
import { SearchOverlay } from './SearchOverlay'
import { MobileMenu } from './MobileMenu'
import { Toaster } from '@/components/ui/Toaster'
import { CustomNudge } from '@/components/scrapbook/Slang'
import { useConfig } from '@/lib/queries'
import { money } from '@/lib/format'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function AnnouncementBar({ threshold }: { threshold: number }) {
  const notes = [
    `Free shipping on orders over ${money(threshold)}`,
    'Printed to order in Bengaluru',
    'Use ODDONE for 10% off your first odd thing',
    'Every piece is checked by hand',
  ]
  // Two identical halves so the -50% loop is seamless.
  const run = [...notes, ...notes]
  return (
    <div className="overflow-hidden bg-butter py-2.5 text-[13px] font-semibold text-ink" aria-label="Announcements">
      <p className="sr-only">{notes.join('. ')}</p>
      <div className="animate-marquee flex w-max hover:[animation-play-state:paused]" aria-hidden="true">
        {[run, run].map((r, k) => (
          <div key={k} className="flex shrink-0">
            {r.map((n, i) => (
              <span key={i} className="flex items-center gap-6 px-6 whitespace-nowrap">
                {n}<span className="text-accent">♡</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SiteLayout() {
  const { data: config } = useConfig()
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <ScrollToTop />
      <AnnouncementBar threshold={config?.free_shipping_threshold ?? 1999} />
      <Navbar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <SearchOverlay />
      <MobileMenu />
      <Toaster />
      {/* Keyed by page so a dismissed bubble returns on the next page; hidden on the custom page itself. */}
      {pathname !== '/custom' && <CustomNudge key={pathname} />}
    </div>
  )
}
