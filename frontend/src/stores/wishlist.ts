import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api } from '@/lib/api'
import type { Product } from '@/lib/types'
import { isSignedIn } from './session'
import { toast, toastError } from './toast'

interface WishlistOut { product_ids: string[]; products: Product[] }

interface WishlistState {
  ids: string[]
  toggle: (productId: string, name?: string) => Promise<void>
  remove: (productId: string) => Promise<void>
  replace: (ids: string[]) => void
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: async (productId, name) => {
        const had = get().ids.includes(productId)
        const prev = get().ids
        set({ ids: had ? prev.filter((i) => i !== productId) : [...prev, productId] })
        toast(had ? `Removed ${name ?? 'item'} from your wishlist` : `Saved ${name ?? 'item'} to your wishlist`,
          had ? undefined : { action: { label: 'View wishlist', href: '/wishlist' } })
        if (!isSignedIn()) return
        try {
          const out = had
            ? await api<WishlistOut>(`/me/wishlist/${productId}`, { method: 'DELETE' })
            : await api<WishlistOut>('/me/wishlist', { body: { product_ids: [productId] } })
          set({ ids: out.product_ids })
        } catch (e) {
          set({ ids: prev })
          toastError(e)
        }
      },
      remove: async (productId) => {
        set({ ids: get().ids.filter((i) => i !== productId) })
        if (isSignedIn()) await api(`/me/wishlist/${productId}`, { method: 'DELETE' }).catch(() => undefined)
      },
      replace: (ids) => set({ ids }),
    }),
    { name: 'om.wishlist', storage: createJSONStorage(() => localStorage) },
  ),
)

export async function mergeWishlistOnSignIn() {
  const { ids, replace } = useWishlist.getState()
  const out = ids.length
    ? await api<WishlistOut>('/me/wishlist', { body: { product_ids: ids } })
    : await api<WishlistOut>('/me/wishlist')
  replace(out.product_ids)
}
