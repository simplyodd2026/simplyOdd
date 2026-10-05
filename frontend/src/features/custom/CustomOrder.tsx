import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Container } from '@/components/layout/Container'
import { Reveal, SplitReveal } from '@/components/motion/Reveal'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { TornNote } from '@/components/scrapbook/Torn'
import { Tape } from '@/components/paper/Fasteners'
import { useProducts } from '@/lib/queries'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'

const EASE = [0.16, 1, 0.3, 1] as const
const KINDS = [['lighting', 'Lighting'], ['decor', 'Décor piece'], ['desk', 'Desk object'], ['gift', 'Gift'], ['other', 'Something else']] as const
const SIZES = [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large'], ['not_sure', 'Not sure']] as const
const BUDGETS = [['under_1000', 'Under ₹1,000'], ['1000_2500', '₹1,000–2,500'], ['2500_5000', '₹2,500–5,000'], ['5000_plus', '₹5,000+'], ['not_sure', 'Not sure yet']] as const
// Filament swatches: [value sent with the brief, display name, colour]
const COLOURS = [
  ['white', 'Bone', '#ECE6DF'], ['black', 'Charcoal', '#3A3330'], ['pink', 'Clay rose', '#D9A089'], ['peach', 'Terracotta', '#D08A63'],
  ['butter', 'Honey', '#D9B57A'], ['mint', 'Sage', '#B5B08F'], ['sky', 'Stone', '#BDB2A3'], ['lilac', 'Mushroom', '#C4AE9C'],
] as const

// The three stages, each on its own slab: terracotta, linen, olive.
const STEPS = [
  ['Send a brief', 'Tell us what you have in mind: a description, a reference, the space it is for.', 'bg-hot text-paper'],
  ['Design and quote', 'Within three working days we reply with questions, a first sketch and a fixed price.', 'bg-paper-2 text-ink'],
  ['Made for you', 'Once you approve, we build, finish and inspect your piece, then ship it to you.', 'bg-olive text-paper'],
] as const

type State = 'idle' | 'sending' | 'sent' | { error: string }

function Choice<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void; options: readonly (readonly [T, string])[]
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-[14px] text-smoke">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, l]) => (
          <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={value === v}
            className={cn('rounded-full border px-4 py-2 text-[14px] transition-colors duration-300',
              value === v ? 'border-ink bg-ink text-paper' : 'border-ink/15 bg-paper/60 text-ink hover:border-ink')}>
            {l}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

/** One part of the brief: a serif heading on the left, its fields on the right. */
function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-6 border-t border-ink/10 py-9 md:grid-cols-[11rem_1fr] md:gap-10">
      <h3 className="font-display text-[1.6rem] leading-tight text-ink">{title}</h3>
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  )
}

/**
 * Customise: a page for one-off pieces. It opens with the promise and one of the studio's pieces under a
 * pinned note, walks through the three steps on coloured slabs, then lays the brief out on a sheet of
 * paper. Nothing is charged until the customer approves the design.
 */
export function CustomOrder() {
  const [form, setForm] = useState({ name: '', email: '', idea: '', reference_url: '' })
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>('lighting')
  const [size, setSize] = useState<(typeof SIZES)[number][0]>('medium')
  const [budget, setBudget] = useState<(typeof BUDGETS)[number][0]>('not_sure')
  const [colours, setColours] = useState<string[]>([])
  const [state, setState] = useState<State>('idle')
  const { data } = useProducts({ flag: 'featured', sort: 'popular', page_size: 1 })
  const piece = data?.items[0]
  const photo = piece?.images[1] ?? piece?.images[0]
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
      {/* The promise, and a piece of ours under a pinned note. */}
      <Container className="pb-20 pt-12 sm:pb-28 sm:pt-20">
        <div className="mx-auto grid max-w-[1360px] items-center gap-16 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <nav className="mb-10 flex gap-2 text-[13px] text-fog" aria-label="Breadcrumb">
              <Link to="/" className="link-draw hover:text-ink">Home</Link><span aria-hidden>/</span><span className="text-ink">Customise</span>
            </nav>
            <p className="font-script text-[clamp(2.6rem,4vw,3.6rem)] leading-none text-accent">made for one</p>
            <SplitReveal as="h1" on="load" delay={0.1} className="mt-3 font-display text-[clamp(3rem,5.4vw,5.75rem)] leading-[0.98] text-ink">
              Customise a piece,<br /><span className="font-odd">just for your space.</span>
            </SplitReveal>
            <Reveal delay={0.35} y={16}>
              <p className="mt-8 max-w-[30rem] text-[17px] leading-[1.7] text-graphite">
                Lighting for a particular corner, a gift for someone hard to buy for, an object in exactly your colour. Tell us the idea and we’ll design, build and finish it by hand.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
                <a href="#brief" className="inline-flex h-14 items-center rounded-full bg-hot px-8 text-[15px] font-medium text-paper transition-colors duration-500 hover:bg-ink">Start your brief</a>
                <span className="text-[14px] text-smoke">Nothing to pay until you approve the design.</span>
              </div>
            </Reveal>
          </div>

          <div className="relative mx-auto w-full max-w-[min(24rem,calc((100svh-12rem)*0.75))] lg:col-span-4 lg:col-start-9">
            <span aria-hidden className="pebble morph absolute -left-[22%] bottom-[6%] -z-10 aspect-square w-[78%] bg-clay/60" />
            <motion.div initial={{ clipPath: 'inset(100% 0% 0% 0%)' }} animate={{ clipPath: 'inset(0% 0% 0% 0%)' }} transition={{ duration: 1.4, ease: EASE, delay: 0.25 }}
              className="table-shadow arch aspect-[3/4] overflow-hidden bg-ash">
              {photo && <img src={photo.url} alt={photo.alt || piece?.name || 'A piece made in our studio'} className="size-full object-cover" />}
            </motion.div>
            {/* A torn note taped over the corner of the photograph. */}
            <motion.div initial={{ opacity: 0, rotate: 0, y: 12 }} animate={{ opacity: 1, rotate: -6, y: 0 }} transition={{ duration: 1, ease: EASE, delay: 0.9 }}
              className="absolute -bottom-8 -right-4 w-[62%] sm:-right-10">
              <Tape tone="sage" className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rotate-3" />
              <TornNote seed="your-idea" paperClassName="grid place-items-center px-5 py-7 text-center">
                <p className="font-script text-[2.1rem] leading-[1.05] text-ink">your idea,<br />built.</p>
              </TornNote>
            </motion.div>
          </div>
        </div>
      </Container>

      {/* How it works, on three coloured slabs over a band of linen. */}
      <section className="relative py-16 sm:py-24">
        <div aria-hidden className="linen absolute inset-x-0 top-[24%] h-[52%] bg-sand max-md:hidden" />
        <Container>
          <div className="relative mx-auto max-w-[1360px]">
            <h2 className="mb-10 font-display text-[clamp(2.4rem,4.4vw,4.2rem)] leading-[1] text-ink">How it works</h2>
            <Reveal stagger={0.1} y={36} as="ol" className="grid gap-5 md:grid-cols-3 md:gap-6">
              {STEPS.map(([title, body, tone], i) => (
                <li key={title} className={cn('flex min-h-[15rem] flex-col justify-between p-8 sm:p-9', i % 2 ? 'slab-r ring-1 ring-ink/5' : 'slab', tone)}>
                  <span className="font-odd text-[2.2rem] leading-none opacity-80">{['i', 'ii', 'iii'][i]}.</span>
                  <span>
                    <span className="block font-display text-[clamp(1.9rem,2.6vw,2.4rem)] leading-tight">{title}</span>
                    <span className="mt-3 block max-w-[20rem] text-[15px] leading-relaxed opacity-85">{body}</span>
                  </span>
                </li>
              ))}
            </Reveal>
          </div>
        </Container>
      </section>

      {/* The brief, laid out on a sheet of paper. */}
      <Container className="pb-28 pt-12 sm:pb-36 sm:pt-20">
        <div id="brief" className="table-shadow grain mx-auto max-w-[60rem] scroll-mt-28 rounded-[2.5rem_0.5rem_2.5rem_2.5rem] bg-[#F9F6F1] px-6 py-12 sm:px-12 sm:py-16 lg:px-16">
          <AnimatePresence mode="wait">
            {state === 'sent' ? (
              <motion.div key="sent" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE }}
                className="flex min-h-[26rem] flex-col items-center justify-center gap-5 text-center">
                <p className="font-script text-[clamp(3.4rem,6vw,5rem)] leading-none text-accent">thank you</p>
                <p className="font-display text-[clamp(2.4rem,4.4vw,3.6rem)] leading-[1.02] text-ink">We have your brief, {form.name.split(' ')[0] || 'friend'}.</p>
                <p className="max-w-md text-[17px] leading-relaxed text-smoke">
                  We’ll reply to <span className="text-ink">{form.email}</span> within three working days with questions, a first sketch and a quote.
                </p>
                <button className="link-draw mt-2 text-[15px] font-medium text-ink" onClick={() => {
                  setForm({ ...form, idea: '', reference_url: '' }); setColours([]); setState('idle')
                }}>Send another brief</button>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={submit} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                  <h2 className="font-display text-[clamp(2.6rem,5vw,4.4rem)] leading-[1] text-ink">Your brief</h2>
                  <p className="font-script -rotate-3 text-[clamp(2.2rem,3.4vw,2.9rem)] leading-none text-accent">tell us everything</p>
                </div>

                <Part title="About you">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Input label="Name" required value={form.name} onChange={set('name')} autoComplete="name" />
                    <Input label="Email" type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
                  </div>
                </Part>
                <Part title="The piece">
                  <Choice label="Type of piece" value={kind} onChange={setKind} options={KINDS} />
                  <Choice label="Approximate size" value={size} onChange={setSize} options={SIZES} />
                </Part>
                <Part title="Your idea">
                  <Textarea label="Describe your idea" required minLength={10} maxLength={2000} rows={5} value={form.idea} onChange={set('idea')}
                    placeholder="What it is, where it will live, and anything it needs to do." />
                  <Input label="Reference link (optional)" type="url" value={form.reference_url} onChange={set('reference_url')} placeholder="https://" />
                </Part>
                <Part title="Colour and budget">
                  <fieldset>
                    <legend className="mb-3 text-[14px] text-smoke">Colour preferences</legend>
                    <div className="flex flex-wrap items-center gap-3">
                      {COLOURS.map(([value, name, hex]) => (
                        <button key={value} type="button" onClick={() => toggle(value)} aria-pressed={colours.includes(value)} aria-label={name} title={name}
                          className={cn('plate size-10 ring-offset-2 ring-offset-[#F9F6F1] transition-[box-shadow,transform] duration-300 hover:scale-110',
                            colours.includes(value) ? 'ring-[1.5px] ring-ink' : 'ring-1 ring-ink/10')}
                          style={{ background: hex }} />
                      ))}
                    </div>
                    <p className="mt-3 text-[13px] text-fog">{colours.length ? colours.map(nameOf).join(', ') : 'Optional. Leave it blank and we’ll suggest a palette.'}</p>
                  </fieldset>
                  <Choice label="Budget" value={budget} onChange={setBudget} options={BUDGETS} />
                </Part>

                <div className="flex flex-wrap items-center justify-between gap-6 border-t border-ink/10 pt-9">
                  <p className="max-w-xs text-[14px] leading-relaxed text-smoke">No payment now. We’ll confirm the details and the price with you first.</p>
                  <Button type="submit" variant="terra" size="lg" loading={state === 'sending'}>Send my brief</Button>
                </div>
                {typeof state === 'object' && <p className="mt-4 text-[15px] text-accent" role="alert">{state.error}</p>}
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </Container>
    </>
  )
}
