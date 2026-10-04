import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { money } from '@/lib/format'
import { useTilt } from '@/lib/useTilt'
import { Container } from '@/components/layout/Container'
import { ButtonLink } from '@/components/ui/Button'
import { SplitReveal } from '@/components/motion/Reveal'
import { useHomePieces } from './pieces'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * Intro. A magazine opening rather than a banner: the statement set large on the left with the studio's
 * signature written across it, and the featured piece standing in an arched niche on the right, its foot
 * stepping over the edge into the next chapter. A clay pebble drifts behind it, and the word "odd" is
 * pressed into the floor of the page, cropped by the section edge.
 */
export function Hero() {
  const { hero: piece } = useHomePieces()
  const tilt = useTilt<HTMLDivElement>(3)

  return (
    <section className="relative isolate z-10">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[clamp(7rem,19vw,19rem)] overflow-hidden">
        <span className="absolute -bottom-[0.32em] right-[-0.02em] select-none font-odd text-[clamp(14rem,34vw,34rem)] leading-none text-stone">odd</span>
      </div>

      <Container className="grid gap-12 pb-0 pt-10 sm:pt-16 lg:min-h-[min(calc(100dvh-120px),900px)] lg:grid-cols-12 lg:items-center lg:gap-8 lg:pt-6">
        <div className="relative lg:col-span-7 lg:pb-24">
          <p className="text-[14px] text-smoke">A small 3D-printing studio in India</p>
          <SplitReveal as="h1" on="load" delay={0.1} className="mt-5 font-display text-[clamp(3.2rem,7.2vw,8.25rem)] leading-[0.94] text-ink">
            Objects for<br /><span className="font-odd">oddly beautiful</span><br />spaces.
          </SplitReveal>
          {/* The signature, written across the end of the statement. */}
          <motion.p aria-hidden initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1.4, ease: EASE, delay: 0.9 }}
            className="font-script pointer-events-none absolute left-[46%] top-[clamp(8.75rem,18.5vw,20.5rem)] -rotate-6 whitespace-nowrap text-[clamp(3rem,7vw,7.75rem)] text-accent max-sm:left-auto max-sm:right-0 max-sm:top-[10.6rem]">
            simply odd
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: EASE, delay: 0.55 }}>
            <p className="mt-10 max-w-[26rem] text-[17px] lg:mt-14 leading-[1.65] text-graphite text-pretty">
              Lamps, vessels and small sculptures, designed in our studio and printed to order in plant-based materials, then finished by hand.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
              <ButtonLink to="/shop" variant="terra" size="lg">Explore the objects</ButtonLink>
              <Link to="/about#process" className="link-draw text-[15px] font-medium text-ink">See how they’re made</Link>
            </div>
          </motion.div>
        </div>

        <div className="relative mx-auto w-full max-w-[min(26rem,calc((100svh-9rem)*0.73))] lg:col-span-4 lg:col-start-9 lg:max-w-[calc((100svh-13rem)*0.73)]">
          <motion.span aria-hidden initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.6, ease: EASE, delay: 0.2 }}
            className="absolute -left-[22%] bottom-[2%] -z-10 aspect-square w-[78%] bg-clay/80 morph lg:-left-[34%]" />
          <motion.div initial={{ clipPath: 'inset(100% 0% 0% 0%)' }} animate={{ clipPath: 'inset(0% 0% 0% 0%)' }} transition={{ duration: 1.5, ease: EASE, delay: 0.3 }}
            className="relative z-10 lg:translate-y-[16%]">
            <div ref={tilt}>
              {piece ? (
                <Link to={`/product/${piece.slug}`} aria-label={`${piece.name}, ${money(piece.price)}`}
                  className="table-shadow arch block aspect-[3/4.1] overflow-hidden bg-ash">
                  <img src={piece.images[0]?.url} alt={piece.images[0]?.alt || piece.name} draggable={false} fetchPriority="high"
                    className="size-full object-cover" />
                </Link>
              ) : <div className="arch aspect-[3/4.1] animate-pulse bg-ash" />}
            </div>
          </motion.div>
          {piece && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1.1 }}
              className="relative z-10 mt-5 flex items-baseline justify-between gap-4 text-[14px] text-smoke lg:absolute lg:-left-[44%] lg:bottom-[-10%] lg:mt-0 lg:block lg:w-[40%]">
              <span className="block font-odd text-[1.35rem] leading-tight text-ink">{piece.name}</span>
              <span className="mt-1 block tabular-nums">{money(piece.price)}</span>
            </motion.p>
          )}
        </div>
      </Container>
    </section>
  )
}
