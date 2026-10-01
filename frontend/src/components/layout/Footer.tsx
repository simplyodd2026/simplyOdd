import { Link } from 'react-router-dom'
import { useCategories } from '@/lib/queries'
import { Wordmark } from '@/components/brand/Wordmark'
import { Icon } from '@/components/ui/Icon'
import { TornEdge } from '@/components/scrapbook/Torn'

export function Footer() {
  const { data: categories } = useCategories()
  const col = 'flex flex-col gap-2.5 text-[15px] text-paper/70'
  const head = 'mb-2 font-hand text-lg text-pink-2'
  const a = 'transition-colors hover:text-paper'
  return (
    <footer className="mt-24 text-paper">
      <TornEdge color="var(--color-ink)" fibre="var(--color-pink-2)" seed="footer" />
      <div className="-mt-px bg-ink">
      <div className="mx-auto grid max-w-[1600px] gap-12 px-4 pb-12 pt-16 sm:px-6 md:grid-cols-12 lg:px-10">
        <div className="md:col-span-5">
          <p className="max-w-sm font-serif text-3xl italic leading-snug">
            Things that don't need to exist, made carefully anyway.
          </p>
          <p className="mt-4 max-w-sm text-sm text-paper/60">
            Designed in-house and 3D printed to order in small batches in Bengaluru.
          </p>
          <a href="https://instagram.com" target="_blank" rel="noreferrer"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-pink-2 px-5 text-sm font-semibold text-ink transition-colors hover:bg-paper">
            Say hi on Instagram <Icon name="external" size={16} />
          </a>
        </div>
        <nav className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:col-span-7" aria-label="Footer">
          <div className={col}>
            <p className={head}>shop</p>
            <Link to="/shop" className={a}>Everything</Link>
            {categories?.slice(0, 5).map((c) => <Link key={c.id} to={`/collections/${c.slug}`} className={a}>{c.name}</Link>)}
          </div>
          <div className={col}>
            <p className={head}>help</p>
            <Link to="/help/shipping" className={a}>Shipping</Link>
            <Link to="/help/returns" className={a}>Returns</Link>
            <Link to="/help/faq" className={a}>Questions</Link>
            <Link to="/account/orders" className={a}>Track an order</Link>
          </div>
          <div className={col}>
            <p className={head}>studio</p>
            <Link to="/custom" className={a}>Custom orders</Link>
            <Link to="/about" className={a}>About</Link>
            <a href="mailto:hello@simplyodd.in" className={a}>hello@simplyodd.in</a>
          </div>
        </nav>
      </div>
      <div className="overflow-hidden">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10">
          <Wordmark className="block translate-y-[14%] whitespace-nowrap text-[length:var(--text-wordmark)] leading-[0.8] text-pink-2" />
        </div>
      </div>
      <div className="border-t border-paper/10">
        <div className="mx-auto flex max-w-[1600px] flex-wrap justify-between gap-2 px-4 py-5 text-sm text-paper/60 sm:px-6 lg:px-10">
          <span>© {new Date().getFullYear()} Simply Odd</span>
          <span>Printed in Bengaluru, shipped across India.</span>
        </div>
      </div>
      </div>
    </footer>
  )
}
