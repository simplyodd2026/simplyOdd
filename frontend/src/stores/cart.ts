import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api } from '@/lib/api'
import type { Cart, CartLine, Personalization, ShippingMethod } from '@/lib/types'
import { isSignedIn } from './session'
import { MAX_PER_PRODUCT } from '@/lib/constants'

/**
 * Bag contents. Guests persist to localStorage; signed-in shoppers also sync
 * to the backend (debounced), so the bag follows them across devices.
 * Prices are never computed here: the bag page asks the API for a quote.
 */
interface CartState {
  items: CartLine[]
  couponCode: string | null
  /** What the shopper chose to pay, for a code that lets them set the total. */
  couponAmount: number | null
  shippingMethod: ShippingMethod
  /**
   * `color` is a filament id; `personalization` is what to write on the piece. The same product in two
   * colours, or with two different names on it, is two lines.
   */
  /** Returns how many were actually added: fewer than asked (or 0) when the per-product limit is reached. */
  add: (productId: string, quantity?: number, color?: string | null, personalization?: Personalization | null, variant?: string | null) => number
  setQuantity: (line: LineRef, quantity: number) => void
  remove: (line: LineRef) => void
  /** Move a line to another colour, folding it into that colour's line if there already is one. */
  setColor: (line: LineRef, to: string) => void
  /** Move a line to another variant (say, framed), folding it into that variant's line if there already is one. */
  setVariant: (line: LineRef, to: string) => void
  /** Change what's written on a line, folding it into an identical line if there already is one. */
  setPersonalization: (line: LineRef, to: Personalization) => void
  clear: () => void
  replace: (items: CartLine[]) => void
  setCoupon: (code: string | null) => void
  setCouponAmount: (amount: number | null) => void
  setShipping: (m: ShippingMethod) => void
}

/** What identifies a bag line: a bag line itself or the quote line priced from it. */
export type LineRef = Pick<CartLine, 'product_id' | 'variant' | 'color' | 'personalization'>

/** Trim and collapse whitespace and drop empty values, as the server does, so lines match up. */
export function tidyPersonalization(values: Personalization | null | undefined): Personalization | null {
  const out: Personalization = {}
  for (const [k, v] of Object.entries(values ?? {})) {
    const t = v.trim().replace(/\s+/g, ' ')
    if (t) out[k] = t
  }
  return Object.keys(out).length ? out : null
}

/** A stable key for a line: product, variant and colour (empty when none) and personalisation. */
export const lineKey = (l: LineRef) => {
  const p = tidyPersonalization(l.personalization)
  return `${l.product_id}:${l.variant ?? ''}:${l.color ?? ''}:${p ? JSON.stringify(Object.entries(p).sort(([a], [b]) => a.localeCompare(b))) : ''}`
}
const same = (a: LineRef, b: LineRef) => lineKey(a) === lineKey(b)

/** How many of a product one line may hold: the limit is shared by every line of the piece. */
export const lineMax = (items: CartLine[], line: LineRef) =>
  MAX_PER_PRODUCT - items.reduce((n, i) => (i.product_id === line.product_id && !same(i, line) ? n + i.quantity : n), 0)

let syncTimer: ReturnType<typeof setTimeout> | undefined
const scheduleSync = (items: CartLine[]) => {
  if (!isSignedIn()) return
  clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    api('/me/cart', { method: 'PUT', body: { items } }).catch(() => undefined)
  }, 400)
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => {
      const commit = (items: CartLine[]) => {
        set({ items })
        scheduleSync(items)
      }
      return {
        items: [],
        couponCode: null,
        couponAmount: null,
        shippingMethod: 'standard',
        add: (productId, quantity = 1, color = null, personalization = null, variant = null) => {
          const items = get().items
          const line: CartLine = { product_id: productId, quantity, variant, color, personalization: tidyPersonalization(personalization) }
          const max = lineMax(items, line)
          if (max <= 0) return 0
          const existing = items.find((i) => same(i, line))?.quantity ?? 0
          const next = Math.min(max, existing + quantity)
          if (next <= existing) return 0
          commit(existing
            ? items.map((i) => (same(i, line) ? { ...i, quantity: next } : i))
            : [...items, { ...line, quantity: next }])
          return next - existing
        },
        setQuantity: (line, quantity) =>
          commit(quantity <= 0
            ? get().items.filter((i) => !same(i, line))
            : get().items.map((i) => (same(i, line) ? { ...i, quantity: Math.min(lineMax(get().items, line), quantity) } : i))),
        remove: (line) => commit(get().items.filter((i) => !same(i, line))),
        setColor: (line, to) => {
          if ((line.color ?? null) === to) return
          const items = get().items
          const moving = items.find((i) => same(i, line))
          if (!moving) return
          const target = items.find((i) => same(i, { ...line, color: to }))
          commit(target
            ? items.filter((i) => i !== moving).map((i) => (i === target ? { ...i, quantity: Math.min(MAX_PER_PRODUCT, i.quantity + moving.quantity) } : i))
            : items.map((i) => (i === moving ? { ...i, color: to } : i)))
        },
        setVariant: (line, to) => {
          if ((line.variant ?? null) === to) return
          const items = get().items
          const moving = items.find((i) => same(i, line))
          if (!moving) return
          const target = items.find((i) => same(i, { ...line, variant: to }))
          commit(target
            ? items.filter((i) => i !== moving).map((i) => (i === target ? { ...i, quantity: Math.min(MAX_PER_PRODUCT, i.quantity + moving.quantity) } : i))
            : items.map((i) => (i === moving ? { ...i, variant: to } : i)))
        },
        setPersonalization: (line, to) => {
          const items = get().items
          const moving = items.find((i) => same(i, line))
          const next = { ...line, personalization: tidyPersonalization(to) }
          if (!moving || same(moving, next)) return
          const target = items.find((i) => same(i, next))
          commit(target
            ? items.filter((i) => i !== moving).map((i) => (i === target ? { ...i, quantity: Math.min(MAX_PER_PRODUCT, i.quantity + moving.quantity) } : i))
            : items.map((i) => (i === moving ? { ...i, personalization: next.personalization } : i)))
        },
        clear: () => set({ items: [], couponCode: null, couponAmount: null, shippingMethod: 'standard' }),
        replace: (items) => set({ items }),
        setCoupon: (couponCode) => set({ couponCode, couponAmount: null }),
        setCouponAmount: (couponAmount) => set({ couponAmount }),
        setShipping: (shippingMethod) => set({ shippingMethod }),
      }
    },
    {
      name: 'om.cart', storage: createJSONStorage(() => localStorage), version: 2,
      // v1 bags predate colours: every line becomes the product with no colour chosen.
      migrate: (state, version) => {
        const s = state as CartState
        return version < 2 ? { ...s, items: (s.items ?? []).map((i) => ({ ...i, color: i.color ?? null })) } : s
      },
    },
  ),
)

export const cartCount = (items: CartLine[]) => items.reduce((n, i) => n + i.quantity, 0)

/** Called once after sign-in: fold the guest bag into the saved one. */
export async function mergeCartOnSignIn() {
  const { items, replace } = useCart.getState()
  const merged = await api<Cart>('/me/cart/merge', { body: { items } })
  replace(merged.items)
}
