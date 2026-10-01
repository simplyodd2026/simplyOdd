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
  const [name, setName] = useState(profile?.name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => { setName(profile?.name ?? ''); setPhone(profile?.phone ?? '') }, [profile?.name, profile?.phone])

  const image = profile?.profile_image || user?.photoURL
  const initials = (profile?.name || user?.email || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

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
    <div className="grid gap-12 xl:grid-cols-[14rem_1fr]">
      <div className="flex flex-col items-start gap-4">
        <div className="grid size-40 place-items-center overflow-hidden bg-paper-3 text-5xl font-black text-accent w-wide">
          {image ? <img src={image} alt="Your profile photo" className="h-full w-full object-cover" /> : initials}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = '' }} />
        <Button variant="outline" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={16} /> {image ? 'Change photo' : 'Add a photo'}
        </Button>
      </div>

      <form onSubmit={save} className="flex max-w-xl flex-col gap-5">
        <Input label="Name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Email" value={profile?.email ?? user?.email ?? ''} disabled hint="Your sign-in email. Contact us to change it." />
        <Input label="Phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} hint="Used by couriers if they can't find you." />
        <div className="flex items-center gap-4">
          <Button type="submit" loading={busy}>Save changes</Button>
          {profile && <span className="text-sm text-fog">Member since {date(profile.created_at, { month: 'long', year: 'numeric' })}</span>}
        </div>
      </form>
    </div>
  )
}
