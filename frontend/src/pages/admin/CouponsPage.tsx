import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Coupon } from '@/lib/types'
import { useDocumentTitle } from '@/lib/hooks'
import { date, money } from '@/lib/format'
import { toast, toastError } from '@/stores/toast'
import { AdminHeader, Table, td } from '@/features/admin/ui'
import { Button } from '@/components/ui/Button'
import { Checkbox, Input, Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Overlay'
import { StatusPill } from '@/components/ui/misc'

type Draft = Omit<Coupon, 'id' | 'used_count' | 'created_at'> & { id?: string }
const blank: Draft = { code: '', description: '', kind: 'percent', value: 10, min_subtotal: 0, max_discount: null, usage_limit: null, starts_at: null, expires_at: null, active: true }

const describe = (c: Coupon) =>
  c.kind === 'free_shipping' ? 'Free shipping' : c.kind === 'percent' ? `${c.value}% off${c.max_discount ? ` (up to ${money(c.max_discount)})` : ''}` : `${money(c.value)} off`

export default function CouponsPage() {
  useDocumentTitle('Coupons')
  const qc = useQueryClient()
  const { data: coupons } = useQuery({ queryKey: ['admin', 'coupons'], queryFn: () => api<Coupon[]>('/admin/coupons') })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!draft) return
    setBusy(true)
    try {
      const { id, ...body } = draft
      const payload = { ...body, expires_at: body.expires_at ? new Date(body.expires_at).toISOString() : null }
      if (id) await api(`/admin/coupons/${id}`, { method: 'PATCH', body: payload })
      else await api('/admin/coupons', { body: payload })
      toast(id ? 'Coupon saved' : 'Coupon created')
      setDraft(null)
      qc.invalidateQueries({ queryKey: ['admin', 'coupons'] })
    } catch (e) { toastError(e) } finally { setBusy(false) }
  }
  const remove = async (id: string) => {
    setBusy(true)
    try { await api(`/admin/coupons/${id}`, { method: 'DELETE' }); toast('Coupon deleted'); setDraft(null); qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }) }
    catch (e) { toastError(e) } finally { setBusy(false) }
  }

  const n = (v: string) => (v === '' ? null : Number(v))

  return (
    <div>
      <AdminHeader title="Coupons" actions={<Button onClick={() => setDraft(blank)}>New coupon</Button>} />
      <Table head={['Code', 'Discount', 'Minimum', 'Used', 'Expires', 'Status']}>
        {coupons?.map((c) => (
          <tr key={c.id} className="cursor-pointer hover:bg-black/[0.02]" onClick={() => setDraft({ ...c, expires_at: c.expires_at?.slice(0, 10) ?? null })}>
            <td className={`${td} font-semibold tracking-wide`}>{c.code}<div className="text-xs font-normal tracking-normal text-fog">{c.description}</div></td>
            <td className={td}>{describe(c)}</td>
            <td className={`${td} tabular-nums text-smoke`}>{c.min_subtotal ? money(c.min_subtotal) : '—'}</td>
            <td className={`${td} tabular-nums`}>{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</td>
            <td className={`${td} text-smoke`}>{c.expires_at ? date(c.expires_at) : 'Never'}</td>
            <td className={td}><StatusPill status={c.active ? 'paid' : 'void'} label={c.active ? 'Active' : 'Paused'} /></td>
          </tr>
        ))}
      </Table>

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? `Edit ${draft.code}` : 'New coupon'}>
        {draft && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Code" value={draft.code} disabled={!!draft.id} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} />
            <Select label="Type" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Draft['kind'] })}>
              <option value="percent">Percentage off</option><option value="fixed">Fixed amount off</option><option value="free_shipping">Free shipping</option>
            </Select>
            <Input className="sm:col-span-2" label="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            {draft.kind !== 'free_shipping' && <Input label={draft.kind === 'percent' ? 'Percent off' : 'Amount off (₹)'} inputMode="decimal" value={draft.value} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) || 0 })} />}
            {draft.kind === 'percent' && <Input label="Maximum discount (₹)" inputMode="decimal" value={draft.max_discount ?? ''} onChange={(e) => setDraft({ ...draft, max_discount: n(e.target.value) })} />}
            <Input label="Minimum order (₹)" inputMode="decimal" value={draft.min_subtotal || ''} onChange={(e) => setDraft({ ...draft, min_subtotal: Number(e.target.value) || 0 })} />
            <Input label="Total uses allowed" inputMode="numeric" value={draft.usage_limit ?? ''} onChange={(e) => setDraft({ ...draft, usage_limit: n(e.target.value) })} hint="Empty for unlimited" />
            <Input label="Expires on" type="date" value={draft.expires_at ?? ''} onChange={(e) => setDraft({ ...draft, expires_at: e.target.value || null })} />
            <div className="flex items-end pb-2.5"><Checkbox label="Active" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /></div>
            <div className="mt-2 flex flex-wrap gap-3 sm:col-span-2">
              <Button loading={busy} onClick={save}>Save coupon</Button>
              {draft.id && <Button variant="danger" loading={busy} onClick={() => remove(draft.id!)}>Delete</Button>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
