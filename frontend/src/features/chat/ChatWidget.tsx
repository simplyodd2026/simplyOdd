import { lazy, Suspense, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'
import { viewingProduct } from './api'
import { useChat } from './store'

// The conversation UI loads on first open, so the launcher adds almost nothing to page weight.
const ChatPanel = lazy(() => import('./ChatPanel'))

/** Where the assistant stays out of the way: paying shouldn't compete with a chat window. */
const HIDDEN = /^\/(checkout|order\/)/

/** Oddly Assistant: a quiet launcher in the corner and the conversation panel it opens. */
export function ChatWidget() {
  const { pathname } = useLocation()
  const open = useChat((s) => s.open)
  const setOpen = useChat((s) => s.setOpen)
  // Tell the assistant which product page is open, so "this one" means the piece on screen.
  useEffect(() => { useChat.setState({ viewing: viewingProduct(pathname) }) }, [pathname])
  if (HIDDEN.test(pathname)) return null
  // The product page has a sticky buy bar on small screens; sit above it.
  const raised = pathname.startsWith('/product/')

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button key="launcher" type="button" onClick={() => setOpen(true)}
            aria-label="Open Oddly Assistant" aria-haspopup="dialog"
            initial={{ opacity: 0, y: 16, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.92 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className={cn('group fixed right-4 z-40 flex h-14 items-center gap-2.5 rounded-full bg-ink pl-4 pr-4 text-paper sm:right-6 sm:pr-5',
              'shadow-[0_1px_0_rgb(42_31_23/0.04),0_24px_40px_-18px_rgb(66_44_28/0.7)] transition-[background-color,transform] duration-500 ease-[var(--ease-out-quint)] hover:-translate-y-0.5 hover:bg-night',
              raised ? 'bottom-[5.5rem] lg:bottom-6' : 'bottom-4 sm:bottom-6')}>
            <span className="relative grid size-7 place-items-center">
              <Icon name="chat" size={22} strokeWidth={1.4} />
              <span className="absolute right-0 top-0.5 size-2 rounded-full bg-sun ring-2 ring-ink" aria-hidden="true" />
            </span>
            <span className="hidden font-odd text-[1.05rem] leading-none sm:inline">Ask Oddly</span>
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <Suspense key="panel" fallback={null}>
            <ChatPanel />
          </Suspense>
        )}
      </AnimatePresence>
    </>
  )
}
