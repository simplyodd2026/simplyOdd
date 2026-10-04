import type { ReactNode } from 'react'
import { auth } from '@/lib/auth'

export function AuthShell({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-[1520px] lg:min-h-[calc(100dvh-112px)] lg:grid-cols-2">
      <div className="film-grain relative hidden flex-col justify-between overflow-hidden bg-night p-12 text-paper lg:flex xl:p-16">
        <p className="label text-paper/50">Simply Odd — Account</p>
        <p className="max-w-lg font-display text-6xl leading-[1] text-paper">
          Your orders, saved pieces and addresses, <span className="font-odd text-paper/60">in one place.</span>
        </p>
      </div>
      <div className="flex items-center px-4 py-14 sm:px-10 lg:px-20">
        <div className="w-full max-w-md">
          <h1 className="font-display text-6xl leading-[0.95] text-ink sm:text-7xl">{title}</h1>
          {intro && <div className="mt-4 text-smoke">{intro}</div>}
          <div className="mt-10">{children}</div>
          {auth.mode === 'dev' && (
            <p className="mt-10 border-l-2 border-accent pl-4 text-sm text-fog">
              Development sign-in: use <span className="text-graphite">demo@simplyodd.dev</span> for a customer with orders,
              or <span className="text-graphite">admin@simplyodd.dev</span> for the admin dashboard. Add Firebase keys to use Google sign-in.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function GoogleButton({ onClick, busy }: { onClick: () => void; busy?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={busy}
      className="flex h-14 w-full items-center justify-center gap-3 rounded-full border border-ink/20 text-[15px] font-medium text-ink transition-colors duration-300 hover:border-ink hover:bg-ink hover:text-paper disabled:opacity-50">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5Z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7Z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44Z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5Z"/></svg>
      Continue with Google
    </button>
  )
}

export function Divider() {
  return (
    <div className="my-6 flex items-center gap-4 text-sm text-fog">
      <span className="h-px flex-1 bg-rule" />or<span className="h-px flex-1 bg-rule" />
    </div>
  )
}
