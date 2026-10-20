import { useState } from 'react'
import type { Quote } from '@/lib/types'
import { useCart } from '@/stores/cart'
import { money } from '@/lib/format'

export function CouponField({ quote }: { quote: Quote | undefined }) {
  const { couponCode, couponAmount, setCoupon, setCouponAmount } = useCart()
  const [draft, setDraft] = useState('')
  const [amount, setAmount] = useState('')
  if (couponCode && quote?.coupon_code && quote.coupon_amount != null) {
    return (
      <div className="flex items-center justify-between gap-3 border border-rule px-3 py-2.5 text-sm">
        <span><span className="font-semibold">{quote.coupon_code}</span> <span className="text-smoke">paying {money(quote.coupon_amount)}</span></span>
        <span className="flex gap-3">
          <button onClick={() => { setAmount(String(couponAmount ?? '')); setCouponAmount(null) }} className="text-smoke underline underline-offset-4 hover:text-ink">Change</button>
          <button onClick={() => setCoupon(null)} className="text-smoke underline underline-offset-4 hover:text-ink">Remove</button>
        </span>
      </div>
    )
  }
  if (couponCode && quote?.coupon_needs_amount) {
    return (
      <div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = Number(amount); if (v > 0) setCouponAmount(v) }}>
          <label htmlFor="coupon-amount" className="sr-only">Amount to pay with {couponCode}</label>
          <input id="coupon-amount" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" autoFocus
            placeholder={`Amount to pay with ${couponCode}`}
            className="h-11 min-w-0 flex-1 rounded-xl border border-rule bg-transparent px-3 tabular-nums outline-none placeholder:text-fog focus:border-accent" />
          <button type="submit" className="h-11 border border-rule px-4 text-sm hover:border-accent">Apply</button>
        </form>
        <p className="mt-2 flex justify-between gap-3 text-sm">
          <span className={couponAmount ? 'text-accent' : 'text-smoke'}>{quote.coupon_message}</span>
          <button onClick={() => setCoupon(null)} className="text-smoke underline underline-offset-4 hover:text-ink">Remove</button>
        </p>
      </div>
    )
  }
  if (couponCode && quote?.coupon_code) {
    return (
      <div className="flex items-center justify-between border border-rule px-3 py-2.5 text-sm">
        <span><span className="font-semibold">{quote.coupon_code}</span> <span className="text-smoke">{quote.coupon_message?.replace(`${quote.coupon_code} applied`, 'applied').replace(/^applied: /, '')}</span></span>
        <button onClick={() => setCoupon(null)} className="text-smoke underline underline-offset-4 hover:text-ink">Remove</button>
      </div>
    )
  }
  return (
    <div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) setCoupon(draft.trim().toUpperCase()) }}>
        <label htmlFor="coupon" className="sr-only">Discount code</label>
        <input id="coupon" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Discount code"
          className="h-11 flex-1 rounded-xl border border-rule bg-transparent px-3 uppercase outline-none placeholder:normal-case placeholder:text-fog focus:border-accent" />
        <button type="submit" className="h-11 border border-rule px-4 text-sm hover:border-accent">Apply</button>
      </form>
      {couponCode && quote && !quote.coupon_code && quote.coupon_message && (
        <p className="mt-2 text-sm text-accent">{quote.coupon_message}</p>
      )}
    </div>
  )
}
