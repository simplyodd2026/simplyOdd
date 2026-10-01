import { useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '@/lib/auth'
import { useDocumentTitle } from '@/lib/hooks'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { AuthShell, Divider, GoogleButton } from '@/features/auth/AuthShell'
import { useAuthRedirect } from '@/features/auth/useAuthRedirect'

export default function LoginPage() {
  useDocumentTitle('Sign in')
  const next = useAuthRedirect()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try { await fn() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <AuthShell title="Sign in" intro={<>New here? <Link to={`/signup?next=${encodeURIComponent(next)}`} className="text-ink underline underline-offset-4">Create an account</Link></>}>
      <GoogleButton busy={busy} onClick={() => run(() => auth.signInWithGoogle())} />
      <Divider />
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void run(() => auth.signIn(email.trim(), password)) }}>
        <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Link to="/forgot-password" className="-mt-1 self-end text-sm text-smoke hover:text-ink">Forgot your password?</Link>
        {error && <p className="text-sm text-accent" role="alert">{error}</p>}
        <Button type="submit" size="lg" loading={busy}>Sign in</Button>
      </form>
    </AuthShell>
  )
}
