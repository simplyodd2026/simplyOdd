import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, qs } from '@/lib/api'
import type { HomeSlot, HomepageLayout, Page, Product } from '@/lib/types'
import { useDocumentTitle } from '@/lib/hooks'
import { cn } from '@/lib/cn'
import { toast, toastError } from '@/stores/toast'
import { AdminHeader } from '@/features/admin/ui'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'

const EMPTY: HomepageLayout = {
  spotlight: null, spotlight_inset: null, collection: [], collection_row: [], room: null, moodboard: [], studio_image: null,
}

/**
 * The home page, section by section: which products appear and which of their photos are shown.
 * Every section starts out automatic (featured and best-selling pieces); choosing something here
 * overrides that, and "Use automatic" hands it back.
 */
export default function HomepagePage() {
  useDocumentTitle('Home page')
  const qc = useQueryClient()
  const saved = useQuery({ queryKey: ['admin-homepage'], queryFn: () => api<HomepageLayout>('/admin/homepage') })
  const { data: catalog } = useQuery({
    queryKey: ['admin-products-all'],
    queryFn: () => api<Page<Product>>(`/admin/products${qs({ page_size: 100 })}`),
  })
  const products = catalog?.items ?? []
  const [draft, setDraft] = useState<HomepageLayout>(EMPTY)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (saved.data) setDraft(saved.data) }, [saved.data])

  const set = <K extends keyof HomepageLayout>(key: K, value: HomepageLayout[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const find = (id?: string) => products.find((p) => p.id === id)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved.data ?? EMPTY)

  const save = async () => {
    setBusy(true)
    try {
      const layout = await api<HomepageLayout>('/admin/homepage', { method: 'PUT', body: draft })
      qc.setQueryData(['admin-homepage'], layout)
      qc.invalidateQueries({ queryKey: ['homepage'] })
      toast('Home page saved')
    } catch (e) { toastError(e) } finally { setBusy(false) }
  }

  const spotlight = find(draft.spotlight?.product_id)

  return (
    <div className="pb-24">
      <AdminHeader title="Home page" sub="Choose the products and photos in each section. Anything left on automatic picks featured and best-selling pieces."
        actions={<>
          <Link to="/" target="_blank" className="inline-flex h-10 items-center gap-1.5 px-3 text-sm text-smoke hover:text-ink"><Icon name="external" size={14} /> View home page</Link>
          <Button loading={busy} disabled={!dirty} onClick={save}>Save changes</Button>
        </>} />

      <div className="flex flex-col gap-6">
        <Section title="Spotlight" note="One piece shown large near the top, with a small round photo beside it."
          auto={!draft.spotlight && !draft.spotlight_inset} onReset={() => setDraft((d) => ({ ...d, spotlight: null, spotlight_inset: null }))}>
          <SlotEditor slot={draft.spotlight} products={products} onChange={(s) => set('spotlight', s)} autoLabel="Automatic (most popular piece)" />
          <div className="mt-6">
            <PhotoPicker label="Small round photo" value={draft.spotlight_inset} onChange={(url) => set('spotlight_inset', url)}
              photos={spotlight?.images.map((i) => i.url) ?? []} defaultLabel="Its second photo" />
          </div>
        </Section>

        <Section title="The collection: large pieces" note="The two pieces shown large at the start of the collection."
          auto={!draft.collection.length} onReset={() => set('collection', [])}>
          <SlotList slots={draft.collection} max={2} products={products} onChange={(s) => set('collection', s)} />
        </Section>

        <Section title="The collection: sliding row" note="Up to 12 pieces in the row below, which slides sideways four at a time. The order here is the order in the row."
          auto={!draft.collection_row.length} onReset={() => set('collection_row', [])}>
          <SlotList slots={draft.collection_row} max={12} products={products} onChange={(s) => set('collection_row', s)} />
        </Section>

        <Section title="In your space" note="One full-width photo of a piece at home. A wide photo works best here."
          auto={!draft.room} onReset={() => set('room', null)}>
          <SlotEditor slot={draft.room} products={products} onChange={(s) => set('room', s)} autoLabel="Automatic (the piece with the most photos)"
            defaultLabel="Best fit for the screen" />
        </Section>

        <Section title="The Odd Board" note="Up to 12 pieces pinned up as polaroids, with notes woven in between."
          auto={!draft.moodboard.length} onReset={() => set('moodboard', [])}>
          <SlotList slots={draft.moodboard} max={12} products={products} onChange={(s) => set('moodboard', s)} />
        </Section>

        <Section title="The studio" note="The photo beside “A small studio for odd, beautiful things.”"
          auto={!draft.studio_image} onReset={() => set('studio_image', null)}>
          <StudioPicker value={draft.studio_image} products={products} onChange={(url) => set('studio_image', url)} />
        </Section>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper/95 px-4 py-3 backdrop-blur lg:left-60">
          <div className="flex items-center justify-end gap-3">
            <span className="text-sm text-smoke">You have unsaved changes</span>
            <Button variant="ghost" size="sm" onClick={() => setDraft(saved.data ?? EMPTY)}>Discard</Button>
            <Button size="sm" loading={busy} onClick={save}>Save changes</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, note, auto, onReset, children }: {
  title: string; note: string; auto: boolean; onReset: () => void; children: ReactNode
}) {
  return (
    <section className="rounded-lg border border-rule p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-3 font-display text-2xl text-ink">
            {title}
            <span className={cn('rounded-full px-2.5 py-0.5 font-sans text-[12px] font-medium', auto ? 'bg-ink/5 text-smoke' : 'bg-accent text-paper')}>
              {auto ? 'Automatic' : 'Custom'}
            </span>
          </h2>
          <p className="mt-1 text-sm text-smoke">{note}</p>
        </div>
        {!auto && <Button variant="ghost" size="sm" onClick={onReset}>Use automatic</Button>}
      </div>
      {children}
    </section>
  )
}

/** Pick a product, then which of its photos to show (or upload a different one). */
function SlotEditor({ slot, products, onChange, autoLabel, defaultLabel = 'Its first photo' }: {
  slot: HomeSlot | null; products: Product[]; onChange: (s: HomeSlot | null) => void; autoLabel?: string; defaultLabel?: string
}) {
  const product = products.find((p) => p.id === slot?.product_id)
  return (
    <div className="flex flex-col gap-4">
      <ProductSelect value={slot?.product_id ?? ''} products={products} autoLabel={autoLabel}
        onChange={(id) => onChange(id ? { product_id: id, image: null } : null)} />
      {product && (
        <PhotoPicker label="Photo" value={slot?.image ?? null} photos={product.images.map((i) => i.url)} defaultLabel={defaultLabel}
          onChange={(image) => onChange({ product_id: product.id, image })} />
      )}
    </div>
  )
}

function ProductSelect({ value, products, onChange, autoLabel }: {
  value: string; products: Product[]; onChange: (id: string) => void; autoLabel?: string
}) {
  return (
    <Select label="Product" value={value} onChange={(e) => onChange(e.target.value)} className="max-w-md">
      {autoLabel ? <option value="">{autoLabel}</option> : !value && <option value="">Choose a product</option>}
      {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.is_published ? '' : ' (draft, hidden on the store)'}</option>)}
    </Select>
  )
}

/**
 * The studio photo is a single image, so the product here only narrows the photos to choose from.
 * It starts on whichever product the saved photo belongs to.
 */
function StudioPicker({ value, products, onChange }: {
  value: string | null; products: Product[]; onChange: (url: string | null) => void
}) {
  const owner = products.find((p) => p.images.some((i) => i.url === value))
  const [productId, setProductId] = useState('')
  useEffect(() => { if (owner) setProductId(owner.id) }, [owner?.id])
  const product = products.find((p) => p.id === productId)

  return (
    <div className="flex flex-col gap-4">
      <ProductSelect value={productId} products={products} autoLabel="Choose a product"
        onChange={(id) => { setProductId(id); if (!id) onChange(null) }} />
      <PhotoPicker label="Photo" value={value} onChange={onChange} defaultLabel="Automatic"
        photos={product?.images.map((i) => i.url) ?? []} />
    </div>
  )
}

/** An ordered list of pieces for a section that shows several. */
function SlotList({ slots, max, products, onChange }: {
  slots: HomeSlot[]; max: number; products: Product[]; onChange: (s: HomeSlot[]) => void
}) {
  const replace = (i: number, s: HomeSlot | null) => onChange(s ? slots.map((x, k) => (k === i ? s : x)) : slots.filter((_, k) => k !== i))
  const move = (i: number, to: number) => {
    if (to < 0 || to >= slots.length) return
    const next = [...slots]
    const [m] = next.splice(i, 1)
    next.splice(to, 0, m)
    onChange(next)
  }
  const unused = products.find((p) => p.is_published && !slots.some((s) => s.product_id === p.id))

  return (
    <div className="flex flex-col gap-3">
      {slots.map((slot, i) => {
        const product = products.find((p) => p.id === slot.product_id)
        return (
          <div key={i} className="flex flex-col gap-4 rounded-md bg-paper-2 p-4 sm:flex-row sm:items-start">
            <span className="w-6 shrink-0 pt-1 text-sm tabular-nums text-fog">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <SlotEditor slot={slot} products={products} onChange={(s) => replace(i, s)} />
            </div>
            <div className="flex shrink-0 items-center gap-1 text-smoke">
              <button onClick={() => move(i, i - 1)} disabled={i === 0} className="p-2 hover:text-ink disabled:opacity-30" aria-label={`Move ${product?.name ?? 'piece'} up`}><Icon name="chevronLeft" size={16} className="rotate-90" /></button>
              <button onClick={() => move(i, i + 1)} disabled={i === slots.length - 1} className="p-2 hover:text-ink disabled:opacity-30" aria-label={`Move ${product?.name ?? 'piece'} down`}><Icon name="chevronRight" size={16} className="rotate-90" /></button>
              <button onClick={() => replace(i, null)} className="p-2 hover:text-accent" aria-label={`Remove ${product?.name ?? 'piece'}`}><Icon name="trash" size={16} /></button>
            </div>
          </div>
        )
      })}
      {slots.length < max && (
        <div>
          <Button variant="outline" size="sm" disabled={!products.length}
            onClick={() => onChange([...slots, { product_id: (unused ?? products[0]).id, image: null }])}>
            <Icon name="plus" size={16} /> Add a product
          </Button>
          <span className="ml-3 text-sm text-fog">{slots.length} of {max}</span>
        </div>
      )}
    </div>
  )
}

/** A row of photos to choose from, a "default" choice, and an upload button for a photo of your own. */
function PhotoPicker({ label, value, photos, onChange, defaultLabel }: {
  label: string; value: string | null; photos: string[]; onChange: (url: string | null) => void; defaultLabel: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const options = value && !photos.includes(value) ? [value, ...photos] : photos

  const upload = async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    setUploading(true)
    try {
      const { url } = await api<{ url: string }>('/admin/uploads?folder=homepage', { form: fd })
      onChange(url)
    } catch (e) { toastError(e) } finally { setUploading(false) }
  }

  const tile = 'relative size-20 shrink-0 overflow-hidden rounded-md border-2 transition-colors'
  return (
    <div>
      <p className="label mb-2 text-smoke">{label}</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => onChange(null)} aria-pressed={!value}
          className={cn(tile, 'grid place-items-center bg-paper-2 px-1.5 text-center text-[11px] leading-tight text-smoke', !value ? 'border-ink' : 'border-transparent hover:border-rule')}>
          {defaultLabel}
        </button>
        {options.map((url) => (
          <button key={url} type="button" onClick={() => onChange(url)} aria-pressed={value === url} aria-label="Use this photo"
            className={cn(tile, 'bg-ash', value === url ? 'border-ink' : 'border-transparent hover:border-rule')}>
            <img src={url} alt="" loading="lazy" className="size-full object-cover" />
            {value === url && <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-ink text-paper"><Icon name="check" size={12} /></span>}
          </button>
        ))}
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = '' }} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className={cn(tile, 'grid place-items-center border-dashed border-rule text-[11px] text-smoke hover:border-ink hover:text-ink disabled:opacity-50')}>
          <span className="flex flex-col items-center gap-1"><Icon name="upload" size={16} />{uploading ? 'Uploading' : 'Upload'}</span>
        </button>
      </div>
    </div>
  )
}
