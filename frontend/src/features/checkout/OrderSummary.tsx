import type { Quote } from '@/lib/types'
import { money } from '@/lib/format'
import { cn } from '@/lib/cn'
import { ColorTag } from '@/components/product/ColorSwatches'
import { responsive } from '@/lib/image'

export function Totals({ quote, className }: { quote: Pick<Quote, 'subtotal' | 'discount' | 'shipping' | 'total' | 'coupon_code'>; className?: string }) {
  const row = 'flex justify-between gap-4 tabular-nums'
  return (
    <dl className={cn('flex flex-col gap-2.5 text-[15px]', className)}>
      <div className={row}><dt className="text-smoke">Subtotal</dt><dd>{money(quote.subtotal)}</dd></div>
      {quote.discount > 0 && <div className={row}><dt className="text-smoke">Discount{quote.coupon_code ? ` (${quote.coupon_code})` : ''}</dt><dd className="text-accent">−{money(quote.discount)}</dd></div>}
      <div className={row}><dt className="text-smoke">Shipping</dt><dd>{quote.shipping === 0 ? 'Free' : money(quote.shipping)}</dd></div>
      <div className={cn(row, 'mt-2 border-t border-rule pt-4 text-lg font-semibold')}><dt>Total</dt><dd>{money(quote.total)}</dd></div>
    </dl>
  )
}

export function OrderSummary({ quote }: { quote: Quote }) {
  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-4">
        {quote.lines.filter((l) => l.available).map((l) => (
          <li key={`${l.product_id}:${l.color ?? ''}`} className="flex items-center gap-4">
            <div className="relative w-16 shrink-0 bg-ash">
              {l.image && <img {...responsive(l.image, '128px')} alt="" className="aspect-[4/5] w-full object-cover" />}
              <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-accent text-[11px] font-semibold tabular-nums text-paper">{l.quantity}</span>
            </div>
            <span className="flex flex-1 flex-col gap-1">
              <span className="font-medium leading-tight">{l.name}</span>
              {l.filament && <ColorTag filament={l.filament} className="text-[13px] text-smoke" />}
            </span>
            <span className="tabular-nums">{money(l.line_total)}</span>
          </li>
        ))}
      </ul>
      <Totals quote={quote} />
    </div>
  )
}
