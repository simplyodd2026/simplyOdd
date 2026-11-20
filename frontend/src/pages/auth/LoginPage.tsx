import { useState } from 'react'
import { auth } from '@/lib/auth'
import { useDocumentTitle } from '@/lib/hooks'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { AuthShell, Divider, GoogleButton } from '@/features/auth/AuthShell'
import { useAuthRedirect } from '@/features/auth/useAuthRedirect'
import { isInAppBrowser } from '@/lib/inAppBrowser'

/** Google is the only way in: the first sign-in creates the account. */
export default function LoginPage() {
  useDocumentTitle('Sign in')
  useAuthRedirect()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try { await fn() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <AuthShell title="Sign in" intro="Sign in or create an account with Google. Your account is set up automatically the first time.">
      {isInAppBrowser() && (
        <div className="mb-6 border border-dashed border-accent/60 p-4 text-[14px] leading-relaxed text-graphite" role="note">
          Google sign-in doesn’t work inside this app’s browser. Tap <span className="text-ink">⋯</span> and choose <span className="text-ink">Open in browser</span> to sign in.
          You don’t need an account to buy: you can check out as a guest.
          <button type="button" className="link-draw mt-2 block text-ink" onClick={() => { void navigator.clipboard?.writeText(location.href).then(() => setCopied(true)).catch(() => undefined) }}>
            {copied ? 'Link copied' : 'Copy link'}
          </button>
        </div>
      )}
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
