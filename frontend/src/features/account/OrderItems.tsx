import { Link } from 'react-router-dom'
import type { Order } from '@/lib/types'
import { money } from '@/lib/format'
import { Totals } from '@/features/checkout/OrderSummary'

export function OrderItems({ order, linkProducts = true }: { order: Order; linkProducts?: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <ul className="divide-y divide-rule border-y border-rule">
        {order.items.map((it) => (
          <li key={it.product_id} className="flex items-center gap-4 py-4">
            <div className="w-16 shrink-0 bg-ash">{it.image && <img src={it.image} alt="" className="aspect-[4/5] w-full object-cover" />}</div>
            <div className="flex-1">
              {linkProducts ? <Link to={`/product/${it.slug}`} className="font-semibold hover:text-accent">{it.name}</Link> : <span className="font-semibold">{it.name}</span>}
              <p className="text-sm tabular-nums text-smoke">{it.quantity} × {money(it.unit_price)}</p>
            </div>
            <span className="tabular-nums">{money(it.line_total)}</span>
          </li>
        ))}
      </ul>
      <Totals quote={order} />
    </div>
  )
}
