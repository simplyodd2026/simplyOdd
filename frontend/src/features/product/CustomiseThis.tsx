import { useState } from 'react'
import type { Category, Product } from '@/lib/types'
import { api, ApiError } from '@/lib/api'
import { useFilaments } from '@/lib/filaments'
import { useSession } from '@/stores/session'
import { Modal } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { Swatch } from '@/components/product/ColorSwatches'
import { cn } from '@/lib/cn'
import { responsive } from '@/lib/image'

const CHANGES = [['size', 'Size'], ['colour', 'Colour'], ['personalise', 'A name or text'], ['other', 'Something else']] as const
type Change = (typeof CHANGES)[number][0]
const MAX_COLOURS = 3
// The brief's "type of piece", from the product's collection.
const KIND_BY_CATEGORY: Record<string, string> = { lighting: 'lighting', 'home-decor': 'decor', 'desk-objects': 'desk' }

type State = 'idle' | 'sending' | 'sent' | { error: string }

/**
 * "Customise this piece": a short brief about this product, sent to the studio as a custom request with the
 * product attached. Colour choices come from the full filament palette, since a one-off isn't limited to the
 * colours the standard piece is sold in.
 */
export function CustomiseThis({ product, category, className }: { product: Product; category: Category | null; className?: string }) {
  const user = useSession((s) => s.user)
  const profile = useSession((s) => s.profile)
  const { list: palette } = useFilaments()
  const [open, setOpen] = useState(false)
  const [changes, setChanges] = useState<Change[]>([])
  const [colours, setColours] = useState<string[]>([])
  const [form, setForm] = useState({ name: '', email: '', idea: '' })
  const [state, setState] = useState<State>('idle')

  const start = () => {
    // Fill in who they are when signed in; keep anything already typed.
    setForm((f) => ({ ...f, name: f.name || profile?.name || user?.name || '', email: f.email || profile?.email || user?.email || '' }))
    if (state === 'sent') { setChanges([]); setColours([]); setForm((f) => ({ ...f, idea: '' })) }
    setState('idle')
    setOpen(true)
  }
  const toggleChange = (c: Change) => setChanges((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]))
  const toggleColour = (name: string) => setColours((cs) => (cs.includes(name) ? cs.filter((x) => x !== name)
    : cs.length < MAX_COLOURS ? [...cs, name] : cs))
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.idea.trim().length < 10) return setState({ error: 'Tell us a little more: at least a sentence about what you’d change.' })
    setState('sending')
    try {
      await api('/custom-requests', {
        auth: false,
        body: {
          ...form, product_id: product.id, changes, kind: KIND_BY_CATEGORY[category?.slug ?? ''] ?? 'other',
          colours: changes.includes('colour') ? colours : [],
        },
      })
      setState('sent')
    } catch (err) {
      setState({ error: err instanceof ApiError ? err.message : 'Something went wrong. Please try again.' })
    }
  }

  const chip = (on: boolean) => cn('rounded-full border px-4 py-2 text-[14px] transition-colors duration-300',
    on ? 'border-ink bg-ink text-paper' : 'border-ink/15 text-ink hover:border-ink')

  return (
    <>
      <button type="button" onClick={start} title="A different size or colour, or a name on it. We’ll quote before you pay."
        className={cn('inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-ink/15 px-4 text-[14px] text-ink transition-colors duration-300 hover:border-ink hover:bg-ink hover:text-paper', className)}>
        <Icon name="edit" size={15} /> Customise this piece
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={state === 'sent' ? 'Thank you' : 'Customise this piece'}>
        {state === 'sent' ? (
          <div className="flex flex-col gap-4">
            <p className="text-[16px] leading-relaxed text-graphite">
              We have your request for the <span className="text-ink">{product.name}</span>. We’ll reply to{' '}
              <span className="text-ink">{form.email}</span> within three working days with any questions and a price.
            </p>
            <p className="text-[14px] text-fog">Nothing to pay until you approve it.</p>
            <Button className="mt-2 self-start" onClick={() => setOpen(false)}>Done</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-6">
            <div className="flex items-center gap-4 rounded-lg bg-paper-2 p-3">
              {product.images[0] && <img {...responsive(product.images[0].url, '56px')} alt="" className="plate size-14 shrink-0 bg-ash object-cover" />}
              <div className="min-w-0">
                <p className="text-[12px] text-fog">Starting from</p>
                <p className="truncate font-display text-[1.25rem] leading-tight text-ink">{product.name}</p>
              </div>
            </div>

            <fieldset>
              <legend className="mb-3 text-[14px] text-smoke">What would you like to change?</legend>
              <div className="flex flex-wrap gap-2">
                {CHANGES.map(([v, l]) => (
                  <button key={v} type="button" aria-pressed={changes.includes(v)} onClick={() => toggleChange(v)} className={chip(changes.includes(v))}>{l}</button>
                ))}
              </div>
            </fieldset>

            {changes.includes('colour') && palette.length > 0 && (
              <fieldset>
                <legend className="mb-3 flex w-full items-baseline justify-between gap-3 text-[14px] text-smoke">
                  Colours you’d like
                  <span className="text-[12.5px] text-fog">{colours.length ? colours.join(', ') : `Up to ${MAX_COLOURS}`}</span>
                </legend>
                <div className="-mx-1 flex flex-wrap gap-1">
                  {palette.map((f) => {
                    const on = colours.includes(f.name)
                    const full = !on && colours.length >= MAX_COLOURS
                    return (
                      <button key={f.id} type="button" aria-pressed={on} aria-label={f.name} title={f.name} disabled={full} onClick={() => toggleColour(f.name)}
                        className={cn('grid size-9 place-items-center rounded-full p-[3px] transition-shadow duration-200 disabled:opacity-35',
                          on ? 'shadow-[inset_0_0_0_1.5px_var(--color-ink)]' : 'hover:shadow-[inset_0_0_0_1px_rgb(42_31_23/0.35)]')}>
                        <Swatch filament={f} className="size-full" />
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            )}

            <Textarea label="Tell us more" required minLength={10} maxLength={2000} rows={4} value={form.idea} onChange={set('idea')}
              placeholder={changes.includes('personalise') ? 'The name or text, and where it should go.' : 'Sizes, where it will live, anything it needs to do.'} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Name" required value={form.name} onChange={set('name')} autoComplete="name" />
              <Input label="Email" type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
            </div>

            {typeof state === 'object' && <p className="text-[14px] text-accent" role="alert">{state.error}</p>}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-[16rem] text-[13px] leading-relaxed text-fog">No payment now. We’ll confirm the details and price first.</p>
              <Button type="submit" size="lg" loading={state === 'sending'}>Send request</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
