// Google Analytics 4 (gtag.js). Does nothing unless GA_MEASUREMENT_ID is set
// (injected at build time by vite.config.ts).
// The app is a SPA, so page views are sent manually on each route change.

import type { Order, Product } from './types'
import { chosenVariant } from './variants'

type Gtag = (...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: Gtag
    fbq?: (...args: unknown[]) => void
  }
}

declare const __GA_MEASUREMENT_ID__: string

const GA_ID = __GA_MEASUREMENT_ID__ || undefined

// Admin pages are internal; keep them out of the stats.
const isTracked = (pathname: string) => !pathname.startsWith('/admin')

let lastPath = ''

type AppRouter = {
  state: { location: { pathname: string; search: string } }
  subscribe: (fn: (state: { location: { pathname: string; search: string } }) => void) => unknown
}

// Meta Pixel is loaded in index.html, which fires the first PageView on page load.
// Client-side route changes don't reload the page, so fire PageView for each one here.
// Admin pages are skipped here and in index.html.
function initMetaPixel(router: AppRouter) {
  if (typeof window === 'undefined') return
  let lastFbPath = router.state.location.pathname + router.state.location.search
  router.subscribe(({ location: { pathname, search } }) => {
    const path = pathname + search
    if (path === lastFbPath || !isTracked(pathname)) return
    lastFbPath = path
    window.fbq?.('track', 'PageView')
  })
}

export function initAnalytics(router: AppRouter) {
  initMetaPixel(router)
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

// ---- Meta Pixel standard events ----------------------------------------------------------

type PixelProduct = Pick<Product, 'id' | 'name' | 'price' | 'variants' | 'default_variant'>

/** Meta Pixel AddToCart. `unitPrice` defaults to the product's default-variant price. */
export function trackAddToCart(product: PixelProduct, quantity = 1, unitPrice?: number) {
  const price = unitPrice ?? chosenVariant(product, null)?.price ?? product.price
  window.fbq?.('track', 'AddToCart', {
    content_ids: [product.id],
    content_name: product.name,
    content_type: 'product',
    contents: [{ id: product.id, quantity, item_price: price }],
    value: price * quantity,
    currency: 'INR',
  })
}

/** Meta Pixel Purchase, sent once when an order is placed. The order id is the event id, so repeats are deduplicated. */
export function trackPurchase(order: Order) {
  window.fbq?.(
    'track',
    'Purchase',
    {
      content_ids: order.items.map((i) => i.product_id),
      content_type: 'product',
      contents: order.items.map((i) => ({ id: i.product_id, quantity: i.quantity, item_price: i.unit_price })),
      num_items: order.items.reduce((n, i) => n + i.quantity, 0),
      value: order.total,
      currency: order.currency || 'INR',
    },
    { eventID: `purchase-${order.id}` },
  )
}
