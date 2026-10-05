import { Container } from '@/components/layout/Container'
import { Reveal, SplitReveal } from '@/components/motion/Reveal'
import { AboutSheet } from '@/features/about/AboutSheet'
import { Magnetic } from '@/components/motion/Magnetic'
import { ButtonLink } from '@/components/ui/Button'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { Process } from '@/features/home/Process'
import { useDocumentTitle } from '@/lib/hooks'

const PRINCIPLES = [
  ['Made to order', 'We do not warehouse thousands of units. Each order is made when it is placed, which keeps waste low and lets us keep refining a design.'],
  ['Honest surfaces', 'The fine layer lines stay. They are the record of how a piece was built, and they catch light in a way a moulded surface cannot.'],
  ['Built to last', 'Pieces that meet heat or water are made in PETG and sealed where needed. Anything damaged in transit is remade at no cost.'],
] as const

export default function AboutPage() {
  useDocumentTitle('About us')

  return (
    <>
      <AboutSheet />

      <Container className="grid gap-12 py-28 sm:py-40 lg:grid-cols-12">
        <p className="text-[14px] text-fog lg:col-span-3 lg:pt-3">Why we exist</p>
        <div className="lg:col-span-8">
          <SplitReveal as="p" className="font-display text-[clamp(1.9rem,3.6vw,3.6rem)] leading-[1.08] text-ink">
            Most homes are full of things nobody really looks at. We wanted to make the opposite: pieces with enough presence
            that people stop, look closer and ask where they came from.
          </SplitReveal>
          <Reveal className="mt-14 grid gap-8 text-[17px] leading-relaxed text-smoke sm:grid-cols-2">
            <p>Everything we sell is designed in-house and produced on our own machines. Working this way means a new idea can go from sketch to finished prototype in days, and that we can adjust a design between batches when we learn something.</p>
            <p>It also means we never sit on stock. When you order, your piece is made for you, finished by hand, inspected and packed in recycled paper pulp. That takes a little longer than a warehouse, and we think it is worth it.</p>
          </Reveal>
        </div>
      </Container>

      <div id="process"><Process /></div>

      <Container className="py-28 sm:py-40">
        <h2 className="mb-12 font-display text-[clamp(2.4rem,4vw,4rem)] leading-[1] text-ink">What we hold to</h2>
        <Reveal stagger={0.1} className="grid border-t border-rule md:grid-cols-3">
          {PRINCIPLES.map(([title, body]) => (
            <div key={title} className="border-b border-rule py-10 md:border-b-0 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0">
              <h3 className="font-display text-[2.1rem] leading-tight text-ink">{title}</h3>
              <p className="mt-4 max-w-sm leading-relaxed text-smoke">{body}</p>
            </div>
          ))}
        </Reveal>
        <div className="mt-20 flex flex-wrap items-center gap-8">
          <Magnetic><ButtonLink to="/shop" size="lg">Shop the collection</ButtonLink></Magnetic>
          <ArrowLink to="/customise">Customise a piece</ArrowLink>
        </div>
      </Container>
    </>
  )
}
