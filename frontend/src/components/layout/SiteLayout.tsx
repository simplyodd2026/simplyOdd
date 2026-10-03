import { useEffect, useRef, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { CartDrawer } from './CartDrawer'
import { SearchOverlay } from './SearchOverlay'
import { MobileMenu } from './MobileMenu'
import { Toaster } from '@/components/ui/Toaster'
import { useConfig } from '@/lib/queries'
import { money } from '@/lib/format'
import { refreshScroll } from '@/lib/motion'
import { scrollToTop, startSmoothScroll } from '@/lib/scroll'

/** A quiet service line above the header; the messages cross-fade rather than scroll. */
function AnnouncementBar({ threshold }: { threshold: number }) {
  const notes = [
    `Complimentary shipping on orders over ${money(threshold)}`,
    'Made to order in small batches',
    'Every piece inspected by hand before it ships',
  ]
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % notes.length), 4500)
    return () => clearInterval(t)
  }, [notes.length])
  return (
    <div className="relative z-40 h-9 overflow-hidden bg-night text-paper" aria-label="Announcements">
      <p className="sr-only">{notes.join('. ')}</p>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p key={i} aria-hidden="true" className="label absolute inset-0 grid place-items-center text-paper/80"
          initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}>
          {notes[i]}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

/**
 * Pages cross-fade on navigation: the old page dims out, the scroll position resets
 * while nothing is visible, then the new page's own reveals take over.
 * Only opacity is animated here, so pinned sections (which rely on position: fixed) stay correct.
 */
function PageTransition() {
  const { pathname } = useLocation()
  const outlet = useOutlet()
  return (
    <AnimatePresence mode="wait" onExitComplete={() => { scrollToTop(); refreshScroll() }}>
      <motion.div key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
        exit={{ opacity: 0, transition: { duration: 0.35, ease: [0.76, 0, 0.24, 1] } }}>
        {outlet}
      </motion.div>
    </AnimatePresence>
  )
}

export function SiteLayout() {
  const { data: config } = useConfig()
  const main = useRef<HTMLElement>(null)

  useEffect(() => startSmoothScroll(), [])

  // Data and images arrive after first paint; re-measure scroll triggers whenever the page height settles.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const ro = new ResizeObserver(() => {
      clearTimeout(t)
      t = setTimeout(refreshScroll, 200)
    })
    if (main.current) ro.observe(main.current)
    return () => { clearTimeout(t); ro.disconnect() }
  }, [])

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-ink focus:px-5 focus:py-2.5 focus:text-paper">
        Skip to content
      </a>
      <AnnouncementBar threshold={config?.free_shipping_threshold ?? 1999} />
      <Navbar />
      <main id="main" ref={main} className="flex-1">
        <PageTransition />
      </main>
      <Footer />
      <CartDrawer />
      <SearchOverlay />
      <MobileMenu />
      <Toaster />
    </div>
  )
}
