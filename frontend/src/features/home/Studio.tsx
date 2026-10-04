import { useProducts } from '@/lib/queries'
import { Container } from '@/components/layout/Container'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { STEPS } from './Process'

/** How a piece gets made: the four steps in order, beside one object lit up in the dark. */
export function Studio() {
  const { data } = useProducts({ category: 'lighting', sort: 'popular', page_size: 1 })
  const lamp = data?.items[0]
  const shot = lamp?.images[1] ?? lamp?.images[0]

  return (
    <Container className="py-6">
      <section className="mx-auto grid max-w-[1440px] overflow-hidden rounded-[20px] bg-night text-paper sm:rounded-[28px] lg:grid-cols-2">
        <div className="relative min-h-[320px] bg-paper-2">
          {shot && <img src={shot.url} alt={shot.alt || lamp?.name || ''} loading="lazy" className="absolute inset-0 h-full w-full object-cover mix-blend-multiply" />}
        </div>
        <div className="flex flex-col justify-between gap-12 px-6 py-12 sm:px-12 sm:py-16 lg:px-16">
          <div>
            <h2 className="font-display text-[clamp(2.4rem,4.4vw,4.5rem)] leading-[0.95]">Made to order, one layer at a time</h2>
            <p className="mt-6 max-w-md text-[17px] leading-[1.6] text-paper/70">
              Nothing sits in a warehouse. When you order, we print your piece in our studio and finish it by hand before it ships.
            </p>
          </div>
          <ol className="grid gap-x-10 sm:grid-cols-2">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="border-t border-paper/20 py-5">
                <p className="flex items-baseline gap-3 font-display text-2xl leading-none">
                  <span className="text-[15px] tabular-nums text-paper/45">{i + 1}</span>{title}
                </p>
                <p className="mt-2 text-[14px] leading-relaxed text-paper/60">{body}</p>
              </li>
            ))}
          </ol>
          <ArrowLink to="/about" className="text-paper">About the studio</ArrowLink>
        </div>
      </section>
    </Container>
  )
}
