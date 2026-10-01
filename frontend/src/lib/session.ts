import { auth } from './auth'
import { refreshProfile } from './queries'
import { useSession } from '@/stores/session'
import { mergeCartOnSignIn, useCart } from '@/stores/cart'
import { mergeWishlistOnSignIn, useWishlist } from '@/stores/wishlist'
import type { QueryClient } from '@tanstack/react-query'

/** Keeps the session store in step with the auth provider and folds guest
 *  bag/wishlist into the account on sign-in. */
export function startSession(queryClient: QueryClient) {
  let lastUid: string | null | undefined
  return auth.onChange(async (user) => {
    const { set } = useSession.getState()
    const uid = user?.uid ?? null
    const changed = uid !== lastUid
    set({ user })
    if (!user) {
      if (lastUid) {
        // Signed out: don't leave the account's bag/wishlist on a shared device.
        useCart.getState().clear()
        useWishlist.getState().replace([])
        queryClient.removeQueries({ queryKey: ['my-orders'] })
      }
      lastUid = null
      set({ profile: null, ready: true })
      return
    }
    lastUid = uid
    if (!changed) return
    try {
      await Promise.all([refreshProfile(), mergeCartOnSignIn(), mergeWishlistOnSignIn()])
    } catch {
      /* the API may be down; storefront still works from local state */
    } finally {
      set({ ready: true })
    }
  })
}
