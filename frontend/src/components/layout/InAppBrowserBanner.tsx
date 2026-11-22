import { useEffect, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { inAppBrowserName, openInBrowser } from '@/lib/inAppBrowser'

const DISMISSED = 'so.inapp-banner-dismissed'

/**
 * Shown only inside Instagram / Facebook-style in-app browsers, where Google sign-in is blocked.
 * It offers a way out to a real browser but never stands in the way: guest checkout works right here.
 */
export function InAppBrowserBanner() {
  // Read on the client only, so the prerendered HTML (no banner) hydrates cleanly.
  const [app, setApp] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    let dismissed = false
    try { dismissed = sessionStorage.getItem(DISMISSED) === '1' } catch { /* storage blocked: just show it */ }
    if (!dismissed) setApp(inAppBrowserName())
  }, [])

  if (!app) return null

  const dismiss = () => {
    setApp(null)
    try { sessionStorage.setItem(DISMISSED, '1') } catch { /* fine, it'll show again next visit */ }
  }

  return (
    <div className="relative z-40 border-b border-accent/30 bg-paper-2 px-4 py-3 text-[13px] leading-snug text-graphite" role="note">
      <div className="mx-auto flex max-w-[1120px] items-start gap-3">
        <p className="flex-1">
          {status === 'copied'
            ? <>Link copied. Tap <span className="text-ink">⋯</span> or <span className="text-ink">⋮</span> at the top right and choose <span className="text-ink">Open in browser</span> (or paste it into Safari).</>
            : status === 'failed'
              ? <>Tap <span className="text-ink">⋮</span> or <span className="text-ink">⋯</span> at the top right and choose <span className="text-ink">Open in browser</span>.</>
              : <>You’re in {app}’s browser, so Google sign-in won’t work here. You can still check out as a guest, or open the page in your browser to sign in.</>}
        </p>
        {status === 'idle' && (
          <button type="button" className="shrink-0 rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-medium text-paper"
            onClick={async () => { const r = await openInBrowser(); if (r !== 'opened') setStatus(r) }}>
            Open in browser
          </button>
        )}
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="-mr-1 grid size-7 shrink-0 place-items-center text-smoke">
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  )
}
