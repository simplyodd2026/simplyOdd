import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { refreshProfile, useConfig, useQuote } from '@/lib/queries'
import type { AddressInput, CheckoutResponse, Order, ShippingAddress } from '@/lib/types'
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
import { OrderSummary } from '@/features/checkout/OrderSummary'
import { CouponField } from '@/features/checkout/CouponField'
import { AddressFields, emptyAddress, validateAddress, type AddressErrors } from '@/features/account/AddressForm'
import { getAdapter, PaymentCancelled } from '@/features/payments'

type Step = 'address' | 'shipping' | 'payment'
const STEPS: { id: Step; label: string }[] = [
  { id: 'address', label: 'Address' },
  { id: 'shipping', label: 'Shipping' },
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
            payment_provider: provider, notes: null,
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
  const totalLabel = quote ? money(pending?.total ?? quote.total) : ''

  return (
    <Container className="pt-8 sm:pt-12">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <h1 className="text-[length:var(--text-title)] font-display leading-[0.95]">Checkout</h1>
        <ol className="flex items-center gap-2 text-sm sm:gap-4" aria-label="Checkout progress">
          <li><Link to="/cart" className="text-fog hover:text-ink">Bag</Link></li>
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2 sm:gap-4">
              <span className="h-px w-4 bg-rule sm:w-8" aria-hidden />
              <button disabled={i > stepIndex || !!pending} onClick={() => setStep(s.id)} aria-current={s.id === step ? 'step' : undefined}
                className={cn('flex items-center gap-2', s.id === step ? 'text-ink' : i < stepIndex ? 'text-smoke hover:text-ink' : 'text-fog')}>
                <span className={cn('grid size-6 place-items-center rounded-full border text-xs tabular-nums',
                  s.id === step ? 'border-accent bg-accent text-paper' : i < stepIndex ? 'border-graphite/40' : 'border-rule')}>
                  {i < stepIndex ? <Icon name="check" size={12} /> : i + 1}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {step === 'address' && (
            <section className="flex flex-col gap-8">
              <div>
                <h2 className="mb-4 text-2xl font-display">Contact</h2>
                <Input label="Email for order updates" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
              </div>
              <div>
                <h2 className="mb-4 text-2xl font-display">Deliver to</h2>
                {saved.length > 0 && (
                  <div className="mb-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Saved addresses">
                    {saved.map((a) => (
                      <button key={a.id} role="radio" aria-checked={addressId === a.id} onClick={() => setAddressId(a.id)}
                        className={cn('border p-4 text-left text-sm transition-colors', addressId === a.id ? 'border-accent bg-accent/5' : 'border-rule hover:border-graphite/40')}>
                        <span className="flex items-center justify-between font-semibold text-ink">{a.label}{a.is_default && <span className="text-xs font-normal text-fog">Default</span>}</span>
                        <span className="mt-2 block leading-relaxed text-smoke">{a.full_name}<br />{a.line1}{a.line2 && `, ${a.line2}`}<br />{a.city}, {a.state} {a.postal_code}<br />{a.phone}</span>
                      </button>
                    ))}
                    <button role="radio" aria-checked={addressId === 'new'} onClick={() => setAddressId('new')}
                      className={cn('flex min-h-32 items-center justify-center gap-2 border border-dashed p-4 text-sm', addressId === 'new' ? 'border-accent text-ink' : 'border-rule text-smoke hover:text-ink')}>
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
              <Button size="lg" className="self-start" onClick={continueFromAddress}>Continue to shipping</Button>
            </section>
          )}

          {step === 'shipping' && (
            <section className="flex flex-col gap-6">
              {address && (
                <div className="flex items-start justify-between gap-4 border border-rule p-4 text-sm">
                  <p className="leading-relaxed text-smoke"><span className="text-ink">{address.full_name}</span>, {address.line1}, {address.city}, {address.state} {address.postal_code}<br />{address.email}</p>
                  <button onClick={() => setStep('address')} className="shrink-0 text-ink underline underline-offset-4">Change</button>
                </div>
              )}
              <h2 className="text-2xl font-display">Delivery speed</h2>
              <div className="flex flex-col gap-3" role="radiogroup" aria-label="Shipping method">
                {shippingOptions.map((o) => (
                  <button key={o.method} role="radio" aria-checked={cart.shippingMethod === o.method} onClick={() => cart.setShipping(o.method)}
                    className={cn('flex items-center justify-between gap-4 border p-5 text-left transition-colors',
                      cart.shippingMethod === o.method ? 'border-accent bg-accent/5' : 'border-rule hover:border-graphite/40')}>
                    <span>
                      <span className="block text-lg font-semibold">{o.label}</span>
                      <span className="text-sm text-smoke">{o.eta}</span>
                    </span>
                    <span className="text-lg tabular-nums">{o.fee === 0 ? 'Free' : money(o.fee)}</span>
                  </button>
                ))}
              </div>
              <Button size="lg" className="self-start" onClick={() => setStep('payment')}>Continue to payment</Button>
            </section>
          )}

          {step === 'payment' && (
            <section className="flex flex-col gap-6">
              <h2 className="text-2xl font-display">Payment</h2>
              {pending && (
                <p className="border border-accent/50 p-4 text-sm">
                  Order {pending.number} is saved and waiting for payment. Your items are held for you.
                </p>
              )}
              <div className="flex flex-col gap-3" role="radiogroup" aria-label="Payment method">
                {config?.payment_providers.map((p) => {
                  const a = getAdapter(p.id)
                  const active = provider === p.id
                  const Panel = a?.Panel
                  return (
                    <div key={p.id} className={cn('border p-5 transition-colors', active ? 'border-accent bg-accent/5' : 'border-rule')}>
                      <button role="radio" aria-checked={active} disabled={!!pending && pending.payment.provider !== p.id}
                        onClick={() => { setProvider(p.id); setPanelState(a?.initialState) }}
                        className="flex w-full items-center gap-3 text-left disabled:opacity-40">
                        <span className={cn('grid size-5 place-items-center rounded-full border', active ? 'border-accent' : 'border-fog')}>
                          {active && <span className="size-2.5 rounded-full bg-accent" />}
                        </span>
                        <span>
                          <span className="block font-semibold">{p.label}</span>
                          <span className="text-sm text-smoke">{p.description}</span>
                        </span>
                      </button>
                      {active && Panel && <Panel value={panelState} onChange={setPanelState} />}
                    </div>
                  )
                })}
              </div>
              {payError && <p className="border-l-2 border-accent pl-4 text-accent" role="alert">{payError}</p>}
              <Button size="lg" className="self-start" loading={busy} disabled={!provider || !quote || quote.has_issues} onClick={placeOrder}>
                {pending ? `Try payment again` : adapter?.cta?.(totalLabel) ?? `Pay ${totalLabel}`}
              </Button>
              <p className="text-sm text-fog">By placing your order you agree to our <Link to="/help/returns" className="underline underline-offset-4">returns policy</Link>.</p>
            </section>
          )}
        </div>

        <aside className="lg:col-span-5">
          <div className="flex flex-col gap-6 border border-rule bg-paper-2 p-6 lg:sticky lg:top-24">
            <h2 className="text-2xl font-display">Order summary</h2>
            {isLoading || !quote ? <Skeleton className="h-60" /> : (
              <>
                <OrderSummary quote={quote} />
                {!pending && <CouponField quote={quote} />}
                {quote.has_issues && (
                  <p className="text-sm text-accent">Some items in your bag changed. <Link to="/cart" className="underline">Review your bag</Link>.</p>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </Container>
  )
}
