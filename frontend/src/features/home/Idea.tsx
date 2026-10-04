import { Container } from '@/components/layout/Container'
import { SplitReveal, Reveal } from '@/components/motion/Reveal'

/**
 * The idea. A quiet page in the middle of the story: one statement, a few lines of plain explanation and
 * the studio's hand-written sign-off. Nothing else, so the sentence has the room to itself.
 */
export function Idea() {
  return (
    <Container className="py-32 sm:py-44">
      <div className="mx-auto grid max-w-[1300px] gap-12 lg:grid-cols-12">
        <p className="text-[14px] text-fog lg:col-span-2 lg:pt-4">Why we make them</p>
        <div className="lg:col-span-9">
          <SplitReveal as="h2" className="font-display text-[clamp(2.2rem,4.4vw,4.4rem)] leading-[1.08] text-ink text-balance">
            Every home has a corner that feels a little unfinished. We make the odd, small thing that finishes it.
          </SplitReveal>
          <Reveal y={20} className="mt-14 grid gap-10 sm:grid-cols-2 lg:mt-20">
            <p className="max-w-[26rem] text-[16px] leading-[1.75] text-smoke text-pretty">
              Each design starts as a sketch and a question: what would make this shelf, this desk, this bedside a bit more yours?
              We model it, print it, live with it, and only keep the ones that earn their place.
            </p>
            <div className="flex flex-col justify-end sm:items-end">
              <p className="font-script -rotate-3 whitespace-nowrap text-[clamp(3.25rem,5vw,4.6rem)] text-accent">with care, the studio</p>
            </div>
          </Reveal>
        </div>
      </div>
    </Container>
  )
}
