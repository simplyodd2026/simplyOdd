import { useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '@/lib/auth'
import { useDocumentTitle } from '@/lib/hooks'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { AuthShell } from '@/features/auth/AuthShell'

export default function ForgotPasswordPage() {
  useDocumentTitle('Reset your password')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <AuthShell title="Reset your password" intro="Enter the email you signed up with and we'll send you a link to choose a new password.">
      {sent ? (
        <div className="flex flex-col gap-4">
          <p className="text-lg">If there's an account for <span className="text-ink">{email}</span>, a reset link is on its way. Check your spam folder if it doesn't arrive in a few minutes.</p>
          <Link to="/login" className="text-ink underline underline-offset-4">Back to sign in</Link>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError(null)
          try {
            await auth.sendPasswordReset(email.trim())
            setSent(true)
          } catch (err) {
            // Don't reveal whether an account exists.
            if ((err as Error).message.includes("no account")) setSent(true)
            else setError((err as Error).message)
          } finally { setBusy(false) }
        }}>
          <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <p className="text-sm text-accent" role="alert">{error}</p>}
          <Button type="submit" size="lg" loading={busy}>Send reset link</Button>
          <Link to="/login" className="text-sm text-smoke hover:text-ink">Back to sign in</Link>
        </form>
      )}
    </AuthShell>
  )
}
