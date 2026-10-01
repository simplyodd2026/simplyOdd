import { Link } from 'react-router-dom'
import { useMyOrders } from '@/lib/queries'
import { useDocumentTitle } from '@/lib/hooks'
import { ORDER_STATUS_LABEL, date, money, plural } from '@/lib/format'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, Skeleton, StatusPill } from '@/components/ui/misc'

export default function OrdersPage() {
  useDocumentTitle('Your orders')
  const { data: orders, isLoading } = useMyOrders()
  if (isLoading) return <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
  if (!orders?.length) {
    return <EmptyState title="No orders yet." body="When you order something, you'll be able to track it here." action={<ButtonLink to="/shop" variant="light">Browse the shop</ButtonLink>} />
  }
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {orders.map((o) => (
        <li key={o.id}>
          <Link to={`/account/orders/${o.id}`} className="group grid gap-4 py-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xl font-bold w-semi group-hover:text-accent">{o.number}</span>
                <StatusPill status={o.status} label={ORDER_STATUS_LABEL[o.status]} />
              </div>
              <p className="text-sm text-smoke">{date(o.created_at)}, {plural(o.items.reduce((n, i) => n + i.quantity, 0), 'item')}</p>
              <div className="flex gap-2">
                {o.items.slice(0, 5).map((i) => (
                  <img key={i.product_id} src={i.image ?? ''} alt={i.name} title={i.name} className="aspect-[4/5] w-12 bg-ash object-cover" />
                ))}
              </div>
            </div>
            <span className="text-xl font-semibold tabular-nums">{money(o.total)}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
