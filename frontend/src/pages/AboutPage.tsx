import { Container } from '@/components/layout/Container'
import { ButtonLink } from '@/components/ui/Button'
import { Wordmark } from '@/components/brand/Wordmark'
import { useDocumentTitle } from '@/lib/hooks'

const PROCESS = [
  ['Question', 'Every object starts with a “what if”. What if a vase leaned? What if a lamp grew? Most questions go nowhere. The good ones get drawn.'],
  ['Draw', 'We model each piece in-house, then print prototypes until the proportions feel slightly wrong in the right way.'],
  ['Print', 'Pieces are printed to order at fine layer heights in plant-based PLA or heat-resistant PETG, depending on what they need to survive.'],
  ['Finish', 'Each piece is sanded, sealed where needed, inspected by hand and packed in recycled paper pulp.'],
]

export default function AboutPage() {
  useDocumentTitle('About')
  return (
    <>
      <Container className="pt-12 sm:pt-20">
        <p className="text-[length:var(--text-wordmark)] leading-[0.82] text-ink"><Wordmark /></p>
        <div className="mt-12 grid gap-10 lg:grid-cols-12">
          <h1 className="font-serif text-4xl font-light italic leading-tight text-balance sm:text-5xl lg:col-span-7">
            A small studio making objects that don't need to exist, and caring about them anyway.
          </h1>
          <div className="flex flex-col gap-5 text-lg leading-relaxed text-smoke lg:col-span-4 lg:col-start-9">
            <p>We started Simply Odd because most homes are full of things nobody really looks at. We wanted to make the opposite: pieces that make people stop, tilt their heads, and ask where you got it.</p>
            <p>Everything is designed by us and 3D printed in small batches in Bengaluru. Printing to order means we don’t warehouse thousands of units, and it means we can keep experimenting.</p>
          </div>
        </div>
      </Container>

      <div className="mt-24 border-y border-rule bg-paper-2">
        <Container className="grid gap-3 py-3 sm:grid-cols-3">
          {['fungal-lamp-2', 'stair-to-nowhere-1', 'egg-on-legs-2'].map((img) => (
            <img key={img} src={`/seed/${img}.svg`} alt="" className="aspect-[4/5] w-full object-cover" loading="lazy" />
          ))}
        </Container>
      </div>

      <Container className="py-24">
        <h2 className="mb-10 border-b border-rule pb-4 text-[length:var(--text-heading)] font-display leading-none">How a piece gets made</h2>
        <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {PROCESS.map(([title, body], i) => (
            <li key={title} className="flex flex-col gap-3">
              <span className="text-sm tabular-nums text-accent">Step {i + 1}</span>
              <h3 className="text-3xl font-bold w-wide">{title}</h3>
              <p className="leading-relaxed text-smoke">{body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-16 flex flex-wrap gap-3">
          <ButtonLink to="/shop" size="lg">Shop the collection</ButtonLink>
          <a href="mailto:hello@simplyodd.in" className="inline-flex h-14 items-center px-2 text-smoke underline underline-offset-4 hover:text-ink">Commission something odd</a>
        </div>
      </Container>
    </>
  )
}
