import { useState } from 'react'
import { auth } from '@/lib/auth'
import { useDocumentTitle } from '@/lib/hooks'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { AuthShell, Divider, GoogleButton } from '@/features/auth/AuthShell'
import { useAuthRedirect } from '@/features/auth/useAuthRedirect'

/** Google is the only way in: the first sign-in creates the account. */
export default function LoginPage() {
  useDocumentTitle('Sign in')
  useAuthRedirect()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try { await fn() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <AuthShell title="Sign in" intro="Sign in or create an account with Google. Your account is set up automatically the first time.">
      <GoogleButton busy={busy} onClick={() => run(() => auth.signInWithGoogle())} />
      {error && <p className="mt-4 text-sm text-accent" role="alert">{error}</p>}
      {auth.devSignIn && (
        <>
          <Divider />
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void run(() => auth.devSignIn!(email.trim())) }}>
            <Input label="Dev sign-in email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" size="lg" loading={busy}>Sign in</Button>
          </form>
        </>
      )}
    </AuthShell>
  )
}
