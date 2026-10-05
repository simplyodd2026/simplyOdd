import { Container } from '@/components/layout/Container'
import { ButtonLink } from '@/components/ui/Button'
import { Reveal, SplitReveal } from '@/components/motion/Reveal'
import { useHomePieces } from './pieces'

/**
 * The studio. A photograph in a pebble-shaped frame, a sage pebble behind it, and a few plain sentences
 * about who makes these things and how. Uses a photo the page hasn't shown yet, where there is one.
 */
export function Brand() {
  const { room, hero } = useHomePieces()
  const unused = room?.product.images[2] ?? room?.product.images[1] ?? hero?.images[0]

  return (
    <Container className="py-28 sm:py-36">
      <div className="mx-auto grid max-w-[1300px] items-center gap-16 lg:grid-cols-12 lg:gap-10">
        <Reveal y={50} className="relative mx-auto w-full max-w-[30rem] lg:col-span-5">
          <span aria-hidden className="pebble absolute -right-[4%] -top-[8%] -z-10 aspect-square w-[70%] bg-sage/60 sm:-right-[10%]" />
          <div className="pebble-3 aspect-[1/1.05] overflow-hidden bg-ash">
            {unused && <img src={unused.url} alt={unused.alt || 'A piece from the studio'} loading="lazy" decoding="async" className="size-full object-cover" />}
          </div>
        </Reveal>
        <div className="lg:col-span-6 lg:col-start-7">
          <SplitReveal as="h2" className="font-display text-[clamp(2.4rem,4.4vw,4.4rem)] leading-[1.02] text-ink text-balance">
            A small studio for odd, beautiful things.
          </SplitReveal>
          <div className="mt-8 max-w-[30rem] space-y-5 text-[16.5px] leading-[1.75] text-graphite">
            <p>Simply Odd designs every object in-house and makes it only once someone orders it, so nothing is made to sit on a shelf in a warehouse.</p>
            <p>We work in plant-based PLA and heat-resistant PETG, finish each piece by hand, and pack it in paper pulp, not plastic.</p>
          </div>
          <ButtonLink to="/about" variant="olive" size="lg" className="mt-10">Read our story</ButtonLink>
        </div>
      </div>
    </Container>
  )
}
