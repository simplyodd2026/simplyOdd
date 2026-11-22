import type { DehydratedState } from '@tanstack/react-query'
import { useCart } from '@/stores/cart'
import { useRecentSearches } from '@/stores/recentSearches'
import { useWishlist } from '@/stores/wishlist'

declare global {
  interface Window {
    /** React Query cache the page was prerendered with (scripts/prerender.mjs). Present only on prerendered pages. */
    __PRERENDER_STATE__?: DehydratedState
  }
}

/**
 * True while rendering a page at build time and during the browser's first render of that page (hydration).
 * Both must produce identical markup, so first-load animations that start hidden are skipped in this mode.
 * False on every other page load, which renders in the browser as before.
 */
export const prerendered = typeof window === 'undefined' || !!window.__PRERENDER_STATE__

/** Loads the bag, wishlist and recent searches saved in this browser. */
export function rehydrateStores() {
  void useCart.persist.rehydrate()
  void useWishlist.persist.rehydrate()
  void useRecentSearches.persist.rehydrate()
}
