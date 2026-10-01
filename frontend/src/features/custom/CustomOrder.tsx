import { useState } from 'react'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
import { Ransom } from '@/components/scrapbook/Ransom'
import { Bolt, Daisy, Planet, Sparkle } from '@/components/scrapbook/Stickers'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'

const KINDS = [['lighting', 'lamp'], ['decor', 'home décor piece'], ['desk', 'desk buddy'], ['gift', 'gift'], ['other', 'something else entirely']] as const
const SIZES = [['small', 'tiny'], ['medium', 'medium'], ['large', 'big'], ['not_sure', 'any-size']] as const
const BUDGETS = [['under_1000', 'under ₹1,000'], ['1000_2500', '₹1,000–2,500'], ['2500_5000', '₹2,500–5,000'], ['5000_plus', '₹5,000+'], ['not_sure', 'not sure yet']] as const
const COLOURS = [
  ['pink', '#F4D3D7'], ['butter', '#F3DF9E'], ['lilac', '#D3C8EE'], ['mint', '#CBDABF'],
  ['sky', '#BFD1E8'], ['peach', '#F2CBAE'], ['white', '#FFFFFF'], ['black', '#3A3330'],
] as const

// Tap-to-fill starting points for people who aren't sure how to describe their idea.
const INSPO = ['a lamp shaped like my cat', 'a planter with a tiny grumpy face', 'a vase that looks like it’s melting',
  'a pen cup shaped like a boot', 'a mini version of my dog', 'a ring dish shaped like a cloud']

const STEPS = [
  ['Tell us the idea', 'Words, a doodle, a vibe, a link. Anything goes.'],
  ['We sketch & quote', 'We email you back with questions, a sketch and a price.'],
  ['We print it for you', 'Printed layer by layer, finished by hand, shipped to your door.'],
]

type State = 'idle' | 'sending' | 'sent' | { error: string }

/** "Made just for you": a mad-libs style order slip for one-off custom pieces. */
export function CustomOrder() {
  const [form, setForm] = useState({ name: '', email: '', idea: '', kind: 'lighting', size: 'medium', budget: 'not_sure', reference_url: '' })
  const [colours, setColours] = useState<string[]>([])
  const [state, setState] = useState<State>('idle')
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })
  const toggle = (c: string) => setColours((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.idea.trim().length < 10) return setState({ error: 'Tell us a little more about your idea (at least a sentence).' })
    setState('sending')
    try {
      await api('/custom-requests', {
        auth: false,
        body: { ...form, colours: colours.length ? colours : ['surprise me'], reference_url: form.reference_url.trim() || null },
      })
      setState('sent')
    } catch (err) {
      setState({ error: err instanceof ApiError ? err.message : 'Something went wrong. Please try again.' })
    }
  }

  return (
    <Container className="py-16 sm:py-20">
      <section id="custom" className="graph-paper relative overflow-hidden rounded-[2.5rem] px-6 py-12 shadow-[inset_0_0_0_1px_rgb(67_48_42/0.06)] sm:px-12 lg:px-16 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Left: the pitch and how it works */}
          <div className="relative lg:col-span-4">
            <p className="font-hand -rotate-2 text-lg text-accent">got something in mind? <span aria-hidden="true">♡</span></p>
            <h2 className="mt-3 text-[clamp(2.4rem,4.6vw,3.75rem)]"><Ransom text="made just for you" seed="custom" /></h2>
            <p className="mt-5 max-w-sm text-lg text-graphite">
              A lamp shaped like your cat. A vase in your favourite colour. A desk thing nobody else has.
              Tell us, and we'll design it and print it, one of one.
            </p>
            <ol className="mt-10 flex flex-col gap-6">
              {STEPS.map(([title, body], i) => (
                <li key={title} className="relative flex gap-4">
                  <span className="grid size-11 shrink-0 -rotate-6 place-items-center rounded-full border-2 border-dashed border-ink/40 bg-paper font-display text-xl text-ink">{i + 1}</span>
                  <div>
                    <p className="font-semibold text-ink">{title}</p>
                    <p className="text-sm text-smoke">{body}</p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <svg aria-hidden="true" viewBox="0 0 20 40" className="absolute left-3 top-12 h-6 w-5 text-ink/30">
                      <path d="M10 2C4 12 16 22 10 36" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 4" strokeLinecap="round" />
                    </svg>
                  )}
                </li>
              ))}
            </ol>
            <Planet className="absolute -bottom-6 right-2 hidden w-24 rotate-12 lg:block" />
          </div>

          {/* Right: the order slip */}
          <div className="relative lg:col-span-8">
            <div className="tape relative -rotate-1 rounded-2xl bg-paper p-6 shadow-[0_24px_40px_-24px_rgb(67_48_42/0.55)] sm:p-10">
              {state === 'sent' ? (
                <div className="flex min-h-[26rem] flex-col items-center justify-center gap-4 text-center">
                  <Daisy className="w-20" />
                  <p className="font-display text-4xl text-ink">Idea received!</p>
                  <p className="max-w-md text-lg text-graphite">
                    We'll email <span className="font-semibold text-ink">{form.email}</span> with questions, a sketch and a price.
                  </p>
                  <button className="font-hand text-base text-accent underline-offset-4 hover:underline" onClick={() => {
                    setForm({ ...form, idea: '', reference_url: '' }); setColours([]); setState('idle')
                  }}>send another idea</button>
                </div>
              ) : (
                <form onSubmit={submit} className="text-xl leading-[2.4] text-ink sm:text-2xl">
                  <p className="font-hand -mt-2 mb-3 text-sm leading-none text-smoke">fill in the blanks ✎</p>
                  <p>
                    Hi! I'm <Blank label="Your name" required value={form.name} onChange={set('name')} placeholder="your name" className="w-40 sm:w-48" /> and
                    you can reach me at <Blank label="Your email" required type="email" value={form.email} onChange={set('email')} placeholder="you@email.com" className="w-60 sm:w-72" />.
                  </p>
                  <p>
                    I'd love a <Choice label="Size" value={form.size} onChange={set('size')} options={SIZES} />{' '}
                    <Choice label="Kind of piece" value={form.kind} onChange={set('kind')} options={KINDS} /> that looks like…
                  </p>
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-sm leading-normal">
                    <span className="font-hand text-smoke">need inspo? tap one:</span>
                    {INSPO.map((idea) => (
                      <button key={idea} type="button" onClick={() => setForm({ ...form, idea: idea.charAt(0).toUpperCase() + idea.slice(1) + ', ' })}
                        className="rounded-full bg-paper-3 px-3 py-1 text-ink transition-colors hover:bg-butter">{idea}</button>
                    ))}
                  </div>
                  <label className="sr-only" htmlFor="custom-idea">Describe your idea</label>
                  <textarea id="custom-idea" required minLength={10} maxLength={2000} value={form.idea} onChange={set('idea')} rows={3}
                    placeholder="a cloud that holds my rings, but make it grumpy…"
                    className="lined-paper mt-1 w-full resize-none rounded-xl border-2 border-dashed border-ink/20 px-4 pl-16 text-lg leading-[34px] text-ink outline-none placeholder:text-fog/70 focus:border-accent" />
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span>in</span>
                    {COLOURS.map(([name, hex]) => (
                      <button key={name} type="button" onClick={() => toggle(name)} aria-pressed={colours.includes(name)} aria-label={name} title={name}
                        className={cn('size-9 rounded-full border-2 transition-transform hover:scale-110',
                          colours.includes(name) ? 'scale-110 border-ink ring-2 ring-ink ring-offset-2' : 'border-ink/15')}
                        style={{ background: hex }} />
                    ))}
                    <span className="font-hand text-base text-smoke">{colours.length ? colours.join(', ') : '(or leave it, surprise me)'}</span>
                  </div>
                  <p className="mt-2">
                    and I'm thinking around <Choice label="Budget" value={form.budget} onChange={set('budget')} options={BUDGETS} />.
                  </p>
                  <p className="text-base leading-[2.4] text-smoke">
                    Got a picture or a Pinterest board? <Blank label="Reference link (optional)" type="url" value={form.reference_url} onChange={set('reference_url')}
                      placeholder="paste a link (optional)" className="w-64 text-base sm:w-80" />
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <Button type="submit" size="lg" loading={state === 'sending'}>Send my idea ✦</Button>
                    <p className="font-hand text-sm leading-snug text-smoke">no payment now, we'll talk first ♡</p>
                  </div>
                  {typeof state === 'object' && <p className="mt-3 text-base font-medium text-accent" role="alert">{state.error}</p>}
                </form>
              )}
            </div>
            <Sparkle className="absolute -right-3 -top-6 w-12" />
            <Bolt className="absolute -bottom-8 left-6 hidden w-12 -rotate-12 sm:block" color="#D3C8EE" />
          </div>
        </div>
      </section>
    </Container>
  )
}

const blank = 'mx-1 inline-block border-b-2 border-dashed border-ink/35 bg-transparent px-1 font-semibold text-accent outline-none placeholder:font-normal placeholder:text-fog/60 focus:border-accent'

function Blank({ label, className, ...rest }: { label: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <input aria-label={label} className={cn(blank, 'leading-tight', className)} {...rest} />
}

function Choice({ label, value, onChange, options }: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: readonly (readonly [string, string])[]
}) {
  return (
    <span className="relative inline-block">
      <select aria-label={label} value={value} onChange={onChange} className={cn(blank, 'cursor-pointer appearance-none pr-6 leading-tight [field-sizing:content]')}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-sm text-accent">▾</span>
    </span>
  )
}
