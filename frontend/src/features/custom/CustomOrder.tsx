import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Container } from '@/components/layout/Container'
import { PageHeader } from '@/components/layout/PageHeader'
import { Reveal } from '@/components/motion/Reveal'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'

const KINDS = [['lighting', 'Lighting'], ['decor', 'Décor piece'], ['desk', 'Desk object'], ['gift', 'Gift'], ['other', 'Something else']] as const
const SIZES = [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large'], ['not_sure', 'Not sure']] as const
const BUDGETS = [['under_1000', 'Under ₹1,000'], ['1000_2500', '₹1,000–2,500'], ['2500_5000', '₹2,500–5,000'], ['5000_plus', '₹5,000+'], ['not_sure', 'Not sure yet']] as const
// Filament swatches: [value sent with the brief, display name, colour]
const COLOURS = [
  ['white', 'Bone', '#ECE6DF'], ['black', 'Charcoal', '#3A3330'], ['pink', 'Clay rose', '#D9A089'], ['peach', 'Terracotta', '#D08A63'],
  ['butter', 'Honey', '#D9B57A'], ['mint', 'Sage', '#B5B08F'], ['sky', 'Stone', '#BDB2A3'], ['lilac', 'Mushroom', '#C4AE9C'],
] as const

const STEPS = [
  ['Brief', 'Tell us what you have in mind: a description, a reference, the space it is for.'],
  ['Design and quote', 'Within three working days we reply with questions, a first sketch and a fixed price.'],
  ['Make', 'Once you approve, we print, finish and inspect your piece, then ship it to you.'],
]

type State = 'idle' | 'sending' | 'sent' | { error: string }

function Choice<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void; options: readonly (readonly [T, string])[]
}) {
  return (
    <fieldset>
      <legend className="label mb-3 text-smoke">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, l]) => (
          <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={value === v}
            className={cn('rounded-full border px-4 py-2 text-[14px] transition-colors duration-300',
              value === v ? 'border-ink bg-ink text-paper' : 'border-ink/15 text-ink hover:border-ink')}>
            {l}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function Row({ n, children }: { n: string; children: ReactNode }) {
  return (
    <div className="grid gap-6 border-t border-rule py-8 sm:grid-cols-[3rem_1fr]">
      <span className="font-mono text-[11px] text-fog">{n}</span>
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  )
}

/** Commission brief: a structured form for one-off pieces. */
export function CustomOrder() {
  const [form, setForm] = useState({ name: '', email: '', idea: '', reference_url: '' })
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>('lighting')
  const [size, setSize] = useState<(typeof SIZES)[number][0]>('medium')
  const [budget, setBudget] = useState<(typeof BUDGETS)[number][0]>('not_sure')
  const [colours, setColours] = useState<string[]>([])
  const [state, setState] = useState<State>('idle')
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })
  const toggle = (c: string) => setColours((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]))
  const nameOf = (v: string) => COLOURS.find(([k]) => k === v)?.[1] ?? v

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.idea.trim().length < 10) return setState({ error: 'Please describe your idea in at least a sentence.' })
    setState('sending')
    try {
      await api('/custom-requests', {
        auth: false,
        body: { ...form, kind, size, budget, colours: colours.length ? colours : ['surprise me'], reference_url: form.reference_url.trim() || null },
      })
      setState('sent')
    } catch (err) {
      setState({ error: err instanceof ApiError ? err.message : 'Something went wrong. Please try again.' })
    }
  }

  return (
    <>
      <PageHeader trail={<><Link to="/" className="link-draw hover:text-ink">Home</Link><span>/</span><span className="text-ink">Commissions</span></>}
        title={<>Commissions, <span className="font-odd">made for one.</span></>}
        intro="We design and make one-off pieces to brief: lighting for a particular room, a gift, an object in a specific colour. Nothing is charged until you approve the design." />

      <Container className="grid gap-16 pb-28 sm:pb-40 lg:grid-cols-12 lg:gap-8">
        <Reveal stagger={0.08} className="lg:col-span-4">
          <p className="label mb-6 text-fog">How it works</p>
          {STEPS.map(([title, body], i) => (
            <div key={title} className="border-t border-rule py-6">
              <div className="flex items-baseline gap-5">
                <span className="font-mono text-[11px] text-fog">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="font-display text-2xl text-ink">{title}</h3>
                  <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-smoke">{body}</p>
                </div>
              </div>
            </div>
          ))}
        </Reveal>

        <div id="custom" className="lg:col-span-7 lg:col-start-6">
          <AnimatePresence mode="wait">
            {state === 'sent' ? (
              <motion.div key="sent" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="flex min-h-[28rem] flex-col justify-center gap-6 rounded-lg bg-paper-2 p-8 sm:p-12">
                <span className="label text-fog">Brief received</span>
                <p className="font-display text-5xl leading-[1] text-ink">Thank you, {form.name.split(' ')[0] || 'we have it'}.</p>
                <p className="max-w-md text-lg text-smoke">
                  We'll reply to <span className="text-ink">{form.email}</span> within three working days with questions, a first sketch and a quote.
                </p>
                <button className="link-draw self-start text-[15px] text-ink" onClick={() => {
                  setForm({ ...form, idea: '', reference_url: '' }); setColours([]); setState('idle')
                }}>Send another brief</button>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={submit} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
                <Reveal>
                  <Row n="01">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Input label="Name" required value={form.name} onChange={set('name')} autoComplete="name" />
                      <Input label="Email" type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
                    </div>
                  </Row>
                  <Row n="02">
                    <Choice label="Type of piece" value={kind} onChange={setKind} options={KINDS} />
                    <Choice label="Approximate size" value={size} onChange={setSize} options={SIZES} />
                  </Row>
                  <Row n="03">
                    <Textarea label="Describe your idea" required minLength={10} maxLength={2000} rows={5} value={form.idea} onChange={set('idea')}
                      placeholder="What it is, where it will live, and anything it needs to do." />
                    <Input label="Reference link (optional)" type="url" value={form.reference_url} onChange={set('reference_url')} placeholder="https://" />
                  </Row>
                  <Row n="04">
                    <fieldset>
                      <legend className="label mb-3 text-smoke">Colour preferences</legend>
                      <div className="flex flex-wrap items-center gap-3">
                        {COLOURS.map(([value, name, hex]) => (
                          <button key={value} type="button" onClick={() => toggle(value)} aria-pressed={colours.includes(value)} aria-label={name} title={name}
                            className={cn('size-9 rounded-full ring-offset-2 ring-offset-paper transition-[box-shadow,transform] duration-300 hover:scale-110',
                              colours.includes(value) ? 'ring-[1.5px] ring-ink' : 'ring-1 ring-ink/10')}
                            style={{ background: hex }} />
                        ))}
                        <span className="ml-1 text-[13px] text-fog">{colours.length ? colours.map(nameOf).join(', ') : 'Optional — leave blank and we’ll suggest a palette'}</span>
                      </div>
                    </fieldset>
                    <Choice label="Budget" value={budget} onChange={setBudget} options={BUDGETS} />
                  </Row>
                  <div className="flex flex-wrap items-center justify-between gap-6 border-t border-rule pt-8">
                    <p className="max-w-xs text-[13px] text-fog">No payment now. We'll confirm details and price with you first.</p>
                    <Button type="submit" size="lg" loading={state === 'sending'}>Send brief</Button>
                  </div>
                  {typeof state === 'object' && <p className="mt-4 text-[15px] text-accent" role="alert">{state.error}</p>}
                </Reveal>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </Container>
    </>
  )
}
