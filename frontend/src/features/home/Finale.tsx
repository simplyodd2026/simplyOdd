import { Link } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { ButtonLink } from '@/components/ui/Button'
import { SplitReveal, Reveal } from '@/components/motion/Reveal'

/**
 * The last word. A closing line set very large, with the studio's signature written across it, and then
 * the open door: a terracotta shape, rounded on one side like a pebble cut in half, inviting you to customise a piece.
 */
export function Finale() {
  return (
    <section className="overflow-hidden pb-24 pt-20 sm:pb-32 sm:pt-28">
      <Container>
        <div className="relative mx-auto max-w-[1300px] text-center">
          <SplitReveal as="h2" className="font-display text-[clamp(3.2rem,9vw,10rem)] leading-[0.92] text-ink">
            Small objects,<br /><span className="font-odd">big personality.</span>
          </SplitReveal>
          <p aria-hidden className="font-script pointer-events-none absolute whitespace-nowrap bottom-[-0.35em] right-[6%] -rotate-6 text-[clamp(3.25rem,6.8vw,7.25rem)] text-accent">
            simply odd
          </p>
        </div>

        <Reveal y={40} className="mx-auto mt-24 max-w-[1300px] sm:mt-32">
          <div className="grid overflow-hidden rounded-[2.5rem] bg-hot text-paper sm:rounded-l-[2.5rem] sm:rounded-r-full md:grid-cols-[1.2fr_1fr]">
            <div className="p-8 sm:p-12 lg:p-16">
              <p className="text-[14px] text-paper/80">Customise</p>
              <h3 className="mt-3 font-display text-[clamp(2.2rem,3.8vw,3.6rem)] leading-[1.02]">Have an odd idea? We’ll build it.</h3>
              <p className="mt-5 max-w-md text-[16px] leading-[1.65] text-paper/85">
                Send a sketch, a photo or a few words. We’ll model it, build a one-off and finish it by hand.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
                <ButtonLink to="/customise" variant="light" size="lg">Customise a piece</ButtonLink>
                <Link to="/shop?max=999&sort=price_asc" className="link-draw text-[15px] font-medium">Or find a gift under ₹999</Link>
              </div>
            </div>
            <div aria-hidden className="relative hidden md:block">
              <span className="pebble absolute left-[8%] top-[14%] aspect-square w-[62%] bg-clay/70" />
              <span className="plate absolute bottom-[12%] right-[18%] aspect-square w-[34%] bg-tan/80" />
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
