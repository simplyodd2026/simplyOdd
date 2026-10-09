import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useConfig, useQuote } from '@/lib/queries'
import { useCart } from '@/stores/cart'
import { useUi } from '@/stores/ui'
import { money } from '@/lib/format'
import { Drawer } from '@/components/ui/Overlay'
import { Button, ButtonLink } from '@/components/ui/Button'
import { QuantityStepper } from '@/components/product/QuantityStepper'
import { Skeleton } from '@/components/ui/misc'

export function CartDrawer() {
  const { cartOpen, setCart } = useUi()
  const { items, couponCode, shippingMethod, setQuantity, remove } = useCart()
  const { data: quote, isLoading } = useQuote(items, couponCode, shippingMethod)
  const { data: config } = useConfig()
  const navigate = useNavigate()
  const close = () => setCart(false)
  const count = items.reduce((n, i) => n + i.quantity, 0)

  const threshold = config?.free_shipping_threshold ?? 0
  const toFree = config && quote ? threshold - quote.subtotal : 0
  const progress = threshold && quote ? Math.min(1, quote.subtotal / threshold) : 0

  return (
    <Drawer open={cartOpen} onClose={close} label="Bag"
      title={<span className="flex items-baseline gap-2">Bag <span className="tabular-nums text-[12px] text-fog">({String(count).padStart(2, '0')})</span></span>}
      footer={items.length > 0 && quote ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <span className="label text-smoke">Subtotal</span>
            <span className="font-display text-3xl tabular-nums text-ink">{money(quote.subtotal)}</span>
          </div>
          <p className="-mt-2 text-[13px] text-fog">Shipping is calculated at checkout.</p>
          <div className="grid grid-cols-2 gap-2">
            <ButtonLink to="/cart" variant="outline" size="lg" onClick={close}>View bag</ButtonLink>
            <Button size="lg" disabled={quote.has_issues} onClick={() => { close(); navigate('/checkout') }}>Check out</Button>
          </div>
        </div>
      ) : undefined}>
      {items.length === 0 ? (
        <div className="flex h-full flex-col justify-between gap-10 p-6 sm:p-8">
          <div>
            <p className="font-display text-[2.6rem] leading-[1.02] text-ink">Your bag is empty.</p>
            <p className="mt-4 max-w-xs text-smoke">Pieces you add will appear here, saved on this device and to your account when you sign in.</p>
          </div>
          <ButtonLink to="/shop" onClick={close} size="lg" className="self-start">Browse the shop</ButtonLink>
        </div>
      ) : isLoading || !quote ? (
        <div className="flex flex-col gap-4 p-6">{items.map((i) => <Skeleton key={i.product_id} className="h-28" />)}</div>
      ) : (
        <>
          {threshold > 0 && (
            <div className="border-b border-rule px-6 py-4 sm:px-8">
              <p className="text-[13px] text-smoke">
                {toFree > 0 ? <>Add <span className="text-ink">{money(toFree)}</span> more for free shipping.</> : <>Free standard shipping unlocked.</>}
              </p>
              <div className="mt-3 h-[2px] overflow-hidden bg-rule">
                <motion.div className="h-full origin-left bg-hot" initial={{ scaleX: 0 }} animate={{ scaleX: progress }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} />
              </div>
            </div>
          )}
          <ul>
            <AnimatePresence initial={false}>
              {quote.lines.map((line, i) => (
                <motion.li key={line.product_id} layout
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.05 * i, duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
                  exit={{ opacity: 0, x: 40, transition: { duration: 0.35 } }}
                  className="flex gap-5 border-b border-rule px-6 py-5 sm:px-8">
                  <Link to={`/product/${line.slug}`} onClick={close} className="w-24 shrink-0 overflow-hidden bg-ash">
                    {line.image && <img src={line.image} alt="" className="aspect-[4/5] w-full object-cover transition-transform duration-700 hover:scale-105" />}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <Link to={`/product/${line.slug}`} onClick={close} className="font-display text-xl leading-tight text-ink hover:text-accent">{line.name}</Link>
                      <span className="tabular-nums text-[13px] text-ink">{money(line.line_total)}</span>
                    </div>
                    <span className="mt-1 tabular-nums text-[12px] text-fog">{money(line.unit_price)} each</span>
                    {line.issue && <p className="mt-1 text-sm text-accent">{line.issue}</p>}
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <QuantityStepper size="sm" value={line.quantity} max={Math.max(1, line.stock)} onChange={(n) => setQuantity(line.product_id, n)} />
                      <button onClick={() => remove(line.product_id)} className="link-draw text-[13px] text-fog hover:text-ink">Remove</button>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </>
      )}
    </Drawer>
  )
}
