import { Link, useNavigate } from 'react-router-dom'
import { useQuote } from '@/lib/queries'
import { useCart } from '@/stores/cart'
import { useUi } from '@/stores/ui'
import { money } from '@/lib/format'
import { Drawer } from '@/components/ui/Overlay'
import { Button, ButtonLink } from '@/components/ui/Button'
import { QuantityStepper } from '@/components/product/QuantityStepper'
import { Skeleton } from '@/components/ui/misc'
import { useConfig } from '@/lib/queries'

export function CartDrawer() {
  const { cartOpen, setCart } = useUi()
  const { items, couponCode, shippingMethod, setQuantity, remove } = useCart()
  const { data: quote, isLoading } = useQuote(items, couponCode, shippingMethod)
  const { data: config } = useConfig()
  const navigate = useNavigate()
  const close = () => setCart(false)

  const toFree = config && quote ? config.free_shipping_threshold - quote.subtotal : 0

  return (
    <Drawer open={cartOpen} onClose={close} title={`Your bag${items.length ? ` (${items.reduce((n, i) => n + i.quantity, 0)})` : ''}`}
      footer={items.length > 0 && quote ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <span className="text-smoke">Subtotal</span>
            <span className="text-xl font-semibold tabular-nums">{money(quote.subtotal)}</span>
          </div>
          <p className="-mt-2 text-sm text-fog">Shipping and tax are calculated at checkout.</p>
          <Button size="lg" disabled={quote.has_issues} onClick={() => { close(); navigate('/checkout') }}>Check out</Button>
          <ButtonLink to="/cart" variant="outline" onClick={close}>View bag</ButtonLink>
        </div>
      ) : undefined}>
      {items.length === 0 ? (
        <div className="flex flex-col items-start gap-5 p-6">
          <p className="font-display text-3xl leading-tight">Your bag is empty, which is the least odd thing here.</p>
          <ButtonLink to="/shop" onClick={close} variant="light">Browse the shop</ButtonLink>
        </div>
      ) : isLoading || !quote ? (
        <div className="flex flex-col gap-4 p-5">{items.map((i) => <Skeleton key={i.product_id} className="h-28" />)}</div>
      ) : (
        <>
          {toFree > 0 && (
            <div className="border-b border-rule px-5 py-3 text-sm text-smoke">
              Add <span className="text-ink">{money(toFree)}</span> more for free standard shipping.
              <div className="mt-2 h-0.5 bg-rule"><div className="h-full bg-accent" style={{ width: `${Math.min(100, (quote.subtotal / config!.free_shipping_threshold) * 100)}%` }} /></div>
            </div>
          )}
          <ul className="divide-y divide-rule">
            {quote.lines.map((line) => (
              <li key={line.product_id} className="flex gap-4 p-5">
                <Link to={`/product/${line.slug}`} onClick={close} className="w-20 shrink-0 bg-ash">
                  {line.image && <img src={line.image} alt="" className="aspect-[4/5] w-full object-cover" />}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/product/${line.slug}`} onClick={close} className="font-semibold leading-tight w-semi hover:text-accent">{line.name}</Link>
                    <span className="tabular-nums">{money(line.line_total)}</span>
                  </div>
                  <span className="text-sm text-fog tabular-nums">{money(line.unit_price)} each</span>
                  {line.issue && <p className="mt-1 text-sm text-accent">{line.issue}</p>}
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <QuantityStepper size="sm" value={line.quantity} max={Math.max(1, line.stock)}
                      onChange={(n) => setQuantity(line.product_id, n)} />
                    <button onClick={() => remove(line.product_id)} className="text-sm text-fog underline-offset-4 hover:text-ink hover:underline">Remove</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Drawer>
  )
}
