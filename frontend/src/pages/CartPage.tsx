import { Link, useNavigate } from 'react-router-dom'
import { useQuote } from '@/lib/queries'
import { useCart } from '@/stores/cart'
import { useWishlist } from '@/stores/wishlist'
import { useDocumentTitle } from '@/lib/hooks'
import { money } from '@/lib/format'
import { Container } from '@/components/layout/Container'
import { PageHeader } from '@/components/layout/PageHeader'
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
        <PageHeader title="Your bag" count={0} />
        <Container>
          <EmptyState title="Nothing in here yet." body="Your bag is saved on this device, and to your account when you're signed in."
            action={<ButtonLink to="/shop" size="lg">Browse the shop</ButtonLink>} />
        </Container>
        <ProductRail title="Most collected" kicker="Start here" query={{ flag: 'bestseller', sort: 'popular', page_size: 4 }} href="/bestsellers" linkLabel="All best sellers" />
      </>
    )
  }

  return (
    <>
    <PageHeader title="Your bag" count={items.reduce((n, i) => n + i.quantity, 0)} />
    <Container className="pb-28">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-8">
          {isLoading || !quote ? (
            <div className="flex flex-col gap-4">{items.map((i) => <Skeleton key={i.product_id} className="h-40" />)}</div>
          ) : (
            <ul className="divide-y divide-rule border-y border-rule">
              {quote.lines.map((l) => (
                <li key={l.product_id} className="grid grid-cols-[6rem_1fr] gap-5 py-8 sm:grid-cols-[9rem_1fr_auto] sm:gap-8">
                  <Link to={`/product/${l.slug}`} className="overflow-hidden bg-ash">{l.image && <img src={l.image} alt="" className="aspect-[4/5] w-full object-cover transition-transform duration-700 hover:scale-105" />}</Link>
                  <div className="flex flex-col">
                    <Link to={`/product/${l.slug}`} className="font-display text-3xl leading-tight text-ink hover:text-accent">{l.name}</Link>
                    <span className="mt-2 tabular-nums text-[12px] text-fog">
                      {money(l.unit_price)}{l.compare_at_price && l.compare_at_price > l.unit_price && <s className="ml-2 text-fog">{money(l.compare_at_price)}</s>}
                    </span>
                    {l.issue && <p className="mt-2 text-sm text-accent">{l.issue}{l.stock > 0 && '. Reduce the quantity to continue.'}</p>}
                    <div className="mt-auto flex flex-wrap items-center gap-4 pt-4">
                      {l.available || l.stock > 0 ? (
                        <QuantityStepper size="sm" value={l.quantity} max={Math.max(1, l.stock)} onChange={(n) => setQuantity(l.product_id, n)} />
                      ) : null}
                      <button onClick={() => remove(l.product_id)} className="link-draw text-sm text-smoke hover:text-ink">Remove</button>
                      {l.slug && (
                        <button onClick={() => { void toggleWish(l.product_id, l.name); remove(l.product_id) }}
                          className="link-draw text-sm text-smoke hover:text-ink">Save for later</button>
                      )}
                    </div>
                  </div>
                  <span className="col-start-2 tabular-nums text-[15px] text-ink sm:col-start-3 sm:text-right">{money(l.line_total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="lg:col-span-4 lg:col-start-9">
          <div className="flex flex-col gap-6 rounded-lg bg-paper-2 p-6 sm:p-8 lg:sticky lg:top-28">
            <h2 className="font-display text-3xl text-ink">Summary</h2>
            <CouponField quote={quote} />
            {quote && <Totals quote={quote} />}
            <p className="-mt-2 text-sm text-fog">Shipping shown for {shippingMethod} delivery. You can change it at checkout.</p>
            <Button size="lg" disabled={!quote || quote.has_issues} onClick={() => navigate('/checkout')}>Check out</Button>
            {quote?.has_issues && <p className="text-sm text-accent">Fix the items marked above to continue.</p>}
          </div>
        </aside>
      </div>
    </Container>
    </>
  )
}
