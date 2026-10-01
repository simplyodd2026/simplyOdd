import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useDocumentTitle } from '@/lib/hooks'
import { dateTime } from '@/lib/format'
import { toastError } from '@/stores/toast'
import { AdminHeader } from '@/features/admin/ui'
import { EmptyState, StatusPill } from '@/components/ui/misc'

type Status = 'new' | 'replied' | 'closed'
interface CustomRequest {
  id: string; name: string; email: string; idea: string; kind: string; size: string; colours: string[]
  budget: string; reference_url: string | null; status: Status; created_at: string
}

const LABELS: Record<string, string> = {
  lighting: 'Lamp', decor: 'Home décor', desk: 'Desk object', gift: 'Gift', other: 'Something else',
  small: 'Small', medium: 'Medium', large: 'Large', not_sure: 'Not sure',
  under_1000: 'Under ₹1,000', '1000_2500': '₹1,000–2,500', '2500_5000': '₹2,500–5,000', '5000_plus': '₹5,000+',
}
const STATUS_LABEL: Record<Status, string> = { new: 'New', replied: 'Replied', closed: 'Closed' }
// StatusPill colours by status name; map ours onto its tones.
const PILL: Record<Status, string> = { new: 'pending', replied: 'processing', closed: 'delivered' }

export default function CustomRequestsPage() {
  useDocumentTitle('Custom requests')
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['admin', 'custom-requests'], queryFn: () => api<CustomRequest[]>('/admin/custom-requests') })
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'custom-requests'] })

  const setStatus = async (id: string, status: Status) => {
    try { await api(`/admin/custom-requests/${id}`, { method: 'PATCH', body: { status } }); refresh() } catch (e) { toastError(e) }
  }
  const remove = async (id: string) => {
    try { await api(`/admin/custom-requests/${id}`, { method: 'DELETE' }); refresh() } catch (e) { toastError(e) }
  }

  const open = data?.filter((r) => r.status === 'new').length ?? 0
  return (
    <div>
      <AdminHeader title="Custom requests" sub={data ? `${data.length} requests, ${open} waiting for a reply` : undefined} />
      {data && data.length === 0 && <EmptyState title="No custom requests yet." body="Ideas sent from the “Made just for you” form on the homepage show up here." />}
      <ul className="grid gap-4 lg:grid-cols-2">
        {data?.map((r) => (
          <li key={r.id} className="flex flex-col gap-3 rounded-2xl border border-rule bg-paper p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{r.name}</p>
                <a href={`mailto:${r.email}?subject=${encodeURIComponent('Your Simply Odd custom idea')}`} className="text-sm text-accent underline-offset-4 hover:underline">{r.email}</a>
              </div>
              <StatusPill status={PILL[r.status]} label={STATUS_LABEL[r.status]} />
            </div>
            <p className="whitespace-pre-line text-graphite">{r.idea}</p>
            <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {[['Type', LABELS[r.kind]], ['Size', LABELS[r.size]], ['Budget', LABELS[r.budget]], ['Colours', r.colours.join(', ') || '—']].map(([k, v]) => (
                <div key={k} className="flex gap-1.5"><dt className="text-fog">{k}</dt><dd className="text-ink">{v ?? '—'}</dd></div>
              ))}
            </dl>
            {r.reference_url && (
              <a href={r.reference_url} target="_blank" rel="noreferrer noopener" className="truncate text-sm text-accent underline underline-offset-4">{r.reference_url}</a>
            )}
            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-3 text-sm">
              <span className="text-fog">{dateTime(r.created_at)}</span>
              <div className="flex items-center gap-3">
                <label className="sr-only" htmlFor={`status-${r.id}`}>Status</label>
                <select id={`status-${r.id}`} value={r.status} onChange={(e) => setStatus(r.id, e.target.value as Status)}
                  className="h-9 rounded-lg border border-rule bg-paper px-2 text-sm outline-none focus:border-accent">
                  {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
                <button onClick={() => remove(r.id)} className="text-smoke underline underline-offset-4 hover:text-accent">Delete</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
