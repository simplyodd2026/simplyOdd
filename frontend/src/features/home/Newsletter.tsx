import { useState } from 'react'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/layout/Container'
import { Ransom } from '@/components/scrapbook/Ransom'
import { Daisy, GooglyBlob, HeartPatch, Lollipop, Planet, SmileyFlower } from '@/components/scrapbook/Stickers'
import { useProducts } from '@/lib/queries'

export function Newsletter() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'done' | { error: string }>('idle')
  const { data } = useProducts({ flag: 'new', sort: 'newest', page_size: 1 })
  const stamp = data?.items[0]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('loading')
    try {
      await api('/newsletter', { body: { email }, auth: false })
      setState('done')
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setState('done')
      else setState({ error: err instanceof Error ? err.message : 'Try again.' })
    }
  }

  return (
    <Container className="relative py-16 sm:py-24">
      <Planet className="absolute left-[2%] top-20 hidden w-28 -rotate-12 xl:block" />
      <Daisy className="absolute bottom-16 left-[6%] hidden w-20 rotate-12 xl:block" petal="#FBF7F0" centre="#F2CBAE" />
      <SmileyFlower className="absolute right-[4%] top-24 hidden w-20 rotate-6 xl:block" />
      <Lollipop className="absolute bottom-14 right-[7%] hidden w-14 -rotate-12 xl:block" a="#CBDABF" />
      {/* A vintage postcard: greeting on the left, address lines on the right. */}
      <div className="relative mx-auto max-w-5xl -rotate-1">
        <div className="grain relative grid overflow-hidden rounded-md bg-paper-2 shadow-[0_28px_50px_-26px_rgb(67_48_42/0.6)] md:grid-cols-2">
          <div className="relative flex flex-col justify-center gap-4 bg-lilac/60 p-8 sm:p-10">
            <p className="font-hand text-lg text-plum">greetings from</p>
            <h2 className="text-[clamp(2.4rem,5vw,3.75rem)]"><Ransom text="the odd side" seed="postcard" /></h2>
            <p className="max-w-sm text-graphite">
              One email when something weird drops. No spam, no “we miss you”, just new odd things.
            </p>
            <GooglyBlob className="absolute right-4 top-4 w-16 rotate-6" />
          </div>

          <div className="relative p-8 sm:p-10 md:border-l-2 md:border-dashed md:border-ink/15">
            {/* Stamp + postmark */}
            <div className="flex justify-end">
              <div className="relative rotate-3 bg-paper-3 p-1 shadow-sm">
                <div className="w-20 border-4 border-dotted border-paper-3 bg-paper p-1.5">
                  {stamp ? <img src={stamp.images[0]?.url} alt="" className="aspect-[4/5] w-full object-cover" /> : <div className="aspect-[4/5] bg-ash" />}
                </div>
                <span aria-hidden="true" className="absolute -left-10 top-4 block size-16 rounded-full border-2 border-ink/40" />
              </div>
            </div>

            {state === 'done' ? (
              <p className="mt-8 font-hand text-2xl leading-snug text-ink">Delivered! You're on the list. We send one email per drop, and nothing else. <span aria-hidden="true">♡</span></p>
            ) : (
              <form onSubmit={submit} className="mt-6 flex flex-col gap-5">
                <label htmlFor="nl-email" className="font-hand text-lg text-smoke">to: (your email, please)</label>
                <input id="nl-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="-mt-3 h-12 border-b-2 border-ink/25 bg-transparent px-1 text-xl text-ink outline-none placeholder:text-fog/70 focus:border-accent" />
                <div aria-hidden="true" className="h-px bg-ink/15" />
                <div aria-hidden="true" className="h-px bg-ink/15" />
                <div className="flex items-center justify-between gap-4">
                  <p className="font-hand text-sm text-smoke">postage paid by us</p>
                  <Button type="submit" size="md" loading={state === 'loading'}>Send it ✉</Button>
                </div>
                {typeof state === 'object' && <p className="font-medium text-accent">{state.error}</p>}
              </form>
            )}
          </div>
        </div>
        <HeartPatch className="absolute -bottom-6 -left-5 w-16 -rotate-12" />
      </div>
    </Container>
  )
}
