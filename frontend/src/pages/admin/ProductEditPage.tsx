import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, qs } from '@/lib/api'
import type { Page, PersonalizationField, Product, ProductImage, ProductInput, ProductVariant } from '@/lib/types'
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
import { useFilaments } from '@/lib/filaments'
import { Swatch } from '@/components/product/ColorSwatches'

const EMPTY: ProductInput = {
  name: '', slug: '', tagline: '', description: '', price: 0, compare_at_price: null, category_ids: [],
  tags: [], materials: [], dimensions: {}, weight_g: null, manufacturing: '', images: [],
  is_featured: false, is_bestseller: false, is_new_arrival: true, is_published: false, frequently_bought_with: [],
  colors: [], default_color: null, personalization: [], personalization_fee: 0,
  variant_label: '', variants: [], default_variant: null,
}

const MAX_FIELDS = 5
// Starting points for common made-to-order pieces; every field stays editable.
const PRESETS: { label: string; fields: Omit<PersonalizationField, 'key'>[] }[] = [
  { label: 'Keychain name', fields: [{ label: 'Name', placeholder: 'e.g. Aanya', max_length: 12, required: true }] },
  { label: 'Name plate', fields: [
    { label: 'Name', placeholder: 'e.g. The Sharmas', max_length: 24, required: true },
    { label: 'Second line', placeholder: 'e.g. House no. 12', max_length: 30, required: false },
  ] },
  { label: 'Initials', fields: [{ label: 'Initials', placeholder: 'e.g. AK', max_length: 3, required: true }] },
]

/** A key for a new field from its label, unique among the others. Kept when the label is later edited. */
function fieldKey(label: string, taken: string[]) {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20) || 'text'
  let key = base
  for (let n = 2; taken.includes(key); n++) key = `${base}_${n}`
  return key
}
const withKeys = (fields: Omit<PersonalizationField, 'key'>[]) =>
  fields.reduce<PersonalizationField[]>((all, f) => [...all, { ...f, key: fieldKey(f.label, all.map((x) => x.key)) }], [])

const MAX_VARIANTS = 6
// Starting points for pieces sold in versions; labels and prices stay editable.
const VARIANT_PRESETS: { label: string; name: string; variants: string[] }[] = [
  { label: 'Frame', name: 'Frame', variants: ['Without frame', 'With frame'] },
  { label: 'Size', name: 'Size', variants: ['Small', 'Large'] },
]

const GROUPS = [['essential', 'Essentials'], ['extended', 'Extended'], ['special', 'Special finishes']] as const

const toInput = (p: Product): ProductInput => ({
  name: p.name, slug: p.slug, tagline: p.tagline, description: p.description, price: p.price, compare_at_price: p.compare_at_price,
  category_ids: p.category_ids, tags: p.tags, materials: p.materials, dimensions: p.dimensions, weight_g: p.weight_g,
  manufacturing: p.manufacturing, images: p.images, is_featured: p.is_featured, is_bestseller: p.is_bestseller,
  is_new_arrival: p.is_new_arrival, is_published: p.is_published, frequently_bought_with: p.frequently_bought_with,
  colors: p.colors, default_color: p.default_color,
  personalization: p.personalization ?? [], personalization_fee: p.personalization_fee ?? 0,
  variant_label: p.variant_label ?? '', variants: p.variants ?? [], default_variant: p.default_variant ?? null,
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
  const [pairCategory, setPairCategory] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const filaments = useFilaments()
  const [tab, setPhotoTab] = useState<string | null>(null)
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
    form.personalization.forEach((f, i) => { if (!f.label.trim()) e[`field_${i}`] = 'Give the field a label' })
    form.variants.forEach((v, i) => {
      if (!v.label.trim()) e[`variant_${i}`] = 'Give it a name'
      if (!(v.price > 0)) e[`variant_price_${i}`] = 'Set a price'
      else if (v.compare_at_price != null && v.compare_at_price <= v.price) e[`variant_compare_${i}`] = 'Higher than the price, or empty'
    })
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
    // Read the files now: the input is cleared as soon as this returns, which empties the live FileList.
    const picked = Array.from(files)
    const fd = new FormData()
    picked.forEach((f) => fd.append('files', f))
    setUploading(true)
    try {
      const updated = await api<Product>(`/admin/products/${id}/images`, { form: fd })
      // Keep unsaved edits to the existing photos; the new ones join the colour tab they were uploaded into.
      setForm((f) => ({ ...f, images: [...f.images, ...updated.images
        .filter((img) => !f.images.some((x) => x.url === img.url)).map((img) => ({ ...img, color: photoTab }))] }))
      const n = `${picked.length} image${picked.length > 1 ? 's' : ''}`
      toast(photoTab ? `Uploaded ${n} for ${tabName}. Save to apply.` : `Uploaded ${n}`)
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

  // Colour options. Presets set the plain colours and leave special finishes as they are: those are opted into one by one.
  const special = (ids: string[]) => ids.filter((c) => filaments.byId.get(c)?.group === 'special')
  const groupIds = (...groups: string[]) => filaments.list.filter((f) => groups.includes(f.group)).map((f) => f.id)
  const setColors = (colors: string[]) => setForm((f) => ({
    ...f, colors,
    default_color: f.default_color && colors.includes(f.default_color) ? f.default_color : colors[0] ?? null,
    images: f.images.map((img) => (img.color && !colors.includes(img.color) ? { ...img, color: null } : img)),
  }))
  // Photos by colour: the open tab is a colour still offered, or General (untagged photos).
  const photoTab = tab && form.colors.includes(tab) ? tab : null
  const tabName = photoTab ? filaments.byId.get(photoTab)?.name ?? photoTab : ''
  const shown = form.images.filter((img) => (img.color ?? null) === photoTab)

  const toggleColor = (id: string) => setColors(form.colors.includes(id) ? form.colors.filter((c) => c !== id)
    : filaments.list.map((f) => f.id).filter((c) => c === id || form.colors.includes(c)))

  // Personalisation: the fields a customer fills in, like the name on a keychain.
  const fields = form.personalization
  const setFields = (next: PersonalizationField[]) => set('personalization', next)
  const updateField = (i: number, patch: Partial<PersonalizationField>) => setFields(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)))
  const addField = () => setFields([...fields, { key: fieldKey('text', fields.map((f) => f.key)), label: '', placeholder: '', max_length: 20, required: true }])
  const moveField = (i: number, to: number) => {
    if (to < 0 || to >= fields.length) return
    const next = [...fields]
    const [m] = next.splice(i, 1)
    next.splice(to, 0, m)
    setFields(next)
  }

  // Variants: versions at their own price, like with or without a frame. The headline price mirrors the default.
  const variants = form.variants
  const setVariants = (next: ProductVariant[], preferred = form.default_variant) => setForm((f) => {
    const keys = next.map((v) => v.key)
    const def = preferred && keys.includes(preferred) ? preferred : keys[0] ?? null
    const chosen = next.find((v) => v.key === def)
    return {
      ...f, variants: next, default_variant: def,
      ...(chosen ? { price: chosen.price, compare_at_price: chosen.compare_at_price ?? null } : {}),
      images: f.images.map((img) => (img.variant && !keys.includes(img.variant) ? { ...img, variant: null } : img)),
    }
  })
  const updateVariant = (i: number, patch: Partial<ProductVariant>) => setVariants(variants.map((v, j) => (j === i ? { ...v, ...patch } : v)))
  const addVariant = () => setVariants([...variants, { key: fieldKey('option', variants.map((v) => v.key)), label: '', price: form.price || 0, compare_at_price: null }])
  const usePreset = (preset: typeof VARIANT_PRESETS[number]) => {
    set('variant_label', preset.name)
    setVariants(preset.variants.reduce<ProductVariant[]>((all, label) =>
      [...all, { key: fieldKey(label, all.map((v) => v.key)), label, price: form.price || 0, compare_at_price: null }], []))
  }
  const moveVariant = (i: number, to: number) => {
    if (to < 0 || to >= variants.length) return
    const next = [...variants]
    const [m] = next.splice(i, 1)
    next.splice(to, 0, m)
    setVariants(next)
  }

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
  const pairOptions = others.filter((p) => p.name.toLowerCase().includes(pairSearch.trim().toLowerCase())
    && (!pairCategory || p.category_ids.includes(pairCategory)))

  return (
    <div>
      <Link to="/admin/products" className="text-sm text-fog hover:text-ink">All products</Link>
      <AdminHeader title={isNew ? 'New product' : form.name || 'Untitled'}
        sub={product && `${product.sales_count} ${product.sales_count === 1 ? 'piece' : 'pieces'} sold`}
        actions={<>
          {!isNew && product?.is_published && <Button variant="tertiary" onClick={() => window.open(`/product/${product.slug}`, '_blank')}><Icon name="external" size={16} /> View in store</Button>}
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className={h2}>Colours</h2>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => setColors([...groupIds('essential'), ...special(form.colors)])}>Essentials</Button>
                <Button variant="secondary" size="sm" onClick={() => setColors([...groupIds('essential', 'extended'), ...special(form.colors)])}>Essentials + extended</Button>
                <Button variant="tertiary" size="sm" disabled={!form.colors.length} onClick={() => setColors([])}>Clear</Button>
              </div>
            </div>
            <p className="text-sm text-fog">
              The filaments customers can choose for this piece. Leave all unticked if it only comes as pictured. Special finishes
              are only offered where ticked here. Then add each colour's own photos under Images below.
            </p>
            {GROUPS.map(([group, title]) => (
              <fieldset key={group} className="flex flex-col gap-2">
                <legend className="mb-2 text-sm opacity-80">{title}</legend>
                <div className="flex flex-wrap gap-2">
                  {filaments.list.filter((f) => f.group === group).map((f) => {
                    const on = form.colors.includes(f.id)
                    return (
                      <button key={f.id} type="button" aria-pressed={on} onClick={() => toggleColor(f.id)}
                        className={cn('flex h-9 items-center gap-2 rounded-full border pl-1.5 pr-3 text-[13px] transition-colors',
                          on ? 'border-tertiary bg-tertiary/[0.06] text-ink' : 'border-rule text-smoke hover:border-ink/40')}>
                        <Swatch filament={f} className="size-6" />
                        {f.name}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            ))}
            {form.colors.length > 0 && (
              <Select label="Selected by default" value={form.default_color ?? ''} onChange={(e) => set('default_color', e.target.value)}
                hint={`${form.colors.length} of ${filaments.list.length} offered. Quick add from listings uses the default.`}>
                {form.colors.map((c) => <option key={c} value={c}>{filaments.byId.get(c)?.name ?? c}</option>)}
              </Select>
            )}
          </section>

          <section className={card}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className={h2}>Personalisation</h2>
              {fields.length > 0 && <Button variant="tertiary" size="sm" onClick={() => setFields([])}>Turn off</Button>}
            </div>
            <p className="text-sm text-fog">
              For pieces made with the customer&rsquo;s own text, like a name on a keychain or a name plate. Customers fill these in on
              the product page before adding it to their bag, and you see exactly what to print on the order.
            </p>
            {fields.length === 0 ? (
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <Button key={preset.label} variant="secondary" size="sm" onClick={() => setFields(withKeys(preset.fields))}>{preset.label}</Button>
                ))}
                <Button variant="tertiary" size="sm" onClick={addField}><Icon name="plus" size={15} /> Custom field</Button>
              </div>
            ) : (
              <>
                <ul className="flex flex-col gap-3">
                  {fields.map((f, i) => (
                    <li key={f.key} className="grid gap-3 rounded-md border border-rule p-4 sm:grid-cols-[1fr_1fr_7rem]">
                      <Input label="Label" value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} maxLength={40}
                        placeholder="e.g. Name" error={errors[`field_${i}`]} />
                      <Input label="Example text" value={f.placeholder} onChange={(e) => updateField(i, { placeholder: e.target.value })} maxLength={80}
                        placeholder="e.g. Aanya" />
                      <Input label="Max characters" inputMode="numeric" value={f.max_length || ''}
                        onChange={(e) => updateField(i, { max_length: Math.min(200, Math.max(1, Number(e.target.value) || 1)) })} />
                      <div className="flex items-center justify-between gap-3 sm:col-span-3">
                        <Checkbox label="Required" checked={f.required} onChange={(e) => updateField(i, { required: e.target.checked })} />
                        <div className="flex text-smoke">
                          <button type="button" onClick={() => moveField(i, i - 1)} disabled={i === 0} className="p-1 hover:text-ink disabled:opacity-30" aria-label="Move up"><Icon name="chevronLeft" size={16} className="rotate-90" /></button>
                          <button type="button" onClick={() => moveField(i, i + 1)} disabled={i === fields.length - 1} className="p-1 hover:text-ink disabled:opacity-30" aria-label="Move down"><Icon name="chevronRight" size={16} className="rotate-90" /></button>
                          <button type="button" onClick={() => setFields(fields.filter((_, j) => j !== i))} className="p-1 hover:text-accent" aria-label={`Remove ${f.label || 'field'}`}><Icon name="trash" size={16} /></button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <Button variant="secondary" size="sm" disabled={fields.length >= MAX_FIELDS} onClick={addField}><Icon name="plus" size={15} /> Add field</Button>
                  <Input label="Extra charge (₹)" inputMode="decimal" className="w-44" value={form.personalization_fee || ''}
                    onChange={(e) => set('personalization_fee', Math.max(0, Number(e.target.value) || 0))}
                    hint={form.personalization_fee ? 'Added when any field is filled in' : 'Leave empty for no charge'} />
                </div>
                {fields.every((f) => !f.required) && <p className="text-[13px] text-fog">All fields are optional, so customers can also buy it plain.</p>}
              </>
            )}
          </section>

          <section className={card}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className={h2}>Variants</h2>
              {variants.length > 0 && <Button variant="tertiary" size="sm" onClick={() => { set('variant_label', ''); setVariants([]) }}>Turn off</Button>}
            </div>
            <p className="text-sm text-fog">
              For pieces sold in versions at different prices, like a print with or without a frame. Customers pick one on the
              product page and the price and photos change with it. Tag each version&rsquo;s photos under Images below.
            </p>
            {variants.length === 0 ? (
              <div className="flex flex-wrap gap-2">
                {VARIANT_PRESETS.map((preset) => (
                  <Button key={preset.label} variant="secondary" size="sm" onClick={() => usePreset(preset)}>{preset.label}</Button>
                ))}
                <Button variant="tertiary" size="sm" onClick={() => { set('variant_label', form.variant_label || 'Option'); addVariant() }}><Icon name="plus" size={15} /> Custom</Button>
              </div>
            ) : (
              <>
                <Input label="What the choice is called" className="max-w-xs" value={form.variant_label} maxLength={30}
                  onChange={(e) => set('variant_label', e.target.value)} placeholder="e.g. Frame" />
                <ul className="flex flex-col gap-3">
                  {variants.map((v, i) => (
                    <li key={v.key} className="grid gap-3 rounded-md border border-rule p-4 sm:grid-cols-[1fr_8rem_9rem]">
                      <Input label="Name" value={v.label} onChange={(e) => updateVariant(i, { label: e.target.value })} maxLength={40}
                        placeholder="e.g. With frame" error={errors[`variant_${i}`]} />
                      <Input label="Price (₹)" inputMode="decimal" value={v.price || ''} error={errors[`variant_price_${i}`]}
                        onChange={(e) => updateVariant(i, { price: Number(e.target.value) || 0 })} />
                      <Input label="Compare-at (₹)" inputMode="decimal" value={v.compare_at_price ?? ''} error={errors[`variant_compare_${i}`]}
                        onChange={(e) => updateVariant(i, { compare_at_price: numOrNull(e.target.value) })} />
                      <div className="flex items-center justify-between gap-3 sm:col-span-3">
                        <label className="flex items-center gap-2 text-sm text-smoke">
                          <input type="radio" name="default_variant" checked={form.default_variant === v.key} onChange={() => setVariants(variants, v.key)} />
                          Selected by default
                        </label>
                        <div className="flex text-smoke">
                          <button type="button" onClick={() => moveVariant(i, i - 1)} disabled={i === 0} className="p-1 hover:text-ink disabled:opacity-30" aria-label="Move up"><Icon name="chevronLeft" size={16} className="rotate-90" /></button>
                          <button type="button" onClick={() => moveVariant(i, i + 1)} disabled={i === variants.length - 1} className="p-1 hover:text-ink disabled:opacity-30" aria-label="Move down"><Icon name="chevronRight" size={16} className="rotate-90" /></button>
                          <button type="button" onClick={() => setVariants(variants.filter((_, j) => j !== i))} className="p-1 hover:text-accent" aria-label={`Remove ${v.label || 'variant'}`}><Icon name="trash" size={16} /></button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button variant="secondary" size="sm" className="self-start" disabled={variants.length >= MAX_VARIANTS} onClick={addVariant}><Icon name="plus" size={15} /> Add variant</Button>
              </>
            )}
          </section>

          <section className={card}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className={h2}>Images</h2>
              <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.length) void upload(e.target.files); e.target.value = '' }} />
              <Button variant="secondary" size="sm" disabled={isNew} loading={uploading} onClick={() => fileRef.current?.click()}>
                <Icon name="upload" size={16} /> {photoTab ? `Upload ${tabName} photos` : 'Upload'}
              </Button>
            </div>
            {form.colors.length > 0 && !isNew && (
              <div role="tablist" aria-label="Photos by colour" className="-mx-1 flex flex-wrap gap-1.5">
                {[null, ...form.colors].map((c) => {
                  const f = c ? filaments.byId.get(c) : null
                  const count = form.images.filter((img) => (img.color ?? null) === c).length
                  const on = c === photoTab
                  return (
                    <button key={c ?? 'general'} type="button" role="tab" aria-selected={on} onClick={() => setPhotoTab(c)}
                      className={cn('flex h-8 items-center gap-1.5 rounded-full border pl-1.5 pr-2.5 text-[13px] transition-colors',
                        !f && 'pl-2.5', on ? 'border-ink bg-ink text-paper' : 'border-rule text-smoke hover:border-ink/40')}>
                      {f && <Swatch filament={f} className="size-5" />}
                      {f?.name ?? 'General'}
                      <span className={cn('tabular-nums text-[12px]', on ? 'text-paper/70' : 'text-fog')}>{count}</span>
                    </button>
                  )
                })}
              </div>
            )}
            {isNew ? <p className="text-sm text-smoke">Create the product first, then upload images.</p> : shown.length === 0 ? (
              <button onClick={() => fileRef.current?.click()} className="flex h-40 flex-col items-center justify-center gap-1 border border-dashed border-rule px-6 text-center text-smoke hover:border-accent">
                {photoTab ? <>Upload photos of the {tabName} version<span className="text-[13px] text-fog">Until then, customers choosing {tabName} see the general photos.</span></>
                  : form.images.length ? <>Upload general photos<span className="text-[13px] text-fog">Shown with every colour, after that colour&rsquo;s own photos.</span></> : 'Upload the first image'}
              </button>
            ) : (
              <>
                <p className="text-sm text-fog">
                  {photoTab ? `Shown when a customer chooses ${tabName}, before the general photos. ` : form.colors.length ? 'Shown with every colour, after that colour’s own photos. ' : ''}
                  Drag to reorder. The first image overall is the main one in listings; the second shows on hover. Save to apply changes.
                </p>
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {shown.map((img, k) => {
                    const i = form.images.indexOf(img)
                    return (
                    <li key={img.url} draggable onDragStart={() => setDragIndex(i)} onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { if (dragIndex !== null) moveImage(dragIndex, i); setDragIndex(null) }}
                      className={cn('flex flex-col gap-2', dragIndex === i && 'opacity-40')}>
                      <div className="relative cursor-grab bg-ash">
                        <img src={img.url} alt={img.alt} className="aspect-[4/5] w-full object-cover" />
                        {i === 0 ? <span className="absolute left-2 top-2 bg-tertiary px-1.5 py-0.5 text-xs text-paper">Main</span>
                          : k === 0 && photoTab ? <span className="absolute left-2 top-2 bg-ink px-1.5 py-0.5 text-xs text-paper">First for {tabName}</span> : null}
                      </div>
                      <input value={img.alt} onChange={(e) => updateImage(i, { alt: e.target.value })} placeholder="Describe the image"
                        aria-label={`Alt text for image ${k + 1}`} className="h-8 border border-rule bg-transparent px-2 text-xs outline-none focus:border-tertiary" />
                      {form.colors.length > 0 && (
                        <select value={img.color ?? ''} onChange={(e) => updateImage(i, { color: e.target.value || null })}
                          aria-label={`Colour of image ${k + 1}`} className="h-8 border border-rule bg-transparent px-1.5 text-xs text-ink outline-none focus:border-tertiary">
                          <option value="">General (every colour)</option>
                          {form.colors.map((c) => <option key={c} value={c}>{filaments.byId.get(c)?.name ?? c} only</option>)}
                        </select>
                      )}
                      {variants.length > 0 && (
                        <select value={img.variant ?? ''} onChange={(e) => updateImage(i, { variant: e.target.value || null })}
                          aria-label={`${form.variant_label || 'Variant'} of image ${k + 1}`} className="h-8 border border-rule bg-transparent px-1.5 text-xs text-ink outline-none focus:border-tertiary">
                          <option value="">Every {(form.variant_label || 'variant').toLowerCase()}</option>
                          {variants.map((v) => <option key={v.key} value={v.key}>{v.label || 'Unnamed'} only</option>)}
                        </select>
                      )}
                      <div className="flex items-center justify-between text-smoke">
                        <div className="flex">
                          <button onClick={() => moveImage(i, form.images.indexOf(shown[k - 1]))} disabled={k === 0} className="p-1 hover:text-ink disabled:opacity-30" aria-label="Move earlier"><Icon name="chevronLeft" size={16} /></button>
                          <button onClick={() => moveImage(i, form.images.indexOf(shown[k + 1]))} disabled={k === shown.length - 1} className="p-1 hover:text-ink disabled:opacity-30" aria-label="Move later"><Icon name="chevronRight" size={16} /></button>
                        </div>
                        <button onClick={() => set('images', form.images.filter((_, j) => j !== i))} className="p-1 hover:text-accent" aria-label="Remove image"><Icon name="trash" size={16} /></button>
                      </div>
                    </li>
                    )
                  })}
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
            <h2 className={h2}>Price</h2>
            {variants.length > 0 ? (
              <p className="text-sm text-fog">
                Set per variant. Listings show the default, {variants.find((v) => v.key === form.default_variant)?.label || 'the first'}, at {form.price ? `₹${form.price}` : 'its price'}.
              </p>
            ) : <>
            <Input label="Price (₹)" inputMode="decimal" value={form.price || ''} onChange={(e) => set('price', Number(e.target.value) || 0)} error={errors.price} />
            <Input label="Compare-at price (₹)" inputMode="decimal" value={form.compare_at_price ?? ''} onChange={(e) => set('compare_at_price', numOrNull(e.target.value))}
              error={errors.compare_at_price} hint={form.compare_at_price && form.compare_at_price > form.price ? `Shows as ${Math.round((1 - form.price / form.compare_at_price) * 100)}% off` : 'Set higher than the price to show a discount'} />
            </>}
          </section>

          <section className={card}>
            <h2 className={h2}>Organisation</h2>
            <div className="flex flex-col gap-1.5">
              <span className="flex items-baseline justify-between text-sm">
                <span className="opacity-80">Categories</span>
                {form.category_ids.length > 1 && <span className="text-[13px] text-fog">{form.category_ids.length} selected</span>}
              </span>
              <ul className="max-h-56 overflow-y-auto border border-rule py-1">
                {categories?.map((c) => {
                  const checked = form.category_ids.includes(c.id)
                  const main = form.category_ids[0] === c.id
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-2 pr-3 hover:bg-ink/[0.04]">
                      <Checkbox className="flex min-w-0 flex-1 px-3 py-2 text-sm" label={c.name} checked={checked}
                        onChange={(e) => set('category_ids', e.target.checked ? [...form.category_ids, c.id] : form.category_ids.filter((x) => x !== c.id))} />
                      {main && form.category_ids.length > 1 && <span className="text-[12px] text-fog">Main</span>}
                      {checked && !main && (
                        <button type="button" className="text-[12px] text-fog hover:text-ink"
                          onClick={() => set('category_ids', [c.id, ...form.category_ids.filter((x) => x !== c.id)])}>Make main</button>
                      )}
                    </li>
                  )
                })}
                {!categories?.length && <li className="px-3 py-3 text-sm text-fog">No categories yet.</li>}
              </ul>
              <span className="text-[13px] text-fog">The piece shows up in every category ticked. The main one is used for its breadcrumb and “more like this”.</span>
            </div>
            <Input label="Tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} hint="Comma separated; used by search" />
            <div className="flex flex-col gap-1.5">
              <span className="flex items-baseline justify-between text-sm">
                <span className="opacity-80">Frequently bought with</span>
                {form.frequently_bought_with.length > 0 && <span className="text-[13px] text-fog">{form.frequently_bought_with.length} selected</span>}
              </span>
              <div className="border border-rule">
                <div className="flex items-center border-b border-rule">
                  <label className="flex min-w-0 flex-1 items-center gap-2 px-3">
                    <Icon name="search" size={15} className="shrink-0 text-fog" />
                    <span className="sr-only">Search products</span>
                    <input type="search" value={pairSearch} onChange={(e) => setPairSearch(e.target.value)} placeholder="Search products"
                      className="h-10 w-full bg-transparent text-sm text-ink outline-none placeholder:text-fog" />
                  </label>
                  <select value={pairCategory} onChange={(e) => setPairCategory(e.target.value)} aria-label="Filter by category"
                    className="h-10 max-w-[45%] shrink-0 border-l border-rule bg-transparent px-2 text-sm text-ink outline-none">
                    <option value="">All categories</option>
                    {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <ul className="max-h-56 overflow-y-auto py-1">
                  {pairOptions.map((p) => (
                    <li key={p.id}>
                      <Checkbox className="flex w-full px-3 py-2 text-sm hover:bg-ink/[0.04]" label={p.name} checked={form.frequently_bought_with.includes(p.id)}
                        onChange={(e) => set('frequently_bought_with', e.target.checked ? [...form.frequently_bought_with, p.id] : form.frequently_bought_with.filter((x) => x !== p.id))} />
                    </li>
                  ))}
                  {pairOptions.length === 0 && <li className="px-3 py-3 text-sm text-fog">{others.length ? (pairSearch.trim() ? `No products match “${pairSearch}”.` : 'No products in this category.') : 'No other products yet.'}</li>}
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
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Keep it</Button>
        </div>
      </Modal>
    </div>
  )
}
