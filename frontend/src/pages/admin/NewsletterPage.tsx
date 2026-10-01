import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useDocumentTitle } from '@/lib/hooks'
import { date } from '@/lib/format'
import { toastError } from '@/stores/toast'
import { AdminHeader, Table, td } from '@/features/admin/ui'
import { Button } from '@/components/ui/Button'

interface Subscriber { id: string; email: string; created_at: string }

export default function NewsletterPage() {
  useDocumentTitle('Newsletter')
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['admin', 'newsletter'], queryFn: () => api<Subscriber[]>('/admin/newsletter') })

  const exportCsv = () => {
    const csv = ['email,subscribed_at', ...(data ?? []).map((s) => `${s.email},${s.created_at}`)].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'simply-odd-subscribers.csv' })
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <AdminHeader title="Newsletter" sub={data ? `${data.length} subscribers` : undefined}
        actions={<Button variant="outline" disabled={!data?.length} onClick={exportCsv}>Export CSV</Button>} />
      <Table head={['Email', 'Subscribed', '']}>
        {data?.map((s) => (
          <tr key={s.id}>
            <td className={td}>{s.email}</td>
            <td className={`${td} text-smoke`}>{date(s.created_at)}</td>
            <td className={`${td} text-right`}>
              <button className="text-sm text-smoke underline underline-offset-4 hover:text-accent" onClick={async () => {
                try { await api(`/admin/newsletter/${s.id}`, { method: 'DELETE' }); qc.invalidateQueries({ queryKey: ['admin', 'newsletter'] }) } catch (e) { toastError(e) }
              }}>Unsubscribe</button>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
