import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api } from '@/lib/api'
import type { Cart, CartLine, ShippingMethod } from '@/lib/types'
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
  /** `color` is a filament id; the same product in two colours is two lines. */
  add: (productId: string, quantity?: number, color?: string | null) => void
  setQuantity: (productId: string, color: string | null, quantity: number) => void
  remove: (productId: string, color: string | null) => void
  /** Move a line to another colour, folding it into that colour's line if there already is one. */
  setColor: (productId: string, from: string | null, to: string) => void
  clear: () => void
  replace: (items: CartLine[]) => void
  setCoupon: (code: string | null) => void
  setCouponAmount: (amount: number | null) => void
  setShipping: (m: ShippingMethod) => void
}

/** A line is a product in a colour; a line without a colour is stored as null. */
const same = (l: CartLine, productId: string, color: string | null) => l.product_id === productId && (l.color ?? null) === color

/** How many of a product one line may hold: the limit is shared by every colour of the piece. */
export const lineMax = (items: CartLine[], productId: string, color: string | null) =>
  MAX_PER_PRODUCT - items.reduce((n, i) => (i.product_id === productId && !same(i, productId, color) ? n + i.quantity : n), 0)

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
        add: (productId, quantity = 1, color = null) => {
          const items = get().items
          const max = lineMax(items, productId, color)
          if (max <= 0) return
          commit(items.some((i) => same(i, productId, color))
            ? items.map((i) => (same(i, productId, color) ? { ...i, quantity: Math.min(max, i.quantity + quantity) } : i))
            : [...items, { product_id: productId, quantity: Math.min(max, quantity), color }])
        },
        setQuantity: (productId, color, quantity) =>
          commit(quantity <= 0
            ? get().items.filter((i) => !same(i, productId, color))
            : get().items.map((i) => (same(i, productId, color) ? { ...i, quantity: Math.min(lineMax(get().items, productId, color), quantity) } : i))),
        remove: (productId, color) => commit(get().items.filter((i) => !same(i, productId, color))),
        setColor: (productId, from, to) => {
          if (from === to) return
          const items = get().items
          const moving = items.find((i) => same(i, productId, from))
          if (!moving) return
          const target = items.find((i) => same(i, productId, to))
          commit(target
            ? items.filter((i) => i !== moving).map((i) => (i === target ? { ...i, quantity: Math.min(MAX_PER_PRODUCT, i.quantity + moving.quantity) } : i))
            : items.map((i) => (i === moving ? { ...i, color: to } : i)))
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
