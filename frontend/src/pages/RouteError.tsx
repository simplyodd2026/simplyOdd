import { useRouteError } from 'react-router-dom'
import { Wordmark } from '@/components/brand/Wordmark'

/** Last-resort screen when a page crashes. Kept dependency-free so it renders even if the layout is what broke. */
export default function RouteError() {
  const error = useRouteError()
  if (import.meta.env.DEV) console.error(error)
  const chunkFailed = error instanceof Error && /dynamically imported module|Failed to fetch/i.test(error.message)
  return (
    <div className="grid min-h-dvh place-items-center bg-paper px-5 text-graphite">
      <div className="max-w-2xl">
        <a href="/" className="text-3xl text-ink"><Wordmark /></a>
        <h1 className="mt-14 font-display text-5xl leading-[0.95] text-ink sm:text-7xl">
          {chunkFailed ? 'The site has been updated.' : 'Something went wrong.'}
        </h1>
        <p className="mt-6 text-lg text-smoke">
          {chunkFailed ? 'Reload to get the latest version. Your bag is saved.' : 'Reload the page to try again. Your bag and saved pieces are kept. If it keeps happening, email hello@simplyodd.in.'}
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <button onClick={() => window.location.reload()} className="h-14 rounded-full bg-ink px-8 text-[15px] text-paper transition-colors hover:bg-hot">Reload page</button>
          <a href="/" className="inline-flex h-14 items-center rounded-full border border-ink/20 px-8 text-[15px] text-ink transition-colors hover:border-ink">Go to the homepage</a>
        </div>
      </div>
    </div>
  )
}
