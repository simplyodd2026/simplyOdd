import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api } from '@/lib/api'
import type { Cart, CartLine, ShippingMethod } from '@/lib/types'
import { isSignedIn } from './session'

/**
 * Bag contents. Guests persist to localStorage; signed-in shoppers also sync
 * to the backend (debounced), so the bag follows them across devices.
 * Prices are never computed here: the bag page asks the API for a quote.
 */
interface CartState {
  items: CartLine[]
  couponCode: string | null
  shippingMethod: ShippingMethod
  add: (productId: string, quantity?: number) => void
  setQuantity: (productId: string, quantity: number) => void
  remove: (productId: string) => void
  clear: () => void
  replace: (items: CartLine[]) => void
  setCoupon: (code: string | null) => void
  setShipping: (m: ShippingMethod) => void
}

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
        shippingMethod: 'standard',
        add: (productId, quantity = 1) => {
          const items = get().items
          const existing = items.find((i) => i.product_id === productId)
          commit(existing
            ? items.map((i) => (i.product_id === productId ? { ...i, quantity: Math.min(99, i.quantity + quantity) } : i))
            : [...items, { product_id: productId, quantity }])
        },
        setQuantity: (productId, quantity) =>
          commit(quantity <= 0
            ? get().items.filter((i) => i.product_id !== productId)
            : get().items.map((i) => (i.product_id === productId ? { ...i, quantity: Math.min(99, quantity) } : i))),
        remove: (productId) => commit(get().items.filter((i) => i.product_id !== productId)),
        clear: () => set({ items: [], couponCode: null, shippingMethod: 'standard' }),
        replace: (items) => set({ items }),
        setCoupon: (couponCode) => set({ couponCode }),
        setShipping: (shippingMethod) => set({ shippingMethod }),
      }
    },
    { name: 'om.cart', storage: createJSONStorage(() => localStorage), version: 1 },
  ),
)

export const cartCount = (items: CartLine[]) => items.reduce((n, i) => n + i.quantity, 0)

/** Called once after sign-in: fold the guest bag into the saved one. */
export async function mergeCartOnSignIn() {
  const { items, replace } = useCart.getState()
  const merged = await api<Cart>('/me/cart/merge', { body: { items } })
  replace(merged.items)
}
