import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { auth } from '@/lib/auth'
import { useDocumentTitle } from '@/lib/hooks'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { AuthShell } from '@/features/auth/AuthShell'

/**
 * Handles Firebase email action links (set the action URL in the Firebase
 * console to https://your-site/auth/action). Supports password reset and
 * email verification.
 */
export default function AuthActionPage() {
  const [sp] = useSearchParams()
  const mode = sp.get('mode')
  const code = sp.get('oobCode') ?? ''
  useDocumentTitle(mode === 'resetPassword' ? 'Choose a new password' : 'Confirm your email')
  return mode === 'resetPassword' ? <ResetPassword code={code} /> : <VerifyEmail code={code} />
}

function ResetPassword({ code }: { code: string }) {
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <AuthShell title="Choose a new password">
      {done ? (
        <div className="flex flex-col gap-4">
          <p className="text-lg">Password changed. Sign in with your new password.</p>
          <Link to="/login" className="text-ink underline underline-offset-4">Sign in</Link>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError(null)
          try { await auth.confirmPasswordReset(code, pw); setDone(true) } catch (err) { setError((err as Error).message) } finally { setBusy(false) }
        }}>
          <Input label="New password" type="password" autoComplete="new-password" minLength={8} required hint="At least 8 characters" value={pw} onChange={(e) => setPw(e.target.value)} />
          {error && <p className="text-sm text-accent" role="alert">{error} <Link to="/forgot-password" className="underline">Request a new link</Link></p>}
          <Button type="submit" size="lg" loading={busy}>Save password</Button>
        </form>
      )}
    </AuthShell>
  )
}

function VerifyEmail({ code }: { code: string }) {
  const [state, setState] = useState<'working' | 'done' | string>('working')
  useEffect(() => {
    auth.applyEmailVerification(code).then(() => auth.reload()).then(() => setState('done')).catch((e) => setState((e as Error).message))
  }, [code])
  return (
    <AuthShell title={state === 'done' ? 'Email confirmed' : state === 'working' ? 'Confirming…' : 'That link didn’t work'}>
      {state === 'done' ? <Button size="lg" onClick={() => (window.location.href = '/account')}>Go to your account</Button>
        : state !== 'working' && <p className="text-accent">{state} <Link to="/verify-email" className="underline">Send a new link</Link></p>}
    </AuthShell>
  )
}
