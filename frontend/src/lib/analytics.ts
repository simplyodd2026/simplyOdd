// Google Analytics 4 (gtag.js). Does nothing unless GA_MEASUREMENT_ID is set
// (injected at build time by vite.config.ts).
// The app is a SPA, so page views are sent manually on each route change.

import type { Order, Product, Quote } from './types'
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

// ---- Ecommerce events (GA4 + Meta Pixel) ------------------------------------------------
// Each moment in the buying journey sends the GA4 event and its Meta Pixel twin:
//   product page opens  -> view_item       / ViewContent
//   added to the bag    -> add_to_cart     / AddToCart
//   checkout opens      -> begin_checkout  / InitiateCheckout
//   payment succeeded   -> purchase        / Purchase
// Both calls are no-ops when their script isn't loaded (no GA id, admin pages, ad blockers).

type PixelProduct = Pick<Product, 'id' | 'name' | 'price' | 'variants' | 'default_variant'>
type Line = { id: string; name: string; price: number; quantity: number }

const gaEvent = (name: string, params: Record<string, unknown>) => {
  if (GA_ID && typeof window !== 'undefined' && typeof window.gtag === 'function') window.gtag('event', name, params)
}

const gaItems = (lines: Line[]) =>
  lines.map((l) => ({ item_id: l.id, item_name: l.name, price: l.price, quantity: l.quantity }))

const pixelContents = (lines: Line[]) => ({
  content_ids: lines.map((l) => l.id),
  content_type: 'product',
  contents: lines.map((l) => ({ id: l.id, quantity: l.quantity, item_price: l.price })),
})

const productPrice = (product: PixelProduct) => chosenVariant(product, null)?.price ?? product.price

/** Product page opened. `unitPrice` defaults to the product's default-variant price. */
export function trackViewItem(product: PixelProduct, unitPrice?: number) {
  const price = unitPrice ?? productPrice(product)
  const lines = [{ id: product.id, name: product.name, price, quantity: 1 }]
  gaEvent('view_item', { currency: 'INR', value: price, items: gaItems(lines) })
  window.fbq?.('track', 'ViewContent', { ...pixelContents(lines), content_name: product.name, value: price, currency: 'INR' })
}

/** Added to the bag. `unitPrice` defaults to the product's default-variant price. */
export function trackAddToCart(product: PixelProduct, quantity = 1, unitPrice?: number) {
  const price = unitPrice ?? productPrice(product)
  const lines = [{ id: product.id, name: product.name, price, quantity }]
  const value = price * quantity
  gaEvent('add_to_cart', { currency: 'INR', value, items: gaItems(lines) })
  window.fbq?.('track', 'AddToCart', { ...pixelContents(lines), content_name: product.name, value, currency: 'INR' })
}

/** Checkout page opened, with the priced bag. */
export function trackBeginCheckout(quote: Quote) {
  const lines = quote.lines.map((l) => ({ id: l.product_id, name: l.name, price: l.unit_price, quantity: l.quantity }))
  const currency = quote.currency || 'INR'
  gaEvent('begin_checkout', { currency, value: quote.total, coupon: quote.coupon_code ?? undefined, items: gaItems(lines) })
  window.fbq?.('track', 'InitiateCheckout', {
    ...pixelContents(lines),
    num_items: lines.reduce((n, l) => n + l.quantity, 0),
    value: quote.total,
    currency,
  })
}

/**
 * Sent once, after payment succeeded and the order was created. The order number is GA's transaction_id
 * and the order id is Meta's event id, so a repeat is never counted twice.
 */
export function trackPurchase(order: Order) {
  const lines = order.items.map((i) => ({ id: i.product_id, name: i.name, price: i.unit_price, quantity: i.quantity }))
  const currency = order.currency || 'INR'
  gaEvent('purchase', {
    transaction_id: order.number,
    currency,
    value: order.total,
    shipping: order.shipping,
    coupon: order.coupon_code ?? undefined,
    items: gaItems(lines),
  })
  window.fbq?.(
    'track',
    'Purchase',
    {
      ...pixelContents(lines),
      num_items: lines.reduce((n, l) => n + l.quantity, 0),
      value: order.total,
      currency,
    },
    { eventID: `purchase-${order.id}` },
  )
}
