import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useCategories } from '@/lib/queries'
import { useSession } from '@/stores/session'
import { useUi } from '@/stores/ui'
import { Wordmark } from '@/components/brand/Wordmark'
import { Icon } from '@/components/ui/Icon'
import { useFocusOnOpen, useOverlay } from '@/components/ui/Overlay'

const EASE = [0.76, 0, 0.24, 1] as const
const OUT = [0.16, 1, 0.3, 1] as const

const PRIMARY = [
  ['/shop', 'All objects'],
  ['/new', 'New arrivals'],
  ['/collections', 'Collections'],
  ['/about#process', 'Process'],
  ['/about', 'About'],
  ['/customise', 'Customise'],
] as const

/** Full-screen menu: the panel wipes down, then each line rises from behind its own mask. */
export function MobileMenu() {
  const { menuOpen, setMenu } = useUi()
  const { data: categories } = useCategories()
  const user = useSession((s) => s.user)
  const { pathname } = useLocation()
  const close = () => setMenu(false)
  useEffect(() => { setMenu(false) }, [pathname, setMenu])
  useOverlay(menuOpen, close)
  const ref = useFocusOnOpen(menuOpen)

  return createPortal(
    <AnimatePresence>
      {menuOpen && (
        <motion.div ref={ref} role="dialog" aria-modal="true" aria-label="Menu" data-lenis-prevent
          initial={{ clipPath: 'inset(0% 0% 100% 0%)' }} animate={{ clipPath: 'inset(0% 0% 0% 0%)' }} exit={{ clipPath: 'inset(0% 0% 100% 0%)' }}
          transition={{ duration: 0.8, ease: EASE }}
          className="film-grain fixed inset-0 z-50 flex flex-col overflow-y-auto bg-night text-paper">
          <div className="flex h-16 shrink-0 items-center justify-between px-5 sm:px-8">
            <Link to="/" className="text-[26px]" aria-label="Simply Odd home"><Wordmark /></Link>
            <button autoFocus onClick={close} className="-mr-2 grid size-10 place-items-center rounded-full" aria-label="Close menu"><Icon name="close" size={22} /></button>
          </div>

          <nav className="flex flex-1 flex-col px-5 pt-8 sm:px-8" aria-label="Mobile">
            {PRIMARY.map(([to, label], i) => (
              <span key={to} className="mask-line">
                <motion.span className="block" initial={{ y: '110%' }} animate={{ y: 0 }} exit={{ y: '110%' }}
                  transition={{ duration: 0.9, ease: OUT, delay: 0.25 + i * 0.05 }}>
                  <Link to={to} className="flex items-baseline gap-4 py-1 font-display text-[clamp(2.6rem,11vw,4.5rem)] leading-[1.02] active:text-hot">
                    <span className="tabular-nums text-[11px] tracking-normal text-paper/40">{String(i + 1).padStart(2, '0')}</span>
                    {label}
                  </Link>
                </motion.span>
              </span>
            ))}

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.6, duration: 0.6 }}
              className="mt-12 pb-10">
              <p className="label mb-3 text-paper/40">Collections</p>
              <div className="flex flex-wrap gap-2">
                {categories?.map((c) => (
                  <Link key={c.id} to={`/collections/${c.slug}`}
                    className="rounded-full border border-paper/20 px-4 py-2 text-[14px] text-paper/80 transition-colors active:bg-paper active:text-ink">
                    {c.name}
                  </Link>
                ))}
              </div>
              <div className="mt-10 grid grid-cols-2 gap-3 text-[15px] text-paper/70">
                <Link to="/wishlist">Saved pieces</Link>
                <Link to={user ? '/account' : '/login'}>{user ? 'Your account' : 'Sign in'}</Link>
                <Link to="/help/shipping">Shipping</Link>
                <Link to="/help/returns">Returns</Link>
              </div>
            </motion.div>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
