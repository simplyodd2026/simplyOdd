import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, qs } from '@/lib/api'
import type { Page, Product, ProductImage, ProductInput } from '@/lib/types'
import { useCategories } from '@/lib/queries'
import { useDocumentTitle } from '@/lib/hooks'
import { toast, toastError } from '@/stores/toast'
import { AdminHeader } from '@/features/admin/ui'
import { Button } from '@/components/ui/Button'
import { Checkbox, Input, Select, Textarea } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Overlay'
import { PageSpinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'

const EMPTY: ProductInput = {
  name: '', slug: '', tagline: '', description: '', price: 0, compare_at_price: null, stock: 0, category_id: null,
  tags: [], materials: [], dimensions: {}, weight_g: null, manufacturing: '', images: [],
  is_featured: false, is_bestseller: false, is_new_arrival: true, is_published: false, frequently_bought_with: [],
}

const toInput = (p: Product): ProductInput => ({
  name: p.name, slug: p.slug, tagline: p.tagline, description: p.description, price: p.price, compare_at_price: p.compare_at_price,
  stock: p.stock, category_id: p.category_id, tags: p.tags, materials: p.materials, dimensions: p.dimensions, weight_g: p.weight_g,
  manufacturing: p.manufacturing, images: p.images, is_featured: p.is_featured, is_bestseller: p.is_bestseller,
  is_new_arrival: p.is_new_arrival, is_published: p.is_published, frequently_bought_with: p.frequently_bought_with,
})

const numOrNull = (v: string) => (v.trim() === '' || Number.isNaN(Number(v)) ? null : Number(v))

export default function ProductEditPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: categories } = useCategories()
  const { data: product, isLoading } = useQuery({ queryKey: ['admin', 'product', id], queryFn: () => api<Product>(`/admin/products/${id}`), enabled: !isNew })
  const { data: allProducts } = useQuery({ queryKey: ['admin', 'products', 'all'], queryFn: () => api<Page<Product>>(`/admin/products${qs({ page_size: 100 })}`) })
  const [form, setForm] = useState<ProductInput>(EMPTY)
  const [tagsText, setTagsText] = useState('')
  const [materialsText, setMaterialsText] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pairSearch, setPairSearch] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  useDocumentTitle(isNew ? 'New product' : product?.name)

  useEffect(() => {
    if (product) {
      setForm(toInput(product))
      setTagsText(product.tags.join(', '))
      setMaterialsText(product.materials.join('\n'))
    }
  }, [product])

  if (!isNew && (isLoading || !product)) return <PageSpinner />

  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  const payload = (): ProductInput => ({
    ...form,
    slug: form.slug?.trim() || null,
    tags: tagsText.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
    materials: materialsText.split('\n').map((t) => t.trim()).filter(Boolean),
  })

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Give the product a name'
    if (!(form.price > 0)) e.price = 'Set a price above zero'
    if (form.compare_at_price !== null && form.compare_at_price <= form.price) e.compare_at_price = 'Must be higher than the price, or leave empty'
    setErrors(e)
    return !Object.keys(e).length
  }

  const save = async () => {
    if (!validate()) return
    setBusy(true)
    try {
      const saved = isNew
        ? await api<Product>('/admin/products', { body: payload() })
        : await api<Product>(`/admin/products/${id}`, { method: 'PATCH', body: payload() })
      qc.invalidateQueries({ queryKey: ['admin'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['product'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast(isNew ? 'Product created. Add some images next.' : 'Product saved')
      if (isNew) navigate(`/admin/products/${saved.id}`, { replace: true })
      else qc.setQueryData(['admin', 'product', id], saved)
    } catch (e) { toastError(e) } finally { setBusy(false) }
  }

  const upload = async (files: FileList) => {
    if (!id) return
    const fd = new FormData()
    Array.from(files).forEach((f) => fd.append('files', f))
    setUploading(true)
    try {
      const updated = await api<Product>(`/admin/products/${id}/images`, { form: fd })
      setForm((f) => ({ ...f, images: updated.images }))
      qc.setQueryData(['admin', 'product', id], updated)
      toast(`Uploaded ${files.length} image${files.length > 1 ? 's' : ''}`)
    } catch (e) { toastError(e) } finally { setUploading(false) }
  }

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= form.images.length || from === to) return
    const imgs = [...form.images]
    const [m] = imgs.splice(from, 1)
    imgs.splice(to, 0, m)
    set('images', imgs)
  }
  const updateImage = (i: number, patch: Partial<ProductImage>) => set('images', form.images.map((img, j) => (j === i ? { ...img, ...patch } : img)))

  const remove = async () => {
    setBusy(true)
    try {
      await api(`/admin/products/${id}`, { method: 'DELETE' })
      qc.invalidateQueries({ queryKey: ['admin'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      toast('Product deleted')
      navigate('/admin/products')
    } catch (e) { toastError(e) } finally { setBusy(false) }
  }

  const card = 'flex flex-col gap-5 border border-rule p-5 sm:p-6'
  const h2 = 'text-lg font-semibold'
  const others = allProducts?.items.filter((p) => p.id !== id) ?? []
  // The search narrows the pairing list by name; the order stays fixed so rows don't jump as you tick them.
  const pairOptions = others.filter((p) => p.name.toLowerCase().includes(pairSearch.trim().toLowerCase()))

  return (
    <div>
      <Link to="/admin/products" className="text-sm text-fog hover:text-ink">All products</Link>
      <AdminHeader title={isNew ? 'New product' : form.name || 'Untitled'}
        actions={<>
          {!isNew && product?.is_published && <Button variant="ghost" onClick={() => window.open(`/product/${product.slug}`, '_blank')}><Icon name="external" size={16} /> View in store</Button>}
          <Button loading={busy} onClick={save}>{isNew ? 'Create product' : 'Save changes'}</Button>
        </>} />

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="flex flex-col gap-6 xl:col-span-8">
          <section className={card}>
            <h2 className={h2}>Basics</h2>
            <Input label="Name" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
            <Input label="URL slug" value={form.slug ?? ''} onChange={(e) => set('slug', e.target.value)} hint="Leave empty to generate from the name" />
            <Input label="Tagline" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} hint="One short line shown under the name" />
            <Textarea label="Description" rows={6} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </section>

          <section className={card}>
            <div className="flex items-center justify-between">
              <h2 className={h2}>Images</h2>
              <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.length) void upload(e.target.files); e.target.value = '' }} />
              <Button variant="outline" size="sm" disabled={isNew} loading={uploading} onClick={() => fileRef.current?.click()}><Icon name="upload" size={16} /> Upload</Button>
            </div>
            {isNew ? <p className="text-sm text-smoke">Create the product first, then upload images.</p> : form.images.length === 0 ? (
              <button onClick={() => fileRef.current?.click()} className="flex h-40 items-center justify-center border border-dashed border-rule text-smoke hover:border-accent">Upload the first image</button>
            ) : (
              <>
                <p className="text-sm text-fog">Drag to reorder. The first image is the main one; the second shows on hover. Save to apply changes.</p>
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {form.images.map((img, i) => (
                    <li key={img.url} draggable onDragStart={() => setDragIndex(i)} onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { if (dragIndex !== null) moveImage(dragIndex, i); setDragIndex(null) }}
                      className={cn('flex flex-col gap-2', dragIndex === i && 'opacity-40')}>
                      <div className="relative cursor-grab bg-ash">
                        <img src={img.url} alt={img.alt} className="aspect-[4/5] w-full object-cover" />
                        {i === 0 && <span className="absolute left-2 top-2 bg-accent px-1.5 py-0.5 text-xs text-paper">Main</span>}
                      </div>
                      <input value={img.alt} onChange={(e) => updateImage(i, { alt: e.target.value })} placeholder="Describe the image"
                        aria-label={`Alt text for image ${i + 1}`} className="h-8 border border-rule bg-transparent px-2 text-xs outline-none focus:border-accent" />
                      <div className="flex items-center justify-between text-smoke">
                        <div className="flex">
                          <button onClick={() => moveImage(i, i - 1)} disabled={i === 0} className="p-1 hover:text-ink disabled:opacity-30" aria-label="Move earlier"><Icon name="chevronLeft" size={16} /></button>
                          <button onClick={() => moveImage(i, i + 1)} disabled={i === form.images.length - 1} className="p-1 hover:text-ink disabled:opacity-30" aria-label="Move later"><Icon name="chevronRight" size={16} /></button>
                        </div>
                        <button onClick={() => set('images', form.images.filter((_, j) => j !== i))} className="p-1 hover:text-accent" aria-label="Remove image"><Icon name="trash" size={16} /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className={card}>
            <h2 className={h2}>Details</h2>
            <Textarea label="Materials" rows={3} value={materialsText} onChange={(e) => setMaterialsText(e.target.value)} hint="One per line" />
            <div className="grid gap-4 sm:grid-cols-4">
              <Input label="Width (cm)" inputMode="decimal" value={form.dimensions.width_cm ?? ''} onChange={(e) => set('dimensions', { ...form.dimensions, width_cm: numOrNull(e.target.value) })} />
              <Input label="Height (cm)" inputMode="decimal" value={form.dimensions.height_cm ?? ''} onChange={(e) => set('dimensions', { ...form.dimensions, height_cm: numOrNull(e.target.value) })} />
              <Input label="Depth (cm)" inputMode="decimal" value={form.dimensions.depth_cm ?? ''} onChange={(e) => set('dimensions', { ...form.dimensions, depth_cm: numOrNull(e.target.value) })} />
              <Input label="Weight (g)" inputMode="numeric" value={form.weight_g ?? ''} onChange={(e) => set('weight_g', numOrNull(e.target.value))} />
            </div>
            <Textarea label="How it's made" rows={3} value={form.manufacturing} onChange={(e) => set('manufacturing', e.target.value)} />
          </section>
        </div>

        <div className="flex flex-col gap-6 xl:col-span-4">
          <section className={card}>
            <h2 className={h2}>Visibility</h2>
            <Checkbox label="Published in the store" checked={form.is_published} onChange={(e) => set('is_published', e.target.checked)} />
            <Checkbox label="Featured on the homepage" checked={form.is_featured} onChange={(e) => set('is_featured', e.target.checked)} />
            <Checkbox label="Best seller" checked={form.is_bestseller} onChange={(e) => set('is_bestseller', e.target.checked)} />
            <Checkbox label="New arrival" checked={form.is_new_arrival} onChange={(e) => set('is_new_arrival', e.target.checked)} />
          </section>

          <section className={card}>
            <h2 className={h2}>Price and stock</h2>
            <Input label="Price (₹)" inputMode="decimal" value={form.price || ''} onChange={(e) => set('price', Number(e.target.value) || 0)} error={errors.price} />
            <Input label="Compare-at price (₹)" inputMode="decimal" value={form.compare_at_price ?? ''} onChange={(e) => set('compare_at_price', numOrNull(e.target.value))}
              error={errors.compare_at_price} hint={form.compare_at_price && form.compare_at_price > form.price ? `Shows as ${Math.round((1 - form.price / form.compare_at_price) * 100)}% off` : 'Set higher than the price to show a discount'} />
            <Input label="Stock" inputMode="numeric" value={form.stock} onChange={(e) => set('stock', Math.max(0, parseInt(e.target.value, 10) || 0))} />
          </section>

          <section className={card}>
            <h2 className={h2}>Organisation</h2>
            <Select label="Category" value={form.category_id ?? ''} onChange={(e) => set('category_id', e.target.value || null)}>
              <option value="">No category</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input label="Tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} hint="Comma separated; used by search" />
            <div className="flex flex-col gap-1.5">
              <span className="flex items-baseline justify-between text-sm">
                <span className="opacity-80">Frequently bought with</span>
                {form.frequently_bought_with.length > 0 && <span className="text-[13px] text-fog">{form.frequently_bought_with.length} selected</span>}
              </span>
              <div className="border border-rule">
                <label className="flex items-center gap-2 border-b border-rule px-3">
                  <Icon name="search" size={15} className="shrink-0 text-fog" />
                  <span className="sr-only">Search products</span>
                  <input type="search" value={pairSearch} onChange={(e) => setPairSearch(e.target.value)} placeholder="Search products"
                    className="h-10 w-full bg-transparent text-sm text-ink outline-none placeholder:text-fog" />
                </label>
                <ul className="max-h-56 overflow-y-auto py-1">
                  {pairOptions.map((p) => (
                    <li key={p.id}>
                      <Checkbox className="flex w-full px-3 py-2 text-sm hover:bg-ink/[0.04]" label={p.name} checked={form.frequently_bought_with.includes(p.id)}
                        onChange={(e) => set('frequently_bought_with', e.target.checked ? [...form.frequently_bought_with, p.id] : form.frequently_bought_with.filter((x) => x !== p.id))} />
                    </li>
                  ))}
                  {pairOptions.length === 0 && <li className="px-3 py-3 text-sm text-fog">{others.length ? `No products match “${pairSearch}”.` : 'No other products yet.'}</li>}
                </ul>
              </div>
            </div>
          </section>

          {!isNew && <Button variant="danger" onClick={() => setConfirmDelete(true)}><Icon name="trash" size={16} /> Delete product</Button>}
        </div>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Delete ${form.name}?`}>
        <p className="text-smoke">This removes the product and its images permanently. Past orders keep their copy of the details. To hide it temporarily, unpublish it instead.</p>
        <div className="mt-6 flex gap-3">
          <Button variant="danger" loading={busy} onClick={remove}>Delete product</Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Keep it</Button>
        </div>
      </Modal>
    </div>
  )
}
