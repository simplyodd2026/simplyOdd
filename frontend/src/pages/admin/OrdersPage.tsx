import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api, qs } from '@/lib/api'
import type { Order } from '@/lib/types'
import { useDebounced, useDocumentTitle } from '@/lib/hooks'
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, dateTime, money } from '@/lib/format'
import { AdminHeader, FilterSelect, SearchInput, Table, td } from '@/features/admin/ui'
import { Skeleton, StatusPill } from '@/components/ui/misc'
import { useState } from 'react'

export default function OrdersPage() {
  useDocumentTitle('Orders')
  const [sp, setSp] = useSearchParams()
  const [q, setQ] = useState(sp.get('q') ?? '')
  const status = sp.get('status') ?? ''
  const payment = sp.get('payment') ?? ''
  const dq = useDebounced(q, 250)
  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin', 'orders', dq, status, payment],
    queryFn: () => api<Order[]>(`/admin/orders${qs({ q: dq, status, payment_status: payment })}`),
    placeholderData: keepPreviousData,
  })
  const setParam = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n) }

  return (
    <div>
      <AdminHeader title="Orders" sub={orders ? `${orders.length} orders` : undefined} />
      <div className="mb-5 flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Order number, name, email or phone" />
        <FilterSelect label="Order status" value={status} onChange={(v) => setParam('status', v)}
          options={[['', 'All statuses'], ...Object.entries(ORDER_STATUS_LABEL)]} />
        <FilterSelect label="Payment status" value={payment} onChange={(v) => setParam('payment', v)}
          options={[['', 'Any payment'], ...Object.entries(PAYMENT_STATUS_LABEL)]} />
      </div>
      {isLoading ? <Skeleton className="h-96" /> : !orders?.length ? (
        <p className="border-y border-rule py-12 text-center text-smoke">No orders match these filters.</p>
      ) : (
        <Table head={['Order', 'Placed', 'Customer', 'Items', 'Payment', 'Status', 'Total']}>
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-black/[0.02]">
              <td className={td}><Link to={`/admin/orders/${o.id}`} className="font-medium hover:text-accent">{o.number}</Link></td>
              <td className={`${td} whitespace-nowrap text-smoke`}>{dateTime(o.created_at)}</td>
              <td className={td}><div>{o.address.full_name}</div><div className="text-xs text-fog">{o.email}</div></td>
              <td className={`${td} tabular-nums text-smoke`}>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
              <td className={td}><StatusPill status={o.payment.status} label={PAYMENT_STATUS_LABEL[o.payment.status]} /></td>
              <td className={td}><StatusPill status={o.status} label={ORDER_STATUS_LABEL[o.status]} /></td>
              <td className={`${td} tabular-nums`}>{money(o.total)}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}
