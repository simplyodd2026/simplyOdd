import { Container, SectionHeading } from '@/components/layout/Container'
import { Bolt, Lollipop } from '@/components/scrapbook/Stickers'
import { Slang } from '@/components/scrapbook/Slang'

const PRINCIPLES = [
  ['Designed differently', "Every object starts as a question nobody asked. We don't copy, and we don't follow trends."],
  ['Made on demand', 'Most pieces are printed after you order, so nothing sits in a warehouse and nothing is wasted.'],
  ['Small batch', 'We make a few at a time and inspect each one by hand before it leaves the studio.'],
  ['Original designs', 'Every file is drawn in-house. If you see it here, you won’t see it anywhere else.'],
  ['Carefully crafted', 'Sanded, sealed and checked. The layer lines stay because they’re beautiful, not because we skipped a step.'],
]

// Square sticky notes held up by fridge magnets, each in its own colour and tilt.
const NOTES = [
  { paper: 'bg-butter', tilt: -3, magnet: '#E88F9B' },
  { paper: 'bg-pink', tilt: 2, magnet: '#6F8FC9' },
  { paper: 'bg-sky', tilt: -1, magnet: '#E9C45A' },
  { paper: 'bg-mint', tilt: 3, magnet: '#B59BE0' },
  { paper: 'bg-lilac', tilt: -2, magnet: '#7FAE6F' },
]

export function Principles() {
  return (
    <Container className="relative py-16 sm:py-20">
      <Bolt className="absolute left-[23%] top-10 hidden w-12 -rotate-12 lg:block" color="#CBDABF" />
      <Lollipop className="absolute right-[15%] top-8 hidden w-11 rotate-12 lg:block" a="#F2CBAE" />
      <Slang text="we understood the assignment" tone="pink" tilt={-4} className="absolute left-[2%] top-8 hidden xl:inline-flex" />
      <SectionHeading center variant="label" kicker="the fine print, but fun" title="Why Simply Odd" />
      <dl className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
        {PRINCIPLES.map(([title, body], i) => {
          const { paper, tilt, magnet } = NOTES[i]
          return (
            <div key={title} className="relative transition-transform duration-300 ease-[var(--ease-spring)] hover:-translate-y-1 hover:!rotate-0" style={{ rotate: `${tilt}deg` }}>
              <span aria-hidden="true" className="absolute -top-3 left-1/2 z-10 block h-7 w-12 -translate-x-1/2 rounded-full shadow-[0_4px_6px_rgb(0_0_0/0.3)]"
                style={{ background: `radial-gradient(ellipse at 35% 30%, #ffffffb3 0 16%, ${magnet} 24%)` }} />
              <div className={`note-lift grain flex aspect-square flex-col gap-2 p-6 ${paper}`}>
                <span className="font-hand text-sm text-smoke">rule no. {i + 1}</span>
                <dt className="font-display text-[1.7rem] leading-none text-ink">{title}</dt>
                <dd className="text-[14px] leading-relaxed text-graphite">{body}</dd>
              </div>
            </div>
          )
        })}
      </dl>
    </Container>
  )
}
