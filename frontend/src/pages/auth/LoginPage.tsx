import { useState } from 'react'
import { auth } from '@/lib/auth'
import { useDocumentTitle } from '@/lib/hooks'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { AuthShell, Divider, GoogleButton } from '@/features/auth/AuthShell'
import { useAuthRedirect } from '@/features/auth/useAuthRedirect'
import { isInAppBrowser, openInBrowser } from '@/lib/inAppBrowser'
import { Icon } from '@/components/ui/Icon'

/** Google is the only way in: the first sign-in creates the account. */
export default function LoginPage() {
  useDocumentTitle('Sign in')
  useAuthRedirect()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'copied' | 'failed' | null>(null)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try { await fn() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <AuthShell title="Sign in" intro="Sign in or create an account with Google. Your account is set up automatically the first time.">
      {/* In Instagram & co. Google refuses to sign in, so leaving for a real browser is the main action here. */}
      {isInAppBrowser() && (
        <div className="mb-8">
          <button type="button" onClick={async () => { const r = await openInBrowser(); if (r !== 'opened') setCopied(r) }}
            className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-ink text-[15px] font-medium text-paper transition-transform duration-300 active:scale-[0.98]">
            <Icon name="external" size={18} /> Open in browser to sign in
          </button>
          {copied && (
            <p className="mt-3 text-center text-[14px] text-ink" role="status">
              {copied === 'copied' ? 'Link copied. ' : ''}Tap <span className="font-medium">⋮</span> or <span className="font-medium">⋯</span> at the top right and choose <span className="font-medium">Open in browser</span>.
            </p>
          )}
          <p className="mt-4 text-[14px] leading-relaxed text-graphite">
            Google sign-in doesn’t work inside this app’s browser. You don’t need an account to buy: you can check out as a guest.
          </p>
          <p className="mt-6 text-center text-[13px] text-fog">or try here</p>
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
