import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Page, Product, Review } from '@/lib/types'
import { useDocumentTitle } from '@/lib/hooks'
import { date } from '@/lib/format'
import { toast, toastError } from '@/stores/toast'
import { AdminHeader } from '@/features/admin/ui'
import { Stars } from '@/components/ui/misc'

export default function ReviewsPage() {
  useDocumentTitle('Reviews')
  const qc = useQueryClient()
  const { data: reviews } = useQuery({ queryKey: ['admin', 'reviews'], queryFn: () => api<Review[]>('/admin/reviews') })
  const { data: products } = useQuery({ queryKey: ['admin', 'products', 'all'], queryFn: () => api<Page<Product>>('/admin/products?page_size=100') })
  const name = (id: string) => products?.items.find((p) => p.id === id)?.name ?? 'Deleted product'

  const remove = async (r: Review) => {
    try {
      await api(`/reviews/${r.id}`, { method: 'DELETE' })
      toast('Review removed')
      qc.invalidateQueries({ queryKey: ['admin', 'reviews'] })
    } catch (e) { toastError(e) }
  }

  return (
    <div>
      <AdminHeader title="Reviews" sub="Only verified purchasers can post. Remove anything abusive or off-topic." />
      {!reviews?.length ? <p className="text-smoke">No reviews yet.</p> : (
        <ul className="divide-y divide-rule border-y border-rule">
          {reviews.map((r) => (
            <li key={r.id} className="grid gap-3 py-5 sm:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <Stars value={r.rating} className="text-accent" />
                  <Link to={`/admin/products/${r.product_id}`} className="text-sm hover:text-accent">{name(r.product_id)}</Link>
                  <span className="text-sm text-fog">{r.author_name}, {date(r.created_at)}</span>
                </div>
                {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
                <p className="mt-1 max-w-3xl text-smoke">{r.body}</p>
              </div>
              <button onClick={() => remove(r)} className="self-start text-sm text-smoke underline underline-offset-4 hover:text-accent">Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
