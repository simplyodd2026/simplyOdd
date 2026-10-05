import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCategories } from '@/lib/queries'
import { api, ApiError } from '@/lib/api'
import { gsap, useGSAP, reducedMotion } from '@/lib/motion'
import { scrollToY } from '@/lib/scroll'
import { Wordmark } from '@/components/brand/Wordmark'
import { Icon } from '@/components/ui/Icon'

function Newsletter() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'done' | { error: string }>('idle')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('loading')
    try {
      await api('/newsletter', { body: { email }, auth: false })
      setState('done')
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setState('done')
      else setState({ error: err instanceof Error ? err.message : 'Try again.' })
    }
  }
  return (
    <div>
            <p className="font-display text-[clamp(2.25rem,3.8vw,3.75rem)] leading-[1] text-paper">New pieces, first</p>
      <p className="mt-3 text-[15px] text-paper/60">One email per release. Nothing else.</p>
      {state === 'done' ? (
        <p className="mt-8 flex items-center gap-3 text-paper/80"><span className="size-1.5 rounded-full bg-tan" /> Thank you. You're subscribed.</p>
      ) : (
        <form onSubmit={submit} className="group mt-8 flex max-w-md items-center border-b border-paper/25 transition-colors focus-within:border-paper">
          <label htmlFor="ft-email" className="sr-only">Email address</label>
          <input id="ft-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email"
            className="h-14 flex-1 bg-transparent text-lg text-paper outline-none placeholder:text-paper/35" />
          <button type="submit" disabled={state === 'loading'} aria-label="Subscribe"
            className="grid size-11 place-items-center rounded-full text-paper transition-[background-color,color,transform] duration-500 hover:bg-tan hover:text-ink disabled:opacity-40">
            <Icon name="arrowRight" />
          </button>
        </form>
      )}
      {typeof state === 'object' && <p className="mt-3 text-sm text-accent-soft" role="alert">{state.error}</p>}
    </div>
  )
}

export function Footer() {
  const { data: categories } = useCategories()
  const root = useRef<HTMLElement>(null)

  // The giant wordmark rises out of the floor as the footer arrives.
  useGSAP(() => {
    if (reducedMotion()) return
    gsap.fromTo('.ft-mark', { yPercent: 45 }, {
      yPercent: 0, ease: 'none',
      scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom bottom', scrub: true },
    })
  }, { scope: root })

  const col = 'flex flex-col items-start gap-2.5 text-[15px] text-paper/70'
  const head = 'label mb-3 text-paper/40'
  const a = 'link-draw transition-colors hover:text-paper'
  return (
    <footer ref={root} className="relative overflow-hidden bg-night text-paper">
      <div className="mx-auto grid max-w-[1520px] gap-16 px-5 pb-10 pt-20 sm:px-8 md:grid-cols-12 lg:px-10 lg:pt-28">
        <div className="md:col-span-6 lg:col-span-5"><Newsletter /></div>
        <nav className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:col-span-6 lg:col-span-6 lg:col-start-7" aria-label="Footer">
          <div className={col}>
            <p className={head}>Shop</p>
            <Link to="/shop" className={a}>Everything</Link>
            {categories?.slice(0, 5).map((c) => <Link key={c.id} to={`/collections/${c.slug}`} className={a}>{c.name}</Link>)}
          </div>
          <div className={col}>
            <p className={head}>Help</p>
            <Link to="/help/shipping" className={a}>Shipping</Link>
            <Link to="/help/returns" className={a}>Returns</Link>
            <Link to="/help/faq" className={a}>Questions</Link>
            <Link to="/account/orders" className={a}>Track an order</Link>
          </div>
          <div className={col}>
            <p className={head}>Studio</p>
            <Link to="/about" className={a}>About</Link>
            <Link to="/customise" className={a}>Customise</Link>
            <a href="mailto:hello@simplyodd.in" className={a}>hello@simplyodd.in</a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className={`${a} inline-flex items-center gap-1`}>Instagram <Icon name="arrowUpRight" size={14} /></a>
          </div>
        </nav>
      </div>

      <div className="mx-auto flex max-w-[1520px] flex-wrap items-center justify-between gap-4 border-t border-paper/10 px-5 py-5 text-[13px] text-paper/50 sm:px-8 lg:px-10">
        <span>© {new Date().getFullYear()} Simply Odd. Made to order, shipped across India.</span>
        <button onClick={() => scrollToY(0)} className="group inline-flex items-center gap-2 transition-colors hover:text-paper">
          Back to top <Icon name="arrowRight" size={14} className="-rotate-90 transition-transform duration-500 group-hover:-translate-y-0.5" />
        </button>
      </div>

      <div className="overflow-hidden px-3 sm:px-6 lg:px-8" aria-hidden="true">
        <div className="ft-mark flex justify-center pb-[3vw] pt-[2vw] opacity-90">
          <Wordmark light className="h-auto w-[72vw] max-w-[1100px]" />
        </div>
      </div>
    </footer>
  )
}
