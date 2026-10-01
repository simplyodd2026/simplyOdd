import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Dashboard } from '@/lib/types'
import { useDocumentTitle } from '@/lib/hooks'
import { ORDER_STATUS_LABEL, date, money } from '@/lib/format'
import { AdminHeader, Stat, Table, td } from '@/features/admin/ui'
import { RevenueChart } from '@/features/admin/RevenueChart'
import { PageSpinner } from '@/components/ui/Spinner'
import { StatusPill } from '@/components/ui/misc'

export default function DashboardPage() {
  useDocumentTitle('Admin')
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: () => api<Dashboard>('/admin/dashboard?days=30') })
  if (isLoading || !data) return <PageSpinner />
  return (
    <div className="flex flex-col gap-12">
      <AdminHeader title="Overview" sub="Last 30 days" />
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-5">
        <Stat label="Revenue" value={money(data.revenue)} />
        <Stat label="Orders" value={data.orders} />
        <Stat label="Average order" value={money(data.average_order_value)} />
        <Stat label="To fulfil" value={<Link to="/admin/orders?status=confirmed" className="hover:text-accent">{data.to_fulfil}</Link>} note="Confirmed or being made" />
        <Stat label="Customers" value={data.customers} note="All time" />
      </div>

      <RevenueChart series={data.revenue_series} />

      <div className="grid gap-12 xl:grid-cols-2 [&>*]:min-w-0">
        <section>
          <div className="mb-4 flex items-baseline justify-between"><h2 className="text-lg font-semibold">Recent orders</h2><Link to="/admin/orders" className="text-sm text-smoke underline underline-offset-4 hover:text-ink">All orders</Link></div>
          <Table head={['Order', 'Customer', 'Date', 'Status', 'Total']}>
            {data.recent_orders.map((o) => (
              <tr key={o.id} className="hover:bg-black/[0.02]">
                <td className={td}><Link to={`/admin/orders/${o.id}`} className="font-medium hover:text-accent">{o.number}</Link></td>
                <td className={`${td} text-smoke`}>{o.email}</td>
                <td className={`${td} text-smoke`}>{date(o.created_at, { day: 'numeric', month: 'short' })}</td>
                <td className={td}><StatusPill status={o.status} label={ORDER_STATUS_LABEL[o.status]} /></td>
                <td className={`${td} tabular-nums`}>{money(o.total)}</td>
              </tr>
            ))}
          </Table>
        </section>
        <div className="flex flex-col gap-12">
          <section>
            <h2 className="mb-4 text-lg font-semibold">Top products</h2>
            {data.top_products.length ? (
              <Table head={['Product', 'Units', 'Revenue']}>
                {data.top_products.map((p) => (
                  <tr key={p.product_id}>
                    <td className={td}><Link to={`/admin/products/${p.product_id}`} className="hover:text-accent">{p.name}</Link></td>
                    <td className={`${td} tabular-nums`}>{p.units}</td>
                    <td className={`${td} tabular-nums`}>{money(p.revenue)}</td>
                  </tr>
                ))}
              </Table>
            ) : <p className="text-smoke">No sales in this period yet.</p>}
          </section>
          <section>
            <h2 className="mb-4 text-lg font-semibold">Low stock</h2>
            {data.low_stock.length ? (
              <ul className="divide-y divide-rule border-y border-rule">
                {data.low_stock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-3 text-sm">
                    <Link to={`/admin/products/${p.id}`} className="hover:text-accent">{p.name}</Link>
                    <span className={p.stock === 0 ? 'text-accent' : 'text-smoke'}>{p.stock === 0 ? 'Sold out' : `${p.stock} left`}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-smoke">Everything is well stocked.</p>}
          </section>
        </div>
      </div>
    </div>
  )
}
