import { useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const subscribe = () => () => {}

/**
 * False on the server and during hydration of a prerendered page, true otherwise. Lets browser-only
 * UI appear right after hydration without making the first render differ from the HTML.
 */
export const useHydrated = () => useSyncExternalStore(subscribe, () => true, () => false)

/** createPortal into <body>, skipped while prerendering and hydrating (the server can't render portals). */
export function ClientPortal({ children }: { children: ReactNode }) {
  return useHydrated() ? createPortal(children, document.body) : null
}
