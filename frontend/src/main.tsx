import { StrictMode, useEffect, type ReactNode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { hydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { routes } from './router'
import { startSession } from './lib/session'
import { initAnalytics } from './lib/analytics'
import { ApiError } from './lib/api'
import { rehydrateStores } from './lib/prerender'
import './styles.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
})

const router = createBrowserRouter(routes)
initAnalytics(router)

const root = document.getElementById('root')!
const app = (children: ReactNode = null) => (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {children}
    </QueryClientProvider>
  </StrictMode>
)

// Runs once, after React has adopted the prerendered HTML. Saved bag/wishlist state and the
// session start only now, so the first render matches the build-time HTML exactly.
let started = false
function AfterHydration() {
  useEffect(() => {
    if (started) return
    started = true
    rehydrateStores()
    startSession(queryClient)
  }, [])
  return null
}

const state = window.__PRERENDER_STATE__
if (state && root.firstElementChild) {
  // Build-time data; anything older than staleTime is refetched in the background straight away.
  hydrate(queryClient, state)
  hydrateRoot(root, app(<AfterHydration />), {
    onRecoverableError: (error) => console.warn('[hydration]', error),
  })
} else {
  rehydrateStores()
  startSession(queryClient)
  createRoot(root).render(app())
}
