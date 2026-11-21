import { Fragment, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Input, Textarea } from '@/components/ui/Field'
import { responsive } from '@/lib/image'
import { date, money } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { ChatProduct, Comparison, EnquiryDraft, OrderSummary } from './types'

// ------------------------------------------------------------------ text
const EMAIL = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g

/** **bold** and email links inside one line. Everything else stays text: React escapes it, nothing is parsed as HTML. */
function inline(line: string): ReactNode[] {
  return line.split(/(\*\*[^*]+\*\*)/g).flatMap((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return [<strong key={i} className="font-medium text-ink">{part.slice(2, -2)}</strong>]
    return part.split(EMAIL).map((bit, j) =>
      j % 2 ? <a key={`${i}-${j}`} href={`mailto:${bit}`} className="link-draw text-ink">{bit}</a> : <Fragment key={`${i}-${j}`}>{bit}</Fragment>)
  })
}

/** Model replies may carry light markdown: paragraphs, bullet lines and bold. */
export function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/)
  return (
    <div className="space-y-2.5">
      {blocks.map((block, i) => {
        const lines = block.split('\n')
        if (lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))) {
          return (
            <ul key={i} className="space-y-1 pl-4">
              {lines.map((l, j) => <li key={j} className="list-disc marker:text-fog">{inline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ''))}</li>)}
            </ul>
          )
        }
        return <p key={i} className="text-pretty">{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}</p>
      })}
    </div>
  )
}

// -------------------------------------------------------------- products
function ProductTile({ p, onNavigate }: { p: ChatProduct; onNavigate?: () => void }) {
  const sale = !!p.compare_at_price && p.compare_at_price > p.price
  return (
    <article className="group flex w-[10.5rem] shrink-0 snap-start flex-col">
      <Link to={p.url} onClick={onNavigate} className="block" aria-label={p.name}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.1rem_0.3rem_1.1rem_1.1rem] bg-ash">
          {p.image && (
            <img {...responsive(p.image, '168px')} alt={p.name} loading="lazy" decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-quint)] group-hover:scale-[1.04]" />
          )}
        </div>
      </Link>
      <p className="mt-2.5 truncate font-display text-[1.1rem] leading-tight text-ink">{p.name}</p>
      <p className="mt-0.5 flex items-baseline gap-1.5 text-[14px] tabular-nums">
        {p.price_varies && <span className="text-fog">From</span>}
        <span className={cn('text-ink', sale && 'text-accent')}>{money(p.price)}</span>
        {sale && <s className="text-[12px] text-fog">{money(p.compare_at_price!)}</s>}
      </p>
      {p.summary && <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-smoke">{p.summary}</p>}
      <Link to={p.url} onClick={onNavigate}
        className="mt-2 inline-flex items-center gap-1 self-start text-[13px] font-medium text-ink">
        <span className="link-draw">View product</span><Icon name="arrowRight" size={14} />
      </Link>
    </article>
  )
}

export function ProductRail({ products, onNavigate }: { products: ChatProduct[]; onNavigate?: () => void }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 pb-1 scrollbar-none" role="list" aria-label="Recommended products" data-lenis-prevent>
      <div className="flex snap-x gap-3.5">
        {products.map((p) => <div role="listitem" key={p.id}><ProductTile p={p} onNavigate={onNavigate} /></div>)}
      </div>
    </div>
  )
}

export function ComparisonTable({ comparison, onNavigate }: { comparison: Comparison; onNavigate?: () => void }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 scrollbar-none" data-lenis-prevent>
      <table className="w-full min-w-[22rem] border-collapse text-left text-[13px]">
        <caption className="sr-only">Product comparison</caption>
        <thead>
          <tr>
            <th scope="col" className="w-24 pb-2 align-bottom"><span className="sr-only">Attribute</span></th>
            {comparison.products.map((p) => (
              <th key={p.id} scope="col" className="pb-2 pl-3 align-bottom font-normal">
                <Link to={p.url} onClick={onNavigate} className="block">
                  {p.image && <img src={p.image} alt="" className="mb-2 aspect-square w-14 rounded-[0.7rem_0.25rem_0.7rem_0.7rem] bg-ash object-cover" />}
                  <span className="link-draw font-display text-[1rem] leading-tight text-ink">{p.name}</span>
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparison.rows.map((row) => (
            <tr key={row.label} className="border-t border-rule-light">
              <th scope="row" className="py-2 pr-2 align-top font-medium text-fog">{row.label}</th>
              {row.values.map((v, i) => <td key={i} className="py-2 pl-3 align-top text-graphite">{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ------------------------------------------------------------------ faq
export function MoreAnswers({ items }: { items: { question: string; answer: string }[] }) {
  if (!items.length) return null
  return (
    <div className="divide-y divide-rule-light border-y border-rule-light">
      {items.map((f) => (
        <details key={f.question} className="group py-2.5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13.5px] text-ink">
            {f.question}<Icon name="chevronDown" size={15} className="shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="pt-2 text-[13.5px] text-smoke"><RichText text={f.answer} /></div>
        </details>
      ))}
    </div>
  )
}

// --------------------------------------------------------------- orders
export function OrderList({ orders, onNavigate }: { orders: OrderSummary[]; onNavigate?: () => void }) {
  return (
    <ul className="space-y-2.5">
      {orders.map((o) => (
        <li key={o.id} className="rounded-[1rem_0.3rem_1rem_1rem] border border-rule bg-paper-2 p-3.5 text-[13px]">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-ink">{o.number}</span>
            <span className="rounded-full bg-ink/[0.06] px-2.5 py-0.5 text-[12px] text-ink">{o.status_label}</span>
          </div>
          <p className="mt-1 text-smoke">{date(o.created_at)} · <span className="tabular-nums">{money(o.total, o.currency)}</span></p>
          {o.items.length > 0 && <p className="mt-1 line-clamp-2 text-smoke">{o.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')}</p>}
          {o.tracking_number && <p className="mt-1 text-smoke">Tracking: <span className="text-ink">{o.tracking_number}</span></p>}
          <Link to={o.url} onClick={onNavigate} className="mt-2 inline-flex items-center gap-1 font-medium text-ink">
            <span className="link-draw">View order</span><Icon name="arrowRight" size={14} />
          </Link>
        </li>
      ))}
    </ul>
  )
}

// -------------------------------------------------------------- enquiry
type DraftFields = Pick<EnquiryDraft, 'name' | 'email' | 'idea' | 'reference_url' | 'dimensions' | 'notes'> & {
  colours: string; quantity: string
}

/** The brief, editable. Pressing Send is the customer's explicit confirmation; nothing is sent before it. */
export function EnquiryCard({ draft, onSubmit }: {
  draft: EnquiryDraft
  onSubmit: (d: Omit<EnquiryDraft, 'missing' | 'errors' | 'ready' | 'submitted' | 'request_id'>) => Promise<void>
}) {
  const [f, setF] = useState<DraftFields>({
    name: draft.name ?? '', email: draft.email ?? '', idea: draft.idea ?? '', reference_url: draft.reference_url ?? '',
    dimensions: draft.dimensions ?? '', notes: draft.notes ?? '', colours: draft.colours.join(', '),
    quantity: draft.quantity ? String(draft.quantity) : '',
  })
  const [state, setState] = useState<'idle' | 'sending' | { error: string }>('idle')
  const set = (k: keyof DraftFields) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))

  if (draft.submitted) {
    return (
      <div className="flex items-start gap-3 rounded-[1rem_0.3rem_1rem_1rem] border border-rule bg-paper-2 p-4 text-[13.5px]">
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-olive text-paper"><Icon name="check" size={14} /></span>
        <div><p className="font-medium text-ink">Brief sent to the studio</p>
          {draft.request_id && <p className="mt-0.5 text-fog">Reference {draft.request_id}</p>}</div>
      </div>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const url = f.reference_url?.trim()
    if (url && !/^https?:\/\/\S+\.\S+/i.test(url)) { setState({ error: 'The reference link should start with https://' }); return }
    const qty = f.quantity ? Number(f.quantity) : null
    if (qty !== null && (!Number.isInteger(qty) || qty < 1 || qty > 500)) { setState({ error: 'Quantity should be between 1 and 500.' }); return }
    setState('sending')
    try {
      await onSubmit({
        name: f.name!.trim(), email: f.email!.trim(), idea: f.idea!.trim(), reference_url: url || null,
        dimensions: f.dimensions?.trim() || null, notes: f.notes?.trim() || null, quantity: qty,
        colours: f.colours.split(',').map((c) => c.trim()).filter(Boolean).slice(0, 8),
      })
    } catch (err) {
      setState({ error: (err as Error).message })
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-[1.1rem_0.3rem_1.1rem_1.1rem] border border-rule bg-paper-2 p-4" aria-label="Custom creation brief">
      <p className="font-display text-[1.2rem] leading-tight text-ink">Your custom brief</p>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Name" value={f.name ?? ''} onChange={set('name')} required maxLength={80} autoComplete="name" />
        <Input label="Email" type="email" value={f.email ?? ''} onChange={set('email')} required maxLength={200} autoComplete="email" />
      </div>
      <Textarea label="Your idea" value={f.idea ?? ''} onChange={set('idea')} required minLength={10} maxLength={2000} rows={3}
        placeholder="What it is, what it's for, any style you love" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Size" value={f.dimensions ?? ''} onChange={set('dimensions')} maxLength={120} placeholder="About 20 cm tall" />
        <Input label="Quantity" inputMode="numeric" value={f.quantity} onChange={set('quantity')} maxLength={3} placeholder="1" />
      </div>
      <Input label="Colours" value={f.colours} onChange={set('colours')} maxLength={200} placeholder="Bone, terracotta" />
      <Input label="Reference image link" type="url" value={f.reference_url ?? ''} onChange={set('reference_url')} maxLength={500} placeholder="https://" />
      <Textarea label="Anything else" value={f.notes ?? ''} onChange={set('notes')} maxLength={1000} rows={2} />
      {typeof state === 'object' && <p className="text-[13px] text-accent" role="alert">{state.error}</p>}
      <Button type="submit" className="w-full" loading={state === 'sending'}>Send brief to the studio</Button>
      <p className="text-[12.5px] leading-snug text-fog">No payment now. The studio replies within three working days with questions, a sketch and a fixed price.</p>
    </form>
  )
}

// ------------------------------------------------------------- loading
/** The print head sweeping: the site's loading motif, small. */
export function Typing() {
  return (
    <div className="flex items-center gap-3 py-1" role="status" aria-label="Oddly is typing">
      <div className="h-px w-16 overflow-hidden bg-rule">
        <div className="h-full w-1/3 bg-ink" style={{ animation: 'so-sweep 1.1s var(--ease-in-out-quart) infinite alternate' }} />
      </div>
      <span className="label text-fog">Looking through the studio</span>
      <style>{'@keyframes so-sweep{from{transform:translateX(-100%)}to{transform:translateX(300%)}}'}</style>
    </div>
  )
}
