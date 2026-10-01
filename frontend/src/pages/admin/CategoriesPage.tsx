import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Category } from '@/lib/types'
import { useCategories } from '@/lib/queries'
import { useDocumentTitle } from '@/lib/hooks'
import { toast, toastError } from '@/stores/toast'
import { AdminHeader } from '@/features/admin/ui'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Overlay'
import { plural } from '@/lib/format'

type Draft = { id?: string; name: string; slug: string; description: string; image: string | null }

export default function CategoriesPage() {
  useDocumentTitle('Categories')
  const { data: categories } = useCategories()
  const qc = useQueryClient()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = () => { qc.invalidateQueries({ queryKey: ['categories'] }) }

  const save = async () => {
    if (!draft?.name.trim()) return toast('Give the category a name', { tone: 'error' })
    setBusy(true)
    try {
      const body = { name: draft.name, slug: draft.slug || null, description: draft.description, image: draft.image }
      if (draft.id) await api(`/admin/categories/${draft.id}`, { method: 'PATCH', body })
      else await api('/admin/categories', { body })
      toast(draft.id ? 'Category saved' : 'Category created')
      setDraft(null)
      refresh()
    } catch (e) { toastError(e) } finally { setBusy(false) }
  }

  const remove = async (c: Category) => {
    if (!window.confirm(`Delete ${c.name}?`)) return
    try { await api(`/admin/categories/${c.id}`, { method: 'DELETE' }); toast('Category deleted'); refresh() } catch (e) { toastError(e) }
  }

  const reorder = async (from: number, to: number) => {
    if (!categories || to < 0 || to >= categories.length || from === to) return
    const ids = categories.map((c) => c.id)
    const [m] = ids.splice(from, 1)
    ids.splice(to, 0, m)
    qc.setQueryData<Category[]>(['categories'], ids.map((id) => categories.find((c) => c.id === id)!))
    try { await api('/admin/categories/order', { method: 'PUT', body: { ids } }); refresh() } catch (e) { toastError(e); refresh() }
  }

  const uploadImage = async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    setBusy(true)
    try {
      const { url } = await api<{ url: string }>('/admin/uploads?folder=categories', { form: fd })
      setDraft((d) => d && { ...d, image: url })
    } catch (e) { toastError(e) } finally { setBusy(false) }
  }

  return (
    <div>
      <AdminHeader title="Categories" sub="Drag to change the order they appear in the store"
        actions={<Button onClick={() => setDraft({ name: '', slug: '', description: '', image: null })}>New category</Button>} />
      <ul className="divide-y divide-rule border-y border-rule">
        {categories?.map((c, i) => (
          <li key={c.id} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (drag !== null) void reorder(drag, i); setDrag(null) }}
            className={`flex items-center gap-4 py-3 ${drag === i ? 'opacity-40' : ''}`}>
            <Icon name="grip" className="cursor-grab text-fog" />
            <div className="w-12 shrink-0 bg-paper-2">{c.image && <img src={c.image} alt="" className="aspect-[4/5] w-full object-cover" />}</div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{c.name}</p>
              <p className="truncate text-sm text-fog">/{c.slug}, {plural(c.product_count, 'product')}</p>
            </div>
            <div className="flex items-center gap-1 text-smoke">
              <button onClick={() => reorder(i, i - 1)} disabled={i === 0} className="p-2 hover:text-ink disabled:opacity-30" aria-label={`Move ${c.name} up`}><Icon name="chevronLeft" size={16} className="rotate-90" /></button>
              <button onClick={() => reorder(i, i + 1)} disabled={i === categories.length - 1} className="p-2 hover:text-ink disabled:opacity-30" aria-label={`Move ${c.name} down`}><Icon name="chevronRight" size={16} className="rotate-90" /></button>
              <button onClick={() => setDraft({ id: c.id, name: c.name, slug: c.slug, description: c.description, image: c.image })} className="p-2 hover:text-ink" aria-label={`Edit ${c.name}`}><Icon name="edit" size={16} /></button>
              <button onClick={() => remove(c)} className="p-2 hover:text-accent" aria-label={`Delete ${c.name}`}><Icon name="trash" size={16} /></button>
            </div>
          </li>
        ))}
      </ul>

      <Modal open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? 'Edit category' : 'New category'}>
        {draft && (
          <div className="flex flex-col gap-4">
            <Input label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Input label="URL slug" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} hint="Leave empty to generate from the name" />
            <Textarea label="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            <div className="flex items-center gap-4">
              <div className="w-20 bg-paper-3">{draft.image && <img src={draft.image} alt="" className="aspect-[4/5] w-full object-cover" />}</div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadImage(f); e.target.value = '' }} />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Icon name="upload" size={16} /> {draft.image ? 'Replace image' : 'Upload image'}</Button>
            </div>
            <div className="mt-2 flex gap-3">
              <Button loading={busy} onClick={save}>Save category</Button>
              <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
