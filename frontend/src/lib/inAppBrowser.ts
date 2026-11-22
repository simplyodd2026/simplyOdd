/** Instagram, Facebook, Messenger and similar apps open links in an embedded browser where Google
 *  refuses to sign anyone in (403 disallowed_useragent). Guest checkout still works there. */
const APPS: [RegExp, string][] = [
  [/Instagram/i, 'Instagram'],
  [/FBAN|FBAV|FB_IAB|FBIOS/i, 'Facebook'],
  [/Messenger/i, 'Messenger'],
  [/Snapchat/i, 'Snapchat'],
  [/Line\//i, 'LINE'],
  [/Twitter/i, 'X'],
  [/LinkedInApp/i, 'LinkedIn'],
]

const ua = () => (typeof navigator === 'undefined' ? '' : navigator.userAgent)

/** Which app's embedded browser we're in, or null in a normal browser (and during prerendering). */
export const inAppBrowserName = (): string | null => APPS.find(([re]) => re.test(ua()))?.[1] ?? null

export const isInAppBrowser = () => inAppBrowserName() !== null

export const isAndroid = () => /Android/i.test(ua())

/**
 * Leave the in-app browser for a real one, keeping the current page.
 * Android: an intent link hands the page to Chrome (falling back to the same URL if Chrome isn't there).
 * iOS doesn't let a page do that, so the link is copied and the caller shows how to use the app's ⋯ menu.
 * Resolves to 'opened' or 'copied' ('failed' if the clipboard was refused too).
 */
export async function openInBrowser(): Promise<'opened' | 'copied' | 'failed'> {
  const href = location.href
  if (isAndroid()) {
    const { host, pathname, search, hash } = location
    location.href = `intent://${host}${pathname}${search}${hash}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`
    // If Chrome took over, this page is now hidden. Still visible means the app blocked it: fall back to the menu hint.
    await new Promise((r) => setTimeout(r, 1500))
    return document.visibilityState === 'hidden' ? 'opened' : 'failed'
  }
  try {
    await navigator.clipboard.writeText(href)
    return 'copied'
  } catch {
    return 'failed'
  }
}
