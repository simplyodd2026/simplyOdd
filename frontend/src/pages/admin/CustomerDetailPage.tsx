import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CustomerRow, Order, UserProfile } from '@/lib/types'
import { useDocumentTitle } from '@/lib/hooks'
import { ORDER_STATUS_LABEL, date, money } from '@/lib/format'
import { AdminHeader, Stat, Table, td } from '@/features/admin/ui'
import { PageSpinner } from '@/components/ui/Spinner'
import { StatusPill } from '@/components/ui/misc'

export default function CustomerDetailPage() {
  const { uid = '' } = useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'customer', uid],
    queryFn: () => api<{ profile: UserProfile; orders: Order[]; wishlist_count: number; summary: CustomerRow | null }>(`/admin/customers/${uid}`),
  })
  useDocumentTitle(data?.profile.name || 'Customer')
  if (isLoading || !data) return <PageSpinner />
  const { profile, orders, wishlist_count, summary } = data
  return (
    <div>
      <Link to="/admin/customers" className="text-sm text-fog hover:text-ink">All customers</Link>
      <AdminHeader title={profile.name || profile.email} sub={<>{profile.email}{profile.phone && `, ${profile.phone}`}. Joined {date(profile.created_at)}</>} />
      <div className="mb-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
        <Stat label="Orders" value={orders.length} />
        <Stat label="Total spent" value={money(summary?.total_spent ?? 0)} />
        <Stat label="Saved to wishlist" value={wishlist_count} />
        <Stat label="Addresses" value={profile.addresses.length} />
      </div>
      <div className="grid gap-10 xl:grid-cols-12 [&>*]:min-w-0">
        <section className="xl:col-span-8">
          <h2 className="mb-4 text-lg font-semibold">Orders</h2>
          {orders.length ? (
            <Table head={['Order', 'Date', 'Status', 'Total']}>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className={td}><Link to={`/admin/orders/${o.id}`} className="font-medium hover:text-accent">{o.number}</Link></td>
                  <td className={`${td} text-smoke`}>{date(o.created_at)}</td>
                  <td className={td}><StatusPill status={o.status} label={ORDER_STATUS_LABEL[o.status]} /></td>
                  <td className={`${td} tabular-nums`}>{money(o.total)}</td>
                </tr>
              ))}
            </Table>
          ) : <p className="text-smoke">No orders yet.</p>}
        </section>
        <section className="xl:col-span-4">
          <h2 className="mb-4 text-lg font-semibold">Addresses</h2>
          <div className="flex flex-col gap-3">
            {profile.addresses.map((a) => (
              <div key={a.id} className="border border-rule p-4 text-sm leading-relaxed">
                <p className="font-medium">{a.label}{a.is_default && <span className="ml-2 text-accent">Default</span>}</p>
                <p className="text-smoke">{a.full_name}<br />{a.line1}{a.line2 && `, ${a.line2}`}<br />{a.city}, {a.state} {a.postal_code}<br />{a.phone}</p>
              </div>
            ))}
            {!profile.addresses.length && <p className="text-smoke">No saved addresses.</p>}
          </div>
        </section>
      </div>
    </div>
  )
}
