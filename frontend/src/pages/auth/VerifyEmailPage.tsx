import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '@/lib/auth'
import { useSession } from '@/stores/session'
import { toast, toastError } from '@/stores/toast'
import { useDocumentTitle } from '@/lib/hooks'
import { Button } from '@/components/ui/Button'
import { AuthShell } from '@/features/auth/AuthShell'

export default function VerifyEmailPage() {
  useDocumentTitle('Confirm your email')
  const user = useSession((s) => s.user)
  const navigate = useNavigate()
  const [busy, setBusy] = useState<'send' | 'check' | null>(null)

  return (
    <AuthShell title="Confirm your email" intro={<>We sent a link to <span className="text-ink">{user?.email}</span>. Open it to confirm your address.</>}>
      <div className="flex flex-col gap-3">
        <Button size="lg" loading={busy === 'check'} onClick={async () => {
          setBusy('check')
          const u = await auth.reload().catch(() => null)
          setBusy(null)
          if (u?.emailVerified) { useSession.getState().set({ user: u }); navigate('/account') }
          else toast('Not confirmed yet. Open the link in the email, then try again.', { tone: 'error' })
        }}>I've confirmed it</Button>
        <Button variant="outline" size="lg" loading={busy === 'send'} onClick={async () => {
          setBusy('send')
          try { await auth.sendEmailVerification(); toast('Sent a new link') } catch (e) { toastError(e) } finally { setBusy(null) }
        }}>Send the link again</Button>
      </div>
    </AuthShell>
  )
}
