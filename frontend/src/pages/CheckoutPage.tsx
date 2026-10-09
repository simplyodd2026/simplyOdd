import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { refreshProfile, useConfig, useQuote } from '@/lib/queries'
import type { AddressInput, CheckoutResponse, Order, PaymentPlan, ShippingAddress } from '@/lib/types'
import { useCart } from '@/stores/cart'
import { useSession } from '@/stores/session'
import { toastError } from '@/stores/toast'
import { money } from '@/lib/format'
import { useDocumentTitle } from '@/lib/hooks'
import { cn } from '@/lib/cn'
import { Container } from '@/components/layout/Container'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Checkbox, Input } from '@/components/ui/Field'
import { EmptyState, Skeleton } from '@/components/ui/misc'
import { Icon } from '@/components/ui/Icon'
import { Barcode, ReceiptCoupon, ReceiptLines, ReceiptPaper, Tear } from '@/features/checkout/Receipt'
import { AddressFields, emptyAddress, validateAddress, type AddressErrors } from '@/features/account/AddressForm'
import { getAdapter, PaymentCancelled } from '@/features/payments'

type Step = 'address' | 'shipping' | 'payment'
const STEPS: { id: Step; label: string }[] = [
  { id: 'address', label: 'Address' },
  { id: 'shipping', label: 'Delivery' },
  { id: 'payment', label: 'Payment' },
]

export default function CheckoutPage() {
  useDocumentTitle('Checkout')
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user, profile } = useSession()
  const cart = useCart()
  const { data: quote, isLoading } = useQuote(cart.items, cart.couponCode, cart.shippingMethod)
  const { data: config } = useConfig()

  const [step, setStep] = useState<Step>('address')
  const saved = profile?.addresses ?? []
  const [addressId, setAddressId] = useState<string | 'new'>('new')
  const [draft, setDraft] = useState<AddressInput>(emptyAddress(user?.name ?? ''))
  const [email, setEmail] = useState(user?.email ?? '')
  const [saveAddress, setSaveAddress] = useState(true)
  const [errors, setErrors] = useState<AddressErrors>({})
  const [plan, setPlan] = useState<PaymentPlan>('full')
  const [provider, setProvider] = useState<string>('')
  const [panelState, setPanelState] = useState<unknown>(undefined)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<Order | null>(null)
  const [payError, setPayError] = useState<string | null>(null)

  useEffect(() => {
    if (saved.length && addressId === 'new' && !draft.line1) setAddressId((saved.find((a) => a.is_default) ?? saved[0]).id)
  }, [saved.length]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!provider && config?.payment_providers.length) {
      const first = config.payment_providers[0].id
      setProvider(first)
      setPanelState(getAdapter(first)?.initialState)
    }
  }, [config, provider])

  const address: ShippingAddress | null = useMemo(() => {
    const a = addressId === 'new' ? draft : saved.find((x) => x.id === addressId)
    if (!a) return null
    const { full_name, phone, line1, line2, city, state, postal_code, country } = a
    return { full_name, phone, line1, line2, city, state, postal_code, country, email }
  }, [addressId, draft, saved, email])

  if (!cart.items.length && !pending) {
    return (
      <Container className="pt-16">
        <EmptyState title="Your bag is empty." body="Add something strange before checking out." action={<ButtonLink to="/shop" variant="light">Browse the shop</ButtonLink>} />
      </Container>
    )
  }

  const continueFromAddress = async () => {
    const errs: AddressErrors = addressId === 'new' ? validateAddress({ ...draft, email }, true)
      : /^\S+@\S+\.\S+$/.test(email) ? {} : { email: 'Enter an email for order updates' }
    setErrors(errs)
    if (Object.keys(errs).length) return
    if (addressId === 'new' && saveAddress) {
      try {
        const list = await api<{ id: string }[]>('/me/addresses', { body: { ...draft, is_default: saved.length === 0 } })
        await refreshProfile()
        setAddressId(list[list.length - 1].id)
      } catch (e) {
        toastError(e)
        return
      }
    }
    setStep('shipping')
  }

  const finish = async (order: Order, payment: Record<string, unknown>) => {
    const adapter = getAdapter(order.payment.provider)
    if (order.status !== 'pending') {
      return done(order)
    }
    if (!adapter) throw new Error('This payment method isn’t available in this version of the site. Refresh and try again.')
    const payload = await adapter.collect(payment, panelState)
    const confirmed = await api<Order>(`/orders/${order.id}/payment/confirm`, { body: { payload } })
    done(confirmed)
  }

  const done = (order: Order) => {
    cart.clear()
    qc.invalidateQueries({ queryKey: ['my-orders'] })
    qc.invalidateQueries({ queryKey: ['products'] })
    navigate(`/order/${order.id}`, { replace: true })
  }

  const placeOrder = async () => {
    if (!address) return
    setBusy(true)
    setPayError(null)
    try {
      if (pending) {
        const res = await api<CheckoutResponse>(`/orders/${pending.id}/payment/restart`, { method: 'POST' })
        await finish(res.order, res.payment)
      } else {
        const res = await api<CheckoutResponse>('/checkout', {
          body: {
            items: cart.items, address, shipping_method: cart.shippingMethod, coupon_code: cart.couponCode,
            payment_provider: provider, payment_plan: plan, notes: null,
          },
        })
        setPending(res.order)
        await finish(res.order, res.payment)
      }
    } catch (e) {
      const msg = e instanceof PaymentCancelled ? e.message : e instanceof Error ? e.message : 'Payment failed. Try again.'
      setPayError(msg)
    } finally {
      setBusy(false)
    }
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step)
  const adapter = getAdapter(provider)
  const shippingOptions = quote?.shipping_options ?? []
  // What the customer pays now: the whole total, or the 50% advance on the partial plan.
  const dueNow = pending?.payment.amount ?? (quote && (plan === 'partial' ? quote.deposit : quote.total))
  const totalLabel = dueNow != null ? money(dueNow) : ''

  const receiptNo = pending?.number ?? 'Draft'
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const itemCount = cart.items.reduce((n, l) => n + l.quantity, 0)
  // A choice on the slip: dashed when open, a solid ink outline once chosen.
  const option = (active: boolean) => cn('w-full border p-4 text-left transition-colors duration-300',
    active ? 'border-ink bg-paper-2/80' : 'border-dashed border-ink/25 hover:border-ink/60')
  const tick = (active: boolean) => (
    <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border', active ? 'border-ink bg-ink text-paper' : 'border-ink/30')}>
      {active && <Icon name="check" size={11} />}
    </span>
  )

  return (
    <section className="linen bg-sand py-10 sm:py-16">
      <Container>
        <ReceiptPaper className="mx-auto max-w-[46rem]">
          {/* The shop's header, printed at the top of the slip. */}
          <header className="text-center">
            <img src="/logo-mark.png" alt="Simply Odd" className="mx-auto h-8 w-auto" />
            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.32em] text-smoke">Made-to-order objects for the home</p>
            <h1 className="mt-6 font-display text-[clamp(2.6rem,6vw,3.6rem)] leading-none text-ink">Checkout</h1>
            <p className="font-script -mt-1 text-[2.2rem] leading-none text-accent">your receipt</p>
            <dl className="mx-auto mt-7 grid max-w-md grid-cols-3 gap-3 text-[12.5px] text-fog">
              <div><dt>Receipt</dt><dd className="mt-0.5 tabular-nums text-ink">{receiptNo}</dd></div>
              <div><dt>Date</dt><dd className="mt-0.5 text-ink">{today}</dd></div>
              <div><dt>Items</dt><dd className="mt-0.5 tabular-nums text-ink">{itemCount}</dd></div>
            </dl>
          </header>

          <Tear />

          {isLoading || !quote ? <Skeleton className="h-60" /> : (
            <>
              <ReceiptLines quote={quote} />
              {quote.has_issues && (
                <p className="mt-4 text-[14px] text-accent">Some items in your bag changed. <Link to="/cart" className="underline underline-offset-4">Review your bag</Link>.</p>
              )}
              {!pending && <div className="mt-6"><ReceiptCoupon quote={quote} /></div>}
            </>
          )}

          <Tear />

          {/* The three steps, printed as a line across the slip. */}
          <ol className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[15px]" aria-label="Checkout progress">
            {STEPS.map((st, i) => (
              <li key={st.id}>
                <button disabled={i > stepIndex || !!pending} onClick={() => setStep(st.id)} aria-current={st.id === step ? 'step' : undefined}
                  className={cn('flex items-baseline gap-2 pb-1 transition-colors',
                    st.id === step ? 'border-b border-ink text-ink' : i < stepIndex ? 'text-smoke hover:text-ink' : 'text-fog')}>
                  <span className="font-odd text-accent">{['i', 'ii', 'iii'][i]}.</span>
                  {i < stepIndex ? <span className="inline-flex items-center gap-1">{st.label} <Icon name="check" size={13} /></span> : st.label}
                </button>
              </li>
            ))}
          </ol>

          <div className="mt-9">
            {step === 'address' && (
              <section className="flex flex-col gap-8">
                <div>
                  <h2 className="mb-4 font-display text-[1.6rem] text-ink">Contact</h2>
                  <Input label="Email for order updates" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
                </div>
                <div>
                  <h2 className="mb-4 font-display text-[1.6rem] text-ink">Deliver to</h2>
                  {saved.length > 0 && (
                    <div className="mb-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Saved addresses">
                      {saved.map((a) => (
                        <button key={a.id} role="radio" aria-checked={addressId === a.id} onClick={() => setAddressId(a.id)} className={cn(option(addressId === a.id), 'flex gap-3 text-[14px]')}>
                          {tick(addressId === a.id)}
                          <span>
                            <span className="flex items-center gap-2 font-medium text-ink">{a.label}{a.is_default && <span className="text-[12px] font-normal text-fog">Default</span>}</span>
                            <span className="mt-1.5 block leading-relaxed text-smoke">{a.full_name}<br />{a.line1}{a.line2 && `, ${a.line2}`}<br />{a.city}, {a.state} {a.postal_code}<br />{a.phone}</span>
                          </span>
                        </button>
                      ))}
                      <button role="radio" aria-checked={addressId === 'new'} onClick={() => setAddressId('new')}
                        className={cn(option(addressId === 'new'), 'flex min-h-32 items-center justify-center gap-2 text-[14px]', addressId === 'new' ? 'text-ink' : 'text-smoke')}>
                        <Icon name="plus" size={16} /> New address
                      </button>
                    </div>
                  )}
                  {addressId === 'new' && (
                    <div className="flex flex-col gap-5">
                      <AddressFields value={draft} onChange={setDraft} errors={errors} showLabel={saveAddress} />
                      <Checkbox label="Save this address to my account" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                    </div>
                  )}
                </div>
                <Button size="lg" className="w-full" onClick={continueFromAddress}>Continue to delivery</Button>
              </section>
            )}

            {step === 'shipping' && (
              <section className="flex flex-col gap-6">
                {address && (
                  <dl className="flex flex-col gap-1.5 text-[14px]">
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-fog">Deliver to</dt>
                      <button onClick={() => setStep('address')} className="link-draw shrink-0 text-ink">Change</button>
                    </div>
                    <dd className="leading-relaxed text-graphite"><span className="text-ink">{address.full_name}</span>, {address.line1}, {address.city}, {address.state} {address.postal_code}<br />{address.email}</dd>
                  </dl>
                )}
                <h2 className="font-display text-[1.6rem] text-ink">Delivery speed</h2>
                <div className="flex flex-col gap-3" role="radiogroup" aria-label="Shipping method">
                  {shippingOptions.map((o) => (
                    <button key={o.method} role="radio" aria-checked={cart.shippingMethod === o.method} onClick={() => cart.setShipping(o.method)}
                      className={cn(option(cart.shippingMethod === o.method), 'flex items-center gap-3')}>
                      {tick(cart.shippingMethod === o.method)}
                      <span className="flex-1">
                        <span className="block text-[16px] font-medium text-ink">{o.label}</span>
                        <span className="text-[13.5px] text-smoke">{o.eta}</span>
                      </span>
                      <span className="text-[16px] tabular-nums text-ink">{o.fee === 0 ? 'Free' : money(o.fee)}</span>
                    </button>
                  ))}
                </div>
                <Button size="lg" className="w-full" onClick={() => setStep('payment')}>Continue to payment</Button>
              </section>
            )}

            {step === 'payment' && (
              <section className="flex flex-col gap-6">
                <h2 className="font-display text-[1.6rem] text-ink">Payment</h2>
                {pending && (
                  <p className="border border-dashed border-accent/60 p-4 text-[14px] text-graphite">
                    Order {pending.number} is saved and waiting for payment. Your items are held for you.
                  </p>
                )}
                {quote && (
                  <div className="flex flex-col gap-3" role="radiogroup" aria-label="Payment plan">
                    {([
                      ['full', 'Full payment', 'Pay the whole amount now.', quote.total],
                      ['partial', 'Partial payment', `Pay 50% now and ${money(quote.total - quote.deposit)} when your order is delivered.`, quote.deposit],
                    ] as const).map(([id, label, note, amount]) => {
                      const active = (pending?.payment.plan ?? plan) === id
                      return (
                        <button key={id} role="radio" aria-checked={active} disabled={!!pending && !active} onClick={() => setPlan(id)}
                          className={cn(option(active), 'flex items-center gap-3 disabled:opacity-40')}>
                          {tick(active)}
                          <span className="flex-1">
                            <span className="block text-[16px] font-medium text-ink">{label}</span>
                            <span className="text-[13.5px] text-smoke">{note}</span>
                          </span>
                          <span className="text-[16px] tabular-nums text-ink">{money(amount)}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
                {/* With a single gateway there's nothing to choose, so the plan is the only choice shown. */}
                {(config?.payment_providers.length ?? 0) > 1 && (
                  <>
                  <h3 className="mt-2 text-[15px] font-medium text-ink">Pay with</h3>
                  <div className="flex flex-col gap-3" role="radiogroup" aria-label="Payment method">
                    {config?.payment_providers.map((pr) => {
                      const a = getAdapter(pr.id)
                      const active = provider === pr.id
                      const Panel = a?.Panel
                      return (
                        <div key={pr.id} className={option(active)}>
                          <button role="radio" aria-checked={active} disabled={!!pending && pending.payment.provider !== pr.id}
                            onClick={() => { setProvider(pr.id); setPanelState(a?.initialState) }}
                            className="flex w-full items-start gap-3 text-left disabled:opacity-40">
                            {tick(active)}
                            <span>
                              <span className="block text-[16px] font-medium text-ink">{pr.label}</span>
                              <span className="text-[13.5px] text-smoke">{pr.description}</span>
                            </span>
                          </button>
                          {active && Panel && <Panel value={panelState} onChange={setPanelState} />}
                        </div>
                      )
                    })}
                  </div>
                  </>
                )}
                {payError && <p className="border-l-2 border-accent pl-4 text-accent" role="alert">{payError}</p>}
                <Button size="lg" variant="terra" className="w-full" loading={busy} disabled={!provider || !quote || quote.has_issues} onClick={placeOrder}>
                  {pending ? `Try payment again` : adapter?.cta?.(totalLabel) ?? `Pay ${totalLabel}`}
                </Button>
              </section>
            )}
          </div>

          <Tear />

          {/* The foot of the slip: a barcode, the number again and a note of thanks. */}
          <footer className="text-center">
            <Barcode value={`${receiptNo}${cart.items.map((l) => l.product_id).join('')}`} className="mx-auto h-11 w-56 text-ink/80" />
            <p className="mt-2 text-[11px] uppercase tracking-[0.32em] text-fog">{receiptNo}</p>
            <p className="font-script mt-5 text-[2.3rem] leading-none text-ink">thank you for shopping odd</p>
            <p className="mt-4 text-[13px] leading-relaxed text-fog">
              Made to order and finished by hand. By placing your order you agree to our <Link to="/help/returns" className="underline underline-offset-4 hover:text-ink">returns policy</Link>.
            </p>
          </footer>
        </ReceiptPaper>

        <p className="mt-8 text-center text-[14px]"><Link to="/cart" className="link-draw text-ink">Back to your bag</Link></p>
      </Container>
    </section>
  )
}
