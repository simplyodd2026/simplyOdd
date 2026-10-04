import { useState, type ReactNode } from 'react'
import type { Quote } from '@/lib/types'
import { useCart } from '@/stores/cart'
import { money } from '@/lib/format'
import { cn } from '@/lib/cn'

const TEETH = 46
const DEPTH = '9px'

/** A zig-zag top and bottom edge, like a slip torn from a till roll, as one polygon so it clips cleanly. */
function zigzag() {
  const top: string[] = []
  const bottom: string[] = []
  for (let i = 0; i <= TEETH; i++) {
    const x = `${((i / TEETH) * 100).toFixed(3)}%`
    top.push(`${x} ${i % 2 ? DEPTH : '0'}`)
    bottom.push(`${x} ${i % 2 ? `calc(100% - ${DEPTH})` : '100%'}`)
  }
  return `polygon(${[...top, ...bottom.reverse()].join(', ')})`
}
const EDGE = zigzag()

/** The receipt itself: a narrow slip of warm paper with torn edges and a soft shadow underneath. */
export function ReceiptPaper({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('drop-shadow-[0_24px_30px_rgb(66_44_28/0.22)]', className)}>
      <div className="grain bg-[#FBF9F5] px-6 pb-14 pt-14 sm:px-12" style={{ clipPath: EDGE }}>{children}</div>
    </div>
  )
}

/** A dashed rule across the slip, the way a till prints a separator. */
export function Tear({ className }: { className?: string }) {
  return <hr aria-hidden className={cn('my-7 border-0 border-t border-dashed border-ink/25', className)} />
}

/** A receipt line: label on the left, value on the right, joined by a row of dots. */
export function Leader({ label, value, strong, accent }: { label: ReactNode; value: ReactNode; strong?: boolean; accent?: boolean }) {
  return (
    <div className={cn('flex items-baseline gap-2 tabular-nums', strong ? 'text-[17px] text-ink' : 'text-[15px] text-graphite')}>
      <dt className="shrink-0">{label}</dt>
      <span aria-hidden className="mb-1 min-w-4 flex-1 border-b border-dotted border-ink/30" />
      <dd className={cn('shrink-0', accent && 'text-accent')}>{value}</dd>
    </div>
  )
}

/** The items and the money: one line per piece, then subtotal, discount, shipping, GST and the total. */
export function ReceiptLines({ quote }: { quote: Quote }) {
  return (
    <>
      <ul className="flex flex-col gap-4">
        {quote.lines.filter((l) => l.available).map((l) => (
          <li key={l.product_id} className="flex items-center gap-3">
            <span className="plate size-10 shrink-0 overflow-hidden bg-ash">{l.image && <img src={l.image} alt="" className="size-full object-cover" />}</span>
            <dl className="min-w-0 flex-1">
              <Leader label={<><span className="text-fog">{l.quantity} ×</span> <span className="font-display text-[1.15rem] text-ink">{l.name}</span></>}
                value={money(l.line_total)} />
              {l.quantity > 1 && <p className="mt-0.5 text-[12.5px] text-fog">{money(l.unit_price)} each</p>}
            </dl>
          </li>
        ))}
      </ul>
      <Tear />
      <dl className="flex flex-col gap-2.5">
        <Leader label="Subtotal" value={money(quote.subtotal)} />
        {quote.discount > 0 && <Leader label={`Discount${quote.coupon_code ? ` (${quote.coupon_code})` : ''}`} value={`−${money(quote.discount)}`} accent />}
        <Leader label="Shipping" value={quote.shipping === 0 ? 'Free' : money(quote.shipping)} />
        <Leader label={`GST${quote.tax_rate ? ` (${Math.round(quote.tax_rate * 100)}%)` : ''}`} value={money(quote.tax)} />
      </dl>
      {/* The total sits between two rules, the way a till marks the amount due. */}
      <div className="mt-6 border-y-[3px] border-double border-ink/40 py-4">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-display text-[1.6rem] text-ink">Total</span>
          <span className="font-display text-[clamp(1.9rem,4vw,2.4rem)] leading-none tabular-nums text-ink">{money(quote.total)}</span>
        </div>
        <p className="mt-1 text-right text-[12.5px] text-fog">Includes GST, in Indian rupees</p>
      </div>
    </>
  )
}

/** The discount code, written on the slip: a single underlined line with Apply beside it. */
export function ReceiptCoupon({ quote }: { quote: Quote }) {
  const { couponCode, setCoupon } = useCart()
  const [draft, setDraft] = useState('')
  if (couponCode && quote.coupon_code) {
    return (
      <p className="flex items-baseline justify-between gap-4 text-[14px]">
        <span><span className="font-medium text-ink">{quote.coupon_code}</span> <span className="text-smoke">applied</span></span>
        <button onClick={() => setCoupon(null)} className="link-draw text-smoke hover:text-ink">Remove</button>
      </p>
    )
  }
  return (
    <div>
      <form className="flex items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) setCoupon(draft.trim().toUpperCase()) }}>
        <label htmlFor="receipt-coupon" className="sr-only">Discount code</label>
        <input id="receipt-coupon" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Have a discount code?"
          className="h-10 flex-1 border-b border-dashed border-ink/30 bg-transparent text-[15px] uppercase tracking-wide outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-fog focus:border-ink" />
        <button type="submit" className="link-draw pb-2 text-[14px] font-medium text-ink">Apply</button>
      </form>
      {couponCode && !quote.coupon_code && quote.coupon_message && <p className="mt-2 text-[13px] text-accent">{quote.coupon_message}</p>}
    </div>
  )
}

/** A decorative barcode drawn from the order's own text, so it differs from receipt to receipt. */
export function Barcode({ value, className }: { value: string; className?: string }) {
  let h = 2166136261
  const bars: { x: number; w: number }[] = []
  let x = 0
  for (let i = 0; x < 236; i++) {
    h = Math.imul(h ^ value.charCodeAt(i % Math.max(1, value.length)) ^ i, 16777619) >>> 0
    const w = 1 + (h % 3)
    if (i % 2 === 0) bars.push({ x, w })
    x += w + 1 + ((h >> 4) % 2)
  }
  return (
    <svg viewBox="0 0 240 44" className={className} aria-hidden="true">
      {bars.map((b, i) => <rect key={i} x={b.x} y="0" width={b.w} height="44" fill="currentColor" />)}
    </svg>
  )
}
