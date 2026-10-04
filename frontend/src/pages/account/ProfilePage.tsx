import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { UserProfile } from '@/lib/types'
import { useSession } from '@/stores/session'
import { toast, toastError } from '@/stores/toast'
import { useDocumentTitle } from '@/lib/hooks'
import { date } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'

export default function ProfilePage() {
  useDocumentTitle('Your profile')
  const { user, profile, set } = useSession()
  // Fall back to the sign-in name (e.g. from Google) so the field matches the greeting until it's saved.
  const [name, setName] = useState(profile?.name || user?.name || '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => { setName(profile?.name || user?.name || ''); setPhone(profile?.phone ?? '') }, [profile?.name, profile?.phone, user?.name])

  const image = profile?.profile_image || user?.photoURL
  const initials = (profile?.name || user?.name || user?.email || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const p = await api<UserProfile>('/me', { method: 'PATCH', body: { name: name.trim(), phone: phone.trim() } })
      set({ profile: p })
      toast('Profile saved')
    } catch (err) { toastError(err) } finally { setBusy(false) }
  }

  const upload = async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    setUploading(true)
    try {
      set({ profile: await api<UserProfile>('/me/avatar', { form }) })
      toast('Photo updated')
    } catch (err) { toastError(err) } finally { setUploading(false) }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center gap-5 border-b border-rule pb-8">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-full bg-paper-3 font-display text-4xl text-ink">
          {image ? <img src={image} alt="Your profile photo" className="h-full w-full object-cover" /> : initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[1.9rem] leading-none text-ink">{profile?.name || user?.name || 'Your profile'}</p>
          {profile && <p className="mt-2 text-[14px] text-fog">Member since {date(profile.created_at, { month: 'long', year: 'numeric' })}</p>}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = '' }} />
        <Button variant="outline-dark" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={15} /> {image ? 'Change photo' : 'Add a photo'}
        </Button>
      </div>

      <form onSubmit={save} className="grid gap-x-6 gap-y-6 pt-8 sm:grid-cols-2">
        <Input label="Name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} hint="Used by couriers if they can't find you." />
        <Input label="Email" className="sm:col-span-2" value={profile?.email ?? user?.email ?? ''} disabled hint="Your sign-in email. Contact us to change it." />
        <div className="pt-2 sm:col-span-2">
          <Button type="submit" loading={busy}>Save changes</Button>
        </div>
      </form>
    </div>
  )
}
