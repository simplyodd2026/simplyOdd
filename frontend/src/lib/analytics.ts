// Google Analytics 4 (gtag.js). Does nothing unless GA_MEASUREMENT_ID is set
// (injected at build time by vite.config.ts).
// The app is a SPA, so page views are sent manually on each route change.

type Gtag = (...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: Gtag
  }
}

declare const __GA_MEASUREMENT_ID__: string

const GA_ID = __GA_MEASUREMENT_ID__ || undefined

// Admin pages are internal; keep them out of the stats.
const isTracked = (pathname: string) => !pathname.startsWith('/admin')

let lastPath = ''

export function initAnalytics(router: {
  state: { location: { pathname: string; search: string } }
  subscribe: (fn: (state: { location: { pathname: string; search: string } }) => void) => unknown
}) {
  if (!GA_ID || typeof window === 'undefined') return

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // gtag.js expects the `arguments` object itself, not an array.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, { send_page_view: false })

  const sendPageView = ({ pathname, search }: { pathname: string; search: string }) => {
    const path = pathname + search
    if (path === lastPath || !isTracked(pathname)) return
    lastPath = path
    window.gtag('event', 'page_view', {
      page_path: path,
      page_location: window.location.origin + path,
      page_title: document.title,
    })
  }

  sendPageView(router.state.location)
  router.subscribe((state) => sendPageView(state.location))
}

/** Send a custom GA event, e.g. trackEvent('add_to_cart', { ... }). No-op when GA is off. */
export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (GA_ID && typeof window !== 'undefined' && window.gtag) window.gtag('event', name, params)
}
