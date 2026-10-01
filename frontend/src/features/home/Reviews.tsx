import { Link } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { ButtonLink } from '@/components/ui/Button'
import { Bolt, HeartPatch, SmileyFlower, Sparkle } from '@/components/scrapbook/Stickers'
import { useRecentReviews } from '@/lib/queries'
import { date } from '@/lib/format'
import type { ReviewWithProduct } from '@/lib/types'

const AVATARS = ['bg-pink', 'bg-butter', 'bg-mint', 'bg-sky', 'bg-peach', 'bg-lilac']

/** "Screenshots or it didn't happen": customer reviews as a text thread on a phone. */
export function Reviews() {
  const { data: reviews } = useRecentReviews(8)
  if (!reviews?.length) return null
  const average = reviews.reduce((n, r) => n + r.rating, 0) / reviews.length

  return (
    <Container className="py-16 sm:py-20">
      <div className="grain relative overflow-hidden rounded-[2.5rem] bg-lilac/70 px-6 py-12 sm:px-12 lg:px-16">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="relative lg:col-span-5">
            <p className="font-hand -rotate-2 text-lg text-plum">screenshots or it didn't happen <span aria-hidden="true">♡</span></p>
            <h2 className="mt-3 font-display text-5xl leading-[0.95] text-ink sm:text-6xl">What people are texting us</h2>
            <p className="mt-4 max-w-sm text-lg text-graphite">
              Real reviews from verified buyers, straight from the group chat.
            </p>

            <div className="mt-8 inline-flex items-center gap-4 rounded-2xl bg-paper px-5 py-4 shadow-[0_12px_24px_-14px_rgb(67_48_42/0.5)]">
              <p className="font-display text-5xl leading-none text-ink">{average.toFixed(1)}</p>
              <div>
                <Stars rating={Math.round(average)} />
                <p className="mt-1 text-sm text-smoke">across the latest {reviews.length} reviews</p>
              </div>
            </div>

            <div className="mt-8">
              <ButtonLink to="/bestsellers" size="lg">Shop the favourites</ButtonLink>
            </div>
            <Sparkle className="absolute -left-4 -top-8 hidden w-10 lg:block" />
          </div>

          <div className="relative flex justify-center lg:col-span-7">
            {/* Two favourite lines, cut out of the thread and taped on beside the phone */}
            {[...reviews].sort((a, b) => b.rating - a.rating).slice(0, 2).map((r, i) => (
              <PullQuote key={r.id} review={r} className={i === 0 ? 'left-0 top-24 -rotate-6' : 'bottom-28 left-[4%] rotate-3'} />
            ))}
            <Phone reviews={reviews} />
            <HeartPatch className="absolute bottom-4 left-[34%] hidden w-14 -rotate-12 sm:block" />
            <SmileyFlower className="absolute bottom-16 right-[8%] hidden w-20 rotate-12 sm:block" />
            <Bolt className="absolute right-[14%] top-4 hidden w-12 rotate-12 sm:block" color="#F2CBAE" />
          </div>
        </div>
      </div>
    </Container>
  )
}

function Phone({ reviews }: { reviews: ReviewWithProduct[] }) {
  return (
    <div className="w-full max-w-[22rem] rotate-2 rounded-[3rem] bg-ink p-3 shadow-[0_40px_60px_-30px_rgb(67_48_42/0.7)]">
      <div className="flex h-[620px] flex-col overflow-hidden rounded-[2.4rem] bg-paper-2">
        {/* Status bar + notch */}
        <div className="relative flex items-center justify-between px-7 pb-1 pt-3 text-xs font-semibold text-ink">
          <span>9:41</span>
          <span aria-hidden="true" className="absolute left-1/2 top-2 h-6 w-24 -translate-x-1/2 rounded-full bg-ink" />
          <span aria-hidden="true">●●● ▮</span>
        </div>
        {/* Chat header */}
        <div className="flex flex-col items-center gap-1 border-b border-rule pb-3 pt-2">
          <span className="grid size-12 place-items-center rounded-full bg-pink font-display text-2xl text-ink">O</span>
          <p className="text-sm font-semibold text-ink">Simply Odd</p>
          <p className="font-hand text-[11px] text-smoke">usually replies with ♡</p>
        </div>

        {/* Thread */}
        <ol className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4 scrollbar-none" aria-label="Customer reviews">
          <li className="max-w-[80%] self-end rounded-3xl rounded-br-md bg-accent px-4 py-2.5 text-sm text-paper">
            how's your odd thing doing? tell us everything ♡
          </li>
          {reviews.map((r, i) => <Message key={r.id} review={r} avatar={AVATARS[i % AVATARS.length]} />)}
        </ol>

        {/* Composer */}
        <div className="flex items-center gap-2 border-t border-rule px-3 py-3" aria-hidden="true">
          <span className="flex-1 rounded-full border border-rule bg-paper px-4 py-2 text-sm text-fog">Message</span>
          <span className="grid size-8 place-items-center rounded-full bg-accent text-paper">↑</span>
        </div>
      </div>
    </div>
  )
}

function Message({ review: r, avatar }: { review: ReviewWithProduct; avatar: string }) {
  const [first, last] = r.author_name.trim().split(/\s+/)
  const name = last ? `${first} ${last[0]}.` : first
  return (
    <li className="flex items-end gap-2">
      <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold text-ink ${avatar}`} aria-hidden="true">{first[0]}</span>
      <div className="max-w-[82%]">
        <p className="mb-1 ml-2 text-[11px] text-smoke">{name}</p>
        <div className="relative rounded-3xl rounded-bl-md bg-paper px-4 py-3 text-sm text-ink shadow-sm">
          <Stars rating={r.rating} small />
          {r.title && <p className="mt-1 font-semibold">{r.title}</p>}
          {r.body && <p className="mt-0.5 leading-snug text-graphite">{r.body}</p>}
          {/* The product, as an attachment */}
          <Link to={`/product/${r.product_slug}`} className="mt-2.5 flex items-center gap-2 rounded-2xl bg-paper-3 p-1.5 pr-3 hover:bg-pink">
            <span className="size-9 shrink-0 overflow-hidden rounded-xl bg-ash">
              {r.product_image && <img src={r.product_image} alt="" loading="lazy" className="h-full w-full object-cover" />}
            </span>
            <span className="truncate text-xs font-semibold">{r.product_name}</span>
          </Link>
          {r.verified && (
            <span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-pink text-xs text-ink shadow" title="Verified buyer" aria-label="Verified buyer">♥</span>
          )}
        </div>
        <p className="ml-2 mt-1 text-[10px] text-fog">{r.verified ? 'verified buyer · ' : ''}{date(r.created_at, { day: 'numeric', month: 'short' })}</p>
      </div>
    </li>
  )
}

function PullQuote({ review: r, className }: { review: ReviewWithProduct; className: string }) {
  const [first, last] = r.author_name.trim().split(/\s+/)
  return (
    <figure className={`tape absolute z-10 hidden w-52 rounded-3xl rounded-bl-md bg-paper p-4 shadow-[0_16px_30px_-16px_rgb(67_48_42/0.55)] xl:block ${className}`}>
      <Stars rating={r.rating} small />
      <blockquote className="mt-1 font-display text-xl leading-tight text-ink">“{r.title || r.body}”</blockquote>
      <figcaption className="font-hand mt-2 text-xs text-smoke">{first}{last ? ` ${last[0]}.` : ''} on {r.product_name}</figcaption>
    </figure>
  )
}

function Stars({ rating, small }: { rating: number; small?: boolean }) {
  return (
    <span className={`tracking-wider ${small ? 'text-sm' : 'text-lg'}`} role="img" aria-label={`${rating} out of 5 stars`}>
      <span className="text-accent">{'★'.repeat(rating)}</span><span className="text-ink/15">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}
