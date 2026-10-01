import { useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '@/lib/auth'
import { useDocumentTitle } from '@/lib/hooks'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { AuthShell, Divider, GoogleButton } from '@/features/auth/AuthShell'
import { useAuthRedirect } from '@/features/auth/useAuthRedirect'

export default function SignupPage() {
  useDocumentTitle('Create an account')
  const next = useAuthRedirect()
  const [name, setName] = useState('')
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
    <AuthShell title="Create an account" intro={<>Already have one? <Link to={`/login?next=${encodeURIComponent(next)}`} className="text-ink underline underline-offset-4">Sign in</Link></>}>
      <GoogleButton busy={busy} onClick={() => run(() => auth.signInWithGoogle())} />
      <Divider />
      <form className="flex flex-col gap-4" onSubmit={(e) => {
        e.preventDefault()
        if (password.length < 8) return setError('Use at least 8 characters for your password.')
        void run(() => auth.signUp(name.trim(), email.trim(), password))
      }}>
        <Input label="Name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" type="password" autoComplete="new-password" required minLength={8} hint="At least 8 characters"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-accent" role="alert">{error}</p>}
        <Button type="submit" size="lg" loading={busy}>Create account</Button>
        <p className="text-sm text-fog">We'll send you an email to confirm your address.</p>
      </form>
    </AuthShell>
  )
}
