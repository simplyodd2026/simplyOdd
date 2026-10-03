import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { GooglyBlob } from './Stickers'
import { Icon } from '@/components/ui/Icon'

const TONES = {
  pink: 'bg-pink-2', butter: 'bg-butter', lilac: 'bg-lilac', mint: 'bg-mint', sky: 'bg-sky', peach: 'bg-peach',
}

/** A tilted slang sticker that links to the custom-order page. */
export function Slang({ text, tone = 'butter', tilt = -4, className }: {
  text: string; tone?: keyof typeof TONES; tilt?: number; className?: string
}) {
  return (
    <Link to="/custom" aria-label={`Custom orders: ${text}`} style={{ rotate: `${tilt}deg` }}
      className={cn('group z-10 items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-ink px-4 py-2 font-chewy text-lg leading-none text-ink shadow-[3px_4px_0_var(--color-ink)] transition-transform duration-300 ease-[var(--ease-spring)] hover:-translate-y-1 hover:!rotate-0',
        // Callers that hide it on small screens pass their own display classes.
        className?.includes('hidden') ? '' : 'inline-flex', TONES[tone], className)}>
      {text}<span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
    </Link>
  )
}

/**
 * A small bubble that pops up once you've scrolled a little, pointing at custom orders.
 * Closing it hides it for the current page only; it comes back on the next page.
 */
export function CustomNudge() {
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (dismissed) return
    const onScroll = () => setShow(window.scrollY > 600)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [dismissed])

  if (dismissed || !show) return null
  const close = () => setDismissed(true)
  return (
    <div className="animate-toast fixed bottom-5 left-5 z-40 flex max-w-xs items-center gap-3 rounded-[1.5rem] rounded-bl-[0.375rem] border-2 border-ink bg-paper p-3 pr-9 shadow-[4px_5px_0_var(--color-ink)]" role="complementary" aria-label="Custom orders">
      <GooglyBlob className="w-12 shrink-0 -rotate-6" />
      <div>
        <p className="font-hand text-sm leading-snug text-smoke">psst… got an idea stuck in your head?</p>
        <Link to="/custom" onClick={close} className="font-chewy text-xl leading-tight text-ink hover:text-accent">say less, make it custom ↗</Link>
      </div>
      <button onClick={close} aria-label="Dismiss" className="absolute right-2 top-2 p-1 text-smoke hover:text-ink"><Icon name="close" size={16} /></button>
    </div>
  )
}
