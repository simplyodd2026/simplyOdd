import { Link } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { Stars } from '@/components/ui/misc'
import { useRecentReviews } from '@/lib/queries'

/** Three recent reviews from verified buyers, each tied to the piece it's about. */
export function Reviews() {
  const { data: reviews } = useRecentReviews(6)
  if (!reviews?.length) return null
  const average = reviews.reduce((n, r) => n + r.rating, 0) / reviews.length
  // Show three different voices: skip reviews that repeat one already chosen.
  const shown = reviews.filter((r, i) => r.body && reviews.findIndex((o) => o.body === r.body) === i).slice(0, 3)

  return (
    <Container className="py-20 sm:py-28">
      <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 className="font-display text-[clamp(2.4rem,4.4vw,4.5rem)] leading-[0.95] text-ink">In people's homes</h2>
          <div className="mt-8 flex items-center gap-4">
            <p className="font-display text-6xl leading-none text-ink">{average.toFixed(1)}</p>
            <div>
              <Stars value={average} className="text-ink" />
              <p className="mt-1 text-[14px] text-smoke">From the latest {reviews.length} verified reviews</p>
            </div>
          </div>
        </div>
        <ul className="grid gap-10 sm:grid-cols-3 lg:col-span-8 lg:gap-8">
          {shown.map((r) => (
            <li key={r.id} className="flex flex-col border-t border-ink/70 pt-5">
              <Stars value={r.rating} size={13} className="text-ink" />
              <blockquote className="mt-4 flex-1 text-[17px] leading-[1.55] text-graphite">
                {r.title && <p className="mb-2 font-medium text-ink">{r.title}</p>}
                <p className="line-clamp-6">{r.body}</p>
              </blockquote>
              <div className="mt-6 flex items-center gap-3">
                {r.product_image && <img src={r.product_image} alt="" loading="lazy" className="size-12 rounded-full bg-paper-2 object-cover mix-blend-multiply" />}
                <div className="min-w-0 text-[13px]">
                  <p className="font-medium text-ink">{r.author_name}</p>
                  <Link to={`/product/${r.product_slug}`} className="link-draw truncate text-fog hover:text-ink">On {r.product_name}</Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  )
}
