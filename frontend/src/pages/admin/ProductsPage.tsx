import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, qs } from '@/lib/api'
import type { Page, Product } from '@/lib/types'
import { useCategories } from '@/lib/queries'
import { useDebounced, useDocumentTitle } from '@/lib/hooks'
import { money } from '@/lib/format'
import { toast, toastError } from '@/stores/toast'
import { AdminHeader, FilterSelect, SearchInput, Table, td } from '@/features/admin/ui'
import { ButtonLink } from '@/components/ui/Button'
import { Pagination, Skeleton } from '@/components/ui/misc'
import { cn } from '@/lib/cn'

export default function ProductsPage() {
  useDocumentTitle('Products')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebounced(q, 200)
  const qc = useQueryClient()
  const { data: categories } = useCategories()
  const catName = (id: string | null) => categories?.find((c) => c.id === id)?.name ?? '—'
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'products', dq, status, category, page],
    queryFn: () => api<Page<Product>>(`/admin/products${qs({ q: dq, status, category, page, page_size: 25 })}`),
    placeholderData: keepPreviousData,
  })

  const togglePublish = async (p: Product) => {
    try {
      await api(`/admin/products/${p.id}`, { method: 'PATCH', body: { is_published: !p.is_published } })
      toast(p.is_published ? `${p.name} unpublished` : `${p.name} published`)
      qc.invalidateQueries({ queryKey: ['admin', 'products'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    } catch (e) { toastError(e) }
  }

  return (
    <div>
      <AdminHeader title="Products" sub={data ? `${data.total} products` : undefined} actions={<ButtonLink to="/admin/products/new">New product</ButtonLink>} />
      <div className="mb-5 flex flex-wrap gap-2">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1) }} placeholder="Search products" />
        <FilterSelect label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1) }}
          options={[['', 'All statuses'], ['published', 'Published'], ['draft', 'Drafts'], ['low_stock', 'Low stock'], ['out_of_stock', 'Sold out']]} />
        <FilterSelect label="Category" value={category} onChange={(v) => { setCategory(v); setPage(1) }}
          options={[['', 'All categories'], ...(categories ?? []).map((c) => [c.slug, c.name] as [string, string])]} />
      </div>
      {isLoading ? <Skeleton className="h-96" /> : (
        <Table head={['', 'Product', 'Category', 'Price', 'Stock', 'Labels', 'Visible']}>
          {data?.items.map((p) => (
            <tr key={p.id} className="hover:bg-black/[0.02]">
              <td className={`${td} w-14`}><img src={p.images[0]?.url} alt="" className="aspect-[4/5] w-10 bg-ash object-cover" /></td>
              <td className={td}>
                <Link to={`/admin/products/${p.id}`} className="font-medium hover:text-accent">{p.name}</Link>
                <div className="text-xs text-fog">/{p.slug}</div>
              </td>
              <td className={`${td} text-smoke`}>{catName(p.category_id)}</td>
              <td className={`${td} tabular-nums`}>{money(p.price)}{p.discount_percent > 0 && <span className="ml-2 text-xs text-accent">−{p.discount_percent}%</span>}</td>
              <td className={cn(td, 'tabular-nums', p.stock === 0 ? 'text-accent' : p.stock <= 5 ? 'text-graphite' : 'text-smoke')}>{p.stock}</td>
              <td className={`${td} text-xs text-smoke`}>{[p.is_featured && 'Featured', p.is_bestseller && 'Best seller', p.is_new_arrival && 'New'].filter(Boolean).join(', ') || '—'}</td>
              <td className={td}>
                <button onClick={() => togglePublish(p)} role="switch" aria-checked={p.is_published} aria-label={`${p.name} visible in store`}
                  className={cn('relative h-5 w-9 rounded-full transition-colors', p.is_published ? 'bg-accent' : 'bg-rule')}>
                  <span className={cn('absolute top-0.5 size-4 rounded-full bg-ink transition-all', p.is_published ? 'left-[18px]' : 'left-0.5')} />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {data && <div className="mt-6 flex justify-center"><Pagination page={data.page} pages={data.pages} onChange={setPage} /></div>}
    </div>
  )
}
