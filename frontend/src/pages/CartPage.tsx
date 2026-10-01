import { Link, useNavigate } from 'react-router-dom'
import { useQuote } from '@/lib/queries'
import { useCart } from '@/stores/cart'
import { useWishlist } from '@/stores/wishlist'
import { useDocumentTitle } from '@/lib/hooks'
import { money } from '@/lib/format'
import { Container } from '@/components/layout/Container'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState, Skeleton } from '@/components/ui/misc'
import { QuantityStepper } from '@/components/product/QuantityStepper'
import { Totals } from '@/features/checkout/OrderSummary'
import { CouponField } from '@/features/checkout/CouponField'
import { ProductRail } from '@/features/home/ProductRail'

export default function CartPage() {
  const { items, couponCode, shippingMethod, setQuantity, remove } = useCart()
  const { data: quote, isLoading } = useQuote(items, couponCode, shippingMethod)
  const toggleWish = useWishlist((s) => s.toggle)
  const navigate = useNavigate()
  useDocumentTitle('Your bag')

  if (!items.length) {
    return (
      <>
        <Container className="pt-10 sm:pt-16">
          <h1 className="text-[length:var(--text-title)] font-display leading-[0.95]">Your bag</h1>
          <EmptyState className="mt-10" title="Nothing in here yet." body="Your bag is saved on this device, and to your account when you're signed in."
            action={<ButtonLink to="/shop" variant="light">Browse the shop</ButtonLink>} />
        </Container>
        <ProductRail title="People are buying" query={{ flag: 'bestseller', sort: 'popular', page_size: 4 }} href="/bestsellers" linkLabel="All best sellers" />
      </>
    )
  }

  return (
    <Container className="pt-10 sm:pt-16">
      <h1 className="mb-10 text-[length:var(--text-title)] font-display leading-[0.95]">Your bag</h1>
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {isLoading || !quote ? (
            <div className="flex flex-col gap-4">{items.map((i) => <Skeleton key={i.product_id} className="h-40" />)}</div>
          ) : (
            <ul className="divide-y divide-rule border-y border-rule">
              {quote.lines.map((l) => (
                <li key={l.product_id} className="grid grid-cols-[6rem_1fr] gap-5 py-6 sm:grid-cols-[8rem_1fr_auto]">
                  <Link to={`/product/${l.slug}`} className="bg-ash">{l.image && <img src={l.image} alt="" className="aspect-[4/5] w-full object-cover" />}</Link>
                  <div className="flex flex-col">
                    <Link to={`/product/${l.slug}`} className="text-xl font-bold leading-tight w-semi hover:text-accent">{l.name}</Link>
                    <span className="mt-1 text-sm tabular-nums text-smoke">
                      {money(l.unit_price)}{l.compare_at_price && l.compare_at_price > l.unit_price && <s className="ml-2 text-fog">{money(l.compare_at_price)}</s>}
                    </span>
                    {l.issue && <p className="mt-2 text-sm text-accent">{l.issue}{l.stock > 0 && '. Reduce the quantity to continue.'}</p>}
                    <div className="mt-auto flex flex-wrap items-center gap-4 pt-4">
                      {l.available || l.stock > 0 ? (
                        <QuantityStepper size="sm" value={l.quantity} max={Math.max(1, l.stock)} onChange={(n) => setQuantity(l.product_id, n)} />
                      ) : null}
                      <button onClick={() => remove(l.product_id)} className="text-sm text-smoke underline-offset-4 hover:text-ink hover:underline">Remove</button>
                      {l.slug && (
                        <button onClick={() => { void toggleWish(l.product_id, l.name); remove(l.product_id) }}
                          className="text-sm text-smoke underline-offset-4 hover:text-ink hover:underline">Move to wishlist</button>
                      )}
                    </div>
                  </div>
                  <span className="col-start-2 text-lg font-semibold tabular-nums sm:col-start-3 sm:text-right">{money(l.line_total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="lg:col-span-4">
          <div className="flex flex-col gap-6 border border-rule p-6 lg:sticky lg:top-24">
            <h2 className="text-2xl font-display">Summary</h2>
            <CouponField quote={quote} />
            {quote && <Totals quote={quote} />}
            <p className="-mt-2 text-sm text-fog">Shipping shown for {shippingMethod} delivery. You can change it at checkout.</p>
            <Button size="lg" disabled={!quote || quote.has_issues} onClick={() => navigate('/checkout')}>Check out</Button>
            {quote?.has_issues && <p className="text-sm text-accent">Fix the items marked above to continue.</p>}
          </div>
        </aside>
      </div>
    </Container>
  )
}
