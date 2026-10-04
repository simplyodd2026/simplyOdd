import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { Product, Review } from '@/lib/types'
import { api } from '@/lib/api'
import { useReviewEligibility, useReviews } from '@/lib/queries'
import { useSession } from '@/stores/session'
import { toast, toastError } from '@/stores/toast'
import { date, plural } from '@/lib/format'
import { Stars } from '@/components/ui/misc'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'

function RatingInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={plural(n, 'star')}
          onMouseEnter={() => setHover(n)} onClick={() => onChange(n)}
          className={cn('p-0.5 transition-colors', (hover || value) >= n ? 'text-ink' : 'text-ink/20')}>
          <Icon name="star" size={26} filled={(hover || value) >= n} />
        </button>
      ))}
    </div>
  )
}

function ReviewForm({ product, existing, onDone }: { product: Product; existing?: Review; onDone: () => void }) {
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [title, setTitle] = useState(existing?.title ?? '')
  const [body, setBody] = useState(existing?.body ?? '')
  const [busy, setBusy] = useState(false)
  const qc = useQueryClient()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rating) return toast('Choose a star rating first', { tone: 'error' })
    setBusy(true)
    try {
      if (existing) await api(`/reviews/${existing.id}`, { method: 'PATCH', body: { rating, title, body } })
      else await api(`/products/${product.id}/reviews`, { body: { rating, title, body } })
      toast(existing ? 'Review updated' : 'Review posted. Thank you.')
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['reviews', product.id] }),
        qc.invalidateQueries({ queryKey: ['review-eligibility', product.id] }),
        qc.invalidateQueries({ queryKey: ['product', product.slug] }),
      ])
      onDone()
    } catch (err) {
      toastError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-lg bg-paper-2 p-6 sm:p-8">
      <RatingInput value={rating} onChange={setRating} />
      <Input label="Headline" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Sum it up in a few words" />
      <Textarea label="Your review" value={body} onChange={(e) => setBody(e.target.value)} maxLength={3000}
        placeholder="How does it look in your space? Anything people should know?" />
      <div className="flex gap-2">
        <Button type="submit" loading={busy}>{existing ? 'Save review' : 'Post review'}</Button>
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  )
}

export function Reviews({ product }: { product: Product }) {
  const { data: reviews } = useReviews(product.id)
  const user = useSession((s) => s.user)
  const { data: eligibility } = useReviewEligibility(product.id)
  const [editing, setEditing] = useState(false)
  const location = useLocation()
  const qc = useQueryClient()
  const { average, count, distribution } = product.rating
  const mine = reviews?.find((r) => r.user_id === user?.uid)

  const remove = async (r: Review) => {
    try {
      await api(`/reviews/${r.id}`, { method: 'DELETE' })
      toast('Review deleted')
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['reviews', product.id] }),
        qc.invalidateQueries({ queryKey: ['review-eligibility', product.id] }),
        qc.invalidateQueries({ queryKey: ['product', product.slug] }),
      ])
    } catch (e) {
      toastError(e)
    }
  }

  return (
    <section id="reviews" className="scroll-mt-28 border-t border-rule pt-16 sm:pt-24">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="label mb-5 text-fog">Verified buyers</p>
          <h2 className="font-display text-[length:var(--text-heading)] leading-none text-ink">Reviews</h2>
          {count > 0 ? (
            <div className="mt-6">
              <div className="flex items-end gap-3">
                <span className="font-display text-7xl leading-none tabular-nums text-ink">{average.toFixed(1)}</span>
                <div className="pb-1">
                  <Stars value={average} size={16} className="text-ink" />
                  <p className="text-sm text-smoke">{plural(count, 'review')}</p>
                </div>
              </div>
              <dl className="mt-6 flex flex-col gap-1.5">
                {[5, 4, 3, 2, 1].map((n) => {
                  const c = distribution[String(n)] ?? 0
                  return (
                    <div key={n} className="flex items-center gap-3 text-sm">
                      <dt className="w-12 tabular-nums text-[12px] text-smoke">{n} star</dt>
                      <dd className="h-px flex-1 bg-rule"><div className="h-full bg-ink" style={{ width: `${count ? (c / count) * 100 : 0}%` }} /></dd>
                      <span className="w-6 text-right tabular-nums text-[12px] text-fog">{c}</span>
                    </div>
                  )
                })}
              </dl>
            </div>
          ) : (
            <p className="mt-4 text-smoke">No reviews yet.</p>
          )}

          <div className="mt-8">
            {!user ? (
              <p className="text-sm text-smoke">
                Bought this? <Link to={`/login?next=${encodeURIComponent(location.pathname + '#reviews')}`} className="link-draw text-ink">Sign in</Link> to review it.
              </p>
            ) : eligibility?.can_review && !mine && !editing ? (
              <Button variant="outline" onClick={() => setEditing(true)}>Write a review</Button>
            ) : eligibility && !eligibility.can_review ? (
              <p className="text-sm text-smoke">{eligibility.reason}</p>
            ) : null}
          </div>
        </div>

        <div className="lg:col-span-8">
          {editing && <div className="mb-8"><ReviewForm product={product} existing={mine} onDone={() => setEditing(false)} /></div>}
          {reviews && reviews.length > 0 ? (
            <ul className="divide-y divide-rule border-y border-rule">
              {reviews.map((r) => (
                <li key={r.id} className="py-8">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Stars value={r.rating} className="text-ink" />
                    <span className="tabular-nums text-[12px] text-fog">{date(r.created_at)}</span>
                  </div>
                  {r.title && <p className="mt-4 font-display text-2xl text-ink">{r.title}</p>}
                  {r.body && <p className="mt-1 max-w-2xl leading-relaxed text-smoke">{r.body}</p>}
                  <p className="mt-4 text-sm text-ink">
                    {r.author_name}{r.verified && <span className="label ml-3 text-fog">Verified buyer</span>}
                  </p>
                  {r.user_id === user?.uid && !editing && (
                    <div className="mt-3 flex gap-4 text-sm">
                      <button onClick={() => setEditing(true)} className="link-draw text-ink">Edit</button>
                      <button onClick={() => remove(r)} className="link-draw text-smoke hover:text-accent">Delete</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : !editing && (
            <p className="border-y border-rule py-10 text-smoke">No reviews yet. Reviews are open to verified buyers of this piece.</p>
          )}
        </div>
      </div>
    </section>
  )
}
