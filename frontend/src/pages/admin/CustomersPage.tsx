import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api, qs } from '@/lib/api'
import type { CustomerRow } from '@/lib/types'
import { useDebounced, useDocumentTitle } from '@/lib/hooks'
import { date, money } from '@/lib/format'
import { AdminHeader, SearchInput, Table, td } from '@/features/admin/ui'
import { Skeleton } from '@/components/ui/misc'

export default function CustomersPage() {
  useDocumentTitle('Customers')
  const [q, setQ] = useState('')
  const dq = useDebounced(q, 250)
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'customers', dq],
    queryFn: () => api<CustomerRow[]>(`/admin/customers${qs({ q: dq })}`),
    placeholderData: keepPreviousData,
  })
  return (
    <div>
      <AdminHeader title="Customers" sub={data ? `${data.length} people` : undefined} />
      <div className="mb-5"><SearchInput value={q} onChange={setQ} placeholder="Name, email or phone" /></div>
      {isLoading ? <Skeleton className="h-96" /> : (
        <Table head={['Customer', 'Joined', 'Orders', 'Spent', 'Last order']}>
          {data?.map((c) => (
            <tr key={c.user_id} className="hover:bg-black/[0.02]">
              <td className={td}>
                <Link to={`/admin/customers/${c.user_id}`} className="font-medium hover:text-accent">{c.name || c.email}</Link>
                {c.is_admin && <span className="ml-2 text-xs text-accent">Admin</span>}
                <div className="text-xs text-fog">{c.email}</div>
              </td>
              <td className={`${td} text-smoke`}>{date(c.created_at)}</td>
              <td className={`${td} tabular-nums`}>{c.order_count}</td>
              <td className={`${td} tabular-nums`}>{money(c.total_spent)}</td>
              <td className={`${td} text-smoke`}>{c.last_order_at ? date(c.last_order_at) : '—'}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}
