import { useRouteError } from 'react-router-dom'
import { Wordmark } from '@/components/brand/Wordmark'

/** Last-resort screen when a page crashes. Kept dependency-free so it renders even if the layout is what broke. */
export default function RouteError() {
  const error = useRouteError()
  if (import.meta.env.DEV) console.error(error)
  const chunkFailed = error instanceof Error && /dynamically imported module|Failed to fetch/i.test(error.message)
  return (
    <div className="grid min-h-dvh place-items-center bg-paper px-4 text-graphite">
      <div className="max-w-xl">
        <a href="/" className="text-2xl text-ink"><Wordmark /></a>
        <h1 className="mt-10 text-5xl font-display leading-[0.95] sm:text-6xl">
          {chunkFailed ? 'The site was updated while you were here.' : 'This page broke.'}
        </h1>
        <p className="mt-5 text-lg text-smoke">
          {chunkFailed ? 'Reload to get the latest version. Your bag is saved.' : 'Reload the page to try again. Your bag and wishlist are saved. If it keeps happening, email hello@simplyodd.in.'}
        </p>
        <div className="mt-8 flex gap-3">
          <button onClick={() => window.location.reload()} className="h-12 rounded-full bg-accent px-6 font-medium text-paper hover:bg-accent">Reload page</button>
          <a href="/" className="inline-flex h-12 items-center rounded-full border border-graphite/40 px-6 hover:border-accent">Go to the homepage</a>
        </div>
      </div>
    </div>
  )
}
