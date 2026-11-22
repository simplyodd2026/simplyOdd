// Build-time renderer for scripts/prerender.mjs: renders a URL with the real app (same routes, same
// components) to HTML, plus the React Query cache it was rendered with, so the browser can hydrate it.
// Never shipped to the browser; it runs in Node during `npm run build`.
import { StrictMode } from 'react'
import { prerender } from 'react-dom/static'
import { dehydrate, QueryClient, QueryClientProvider, type DehydratedState, type Query } from '@tanstack/react-query'
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router-dom'
import { routes } from './router'

export { productJsonLd, productMeta, collectionJsonLd, collectionMeta, ldJson, SITE_URL } from './lib/seo'

async function toHtml(url: string, client: QueryClient): Promise<string> {
  const handler = createStaticHandler(routes)
  const context = await handler.query(new Request(url))
  if (context instanceof Response) throw new Error(`Route for ${url} redirected (${context.status})`)
  const router = createStaticRouter(handler.dataRoutes, context)
  const { prelude } = await prerender(
    <StrictMode>
      <QueryClientProvider client={client}>
        <StaticRouterProvider router={router} context={context} hydrate={false} />
      </QueryClientProvider>
    </StrictMode>,
  )
  return new Response(prelude).text()
}

// A query switched off for this visitor (say, one that needs a signed-in user) is never fetched here.
function enabled(q: Query): boolean {
  const e = (q.options as { enabled?: boolean | ((q: Query) => boolean) }).enabled
  return typeof e === 'function' ? e(q) : e !== false
}

export interface Rendered { html: string; state: DehydratedState; status: number }

/**
 * Renders until every query the page asks for has data: each pass records the queries the components
 * create, fetches the pending ones, and renders again. Queries only run on the server when the page
 * would run them for a signed-out visitor, so nothing personal is ever fetched.
 */
export async function render(url: string): Promise<Rendered> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 2, staleTime: Infinity, gcTime: Infinity } } })
  let html = ''
  for (let pass = 0; pass < 5; pass++) {
    html = await toHtml(url, client)
    const pending = client.getQueryCache().findAll({
      predicate: (q) => q.state.data === undefined && q.state.status !== 'error' && enabled(q),
    })
    if (!pending.length) break
    await Promise.all(pending.map((q) => client.prefetchQuery({ ...q.options, queryKey: q.queryKey })))
  }
  const failed = client.getQueryCache().findAll({ predicate: (q) => q.state.status === 'error' })
  const notFound = failed.some((q) => (q.state.error as { status?: number })?.status === 404)
  if (failed.length && !notFound) {
    throw new Error(`Couldn't load data for ${url}: ${failed.map((q) => JSON.stringify(q.queryKey)).join(', ')}`)
  }
  // Only successful data goes to the browser; failed queries are simply fetched again there.
  const state = dehydrate(client, { shouldDehydrateQuery: (q) => q.state.status === 'success' })
  return { html, state, status: notFound ? 404 : 200 }
}
