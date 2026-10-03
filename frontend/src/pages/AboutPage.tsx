import { Link } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { PageHeader } from '@/components/layout/PageHeader'
import { PrintImage, Reveal, SplitReveal } from '@/components/motion/Reveal'
import { Magnetic } from '@/components/motion/Magnetic'
import { ButtonLink } from '@/components/ui/Button'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { Process } from '@/features/home/Process'
import { useProducts } from '@/lib/queries'
import { useDocumentTitle } from '@/lib/hooks'

const PRINCIPLES = [
  ['Made to order', 'We do not warehouse thousands of units. Each order is printed when it is placed, which keeps waste low and lets us keep refining a design.'],
  ['Honest surfaces', 'The fine layer lines stay. They are the record of how a piece was built, and they catch light in a way a moulded surface cannot.'],
  ['Built to last', 'Pieces that meet heat or water are printed in PETG and sealed where needed. Anything damaged in transit is remade at no cost.'],
] as const

export default function AboutPage() {
  useDocumentTitle('Studio')
  const { data } = useProducts({ flag: 'featured', sort: 'popular', page_size: 3 })
  const images = (data?.items ?? []).map((p) => p.images[1]?.url ?? p.images[0]?.url)

  return (
    <>
      <PageHeader trail={<><Link to="/" className="link-draw hover:text-ink">Home</Link><span>/</span><span className="text-ink">Studio</span></>}
        title={<>A small studio for objects that <span className="font-odd">earn</span> their place.</>} />

      <Container className="grid gap-3 sm:grid-cols-12">
        <PrintImage src={images[0]} alt="" parallax className="aspect-[4/5] sm:col-span-5" />
        <PrintImage src={images[1]} alt="" parallax delay={0.1} className="aspect-[4/5] sm:col-span-4 sm:mt-32" />
        <PrintImage src={images[2]} alt="" parallax delay={0.2} className="hidden aspect-[3/4] sm:col-span-3 sm:block" />
      </Container>

      <Container className="grid gap-12 py-28 sm:py-40 lg:grid-cols-12">
        <p className="label text-fog lg:col-span-3"><span className="text-ink">(01)</span>&nbsp;&nbsp;Why we exist</p>
        <div className="lg:col-span-8">
          <SplitReveal as="p" className="font-display text-[clamp(1.9rem,3.6vw,3.6rem)] leading-[1.08] text-ink">
            Most homes are full of things nobody really looks at. We wanted to make the opposite: pieces with enough presence
            that people stop, look closer and ask where they came from.
          </SplitReveal>
          <Reveal className="mt-14 grid gap-8 text-[17px] leading-relaxed text-smoke sm:grid-cols-2">
            <p>Everything we sell is designed in-house and produced on our own printers. Working this way means a new idea can go from sketch to finished prototype in days, and that we can adjust a design between batches when we learn something.</p>
            <p>It also means we never sit on stock. When you order, your piece is printed for you, finished by hand, inspected and packed in recycled paper pulp. That takes a little longer than a warehouse, and we think it is worth it.</p>
          </Reveal>
        </div>
      </Container>

      <Process />

      <Container className="py-28 sm:py-40">
        <p className="label mb-10 text-fog"><span className="text-ink">(04)</span>&nbsp;&nbsp;What we hold to</p>
        <Reveal stagger={0.1} className="grid border-t border-rule md:grid-cols-3">
          {PRINCIPLES.map(([title, body], i) => (
            <div key={title} className="border-b border-rule py-10 md:border-b-0 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0">
              <span className="font-mono text-[11px] text-fog">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-6 font-display text-4xl text-ink">{title}</h3>
              <p className="mt-4 max-w-sm leading-relaxed text-smoke">{body}</p>
            </div>
          ))}
        </Reveal>
        <div className="mt-20 flex flex-wrap items-center gap-8">
          <Magnetic><ButtonLink to="/shop" size="lg">Shop the collection</ButtonLink></Magnetic>
          <ArrowLink to="/custom">Commission a piece</ArrowLink>
        </div>
      </Container>
    </>
  )
}
