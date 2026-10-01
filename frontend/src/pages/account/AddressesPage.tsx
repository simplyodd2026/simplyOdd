import { useState } from 'react'
import { api } from '@/lib/api'
import type { Address, AddressInput } from '@/lib/types'
import { refreshProfile } from '@/lib/queries'
import { useSession } from '@/stores/session'
import { toast, toastError } from '@/stores/toast'
import { useDocumentTitle } from '@/lib/hooks'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Overlay'
import { EmptyState } from '@/components/ui/misc'
import { Icon } from '@/components/ui/Icon'
import { AddressFields, emptyAddress, validateAddress, type AddressErrors } from '@/features/account/AddressForm'

export default function AddressesPage() {
  useDocumentTitle('Addresses')
  const profile = useSession((s) => s.profile)
  const addresses = profile?.addresses ?? []
  const [editing, setEditing] = useState<{ id: string | null; value: AddressInput } | null>(null)
  const [errors, setErrors] = useState<AddressErrors>({})
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true)
    try { await fn(); await refreshProfile(); toast(message); return true } catch (e) { toastError(e); return false } finally { setBusy(false) }
  }

  const save = async () => {
    if (!editing) return
    const errs = validateAddress(editing.value)
    setErrors(errs)
    if (Object.keys(errs).length) return
    const ok = await run(() => editing.id
      ? api(`/me/addresses/${editing.id}`, { method: 'PUT', body: editing.value })
      : api('/me/addresses', { body: editing.value }), editing.id ? 'Address updated' : 'Address added')
    if (ok) setEditing(null)
  }

  const open = (a?: Address) => {
    setErrors({})
    setEditing(a ? { id: a.id, value: { ...a } } : { id: null, value: { ...emptyAddress(profile?.name), is_default: addresses.length === 0 } })
  }

  return (
    <div>
      {addresses.length === 0 ? (
        <EmptyState title="No saved addresses." body="Save an address to check out faster." action={<Button onClick={() => open()}>Add an address</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {addresses.map((a) => (
            <div key={a.id} className={`flex flex-col border p-5 ${a.is_default ? 'border-graphite/40' : 'border-rule'}`}>
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">{a.label}</span>
                {a.is_default && <span className="text-sm text-accent">Default</span>}
              </div>
              <p className="mt-3 flex-1 leading-relaxed text-smoke">{a.full_name}<br />{a.line1}{a.line2 && `, ${a.line2}`}<br />{a.city}, {a.state} {a.postal_code}<br />{a.phone}</p>
              <div className="mt-5 flex flex-wrap gap-4 text-sm">
                <button onClick={() => open(a)} className="underline underline-offset-4 hover:text-accent">Edit</button>
                {!a.is_default && <button disabled={busy} onClick={() => run(() => api(`/me/addresses/${a.id}/default`, { method: 'POST' }), 'Default address updated')} className="underline underline-offset-4 hover:text-accent">Make default</button>}
                <button disabled={busy} onClick={() => run(() => api(`/me/addresses/${a.id}`, { method: 'DELETE' }), 'Address deleted')} className="text-smoke underline underline-offset-4 hover:text-accent">Delete</button>
              </div>
            </div>
          ))}
          <button onClick={() => open()} className="flex min-h-48 items-center justify-center gap-2 border border-dashed border-rule text-smoke hover:border-accent hover:text-ink">
            <Icon name="plus" size={18} /> Add an address
          </button>
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit address' : 'New address'} wide>
        {editing && (
          <div className="flex flex-col gap-6">
            <AddressFields value={editing.value} onChange={(value) => setEditing({ ...editing, value })} errors={errors} showDefault />
            <div className="flex gap-3">
              <Button loading={busy} onClick={save}>Save address</Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
