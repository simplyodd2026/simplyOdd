import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { useCategories } from '@/lib/queries'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { reducedMotion } from '@/lib/motion'
import { PrintedMark } from './PrintedMark'

const OUT = [0.16, 1, 0.3, 1] as const
const LAYERS = 10
// The script words: the logo's orange, with the second line in ink.
const ODD = '#F2642A'

/**
 * The print room. A full-width panel in a shell-to-clay wash, with the name set huge across it, and in the
 * middle the Simply Odd mark being built, layer by layer, from nothing (see PrintedMark), as large as the
 * screen's height allows. Once the last layer is down, "Oddly beautiful" is written over its edges by hand.
 * Along the foot: what the studio makes and the way in, the shop's categories, and a floating card for
 * commissioning a one-off piece.
 */
export function Hero() {
  // Only categories with something in them, so no link from the first screen leads to an empty page.
  const categories = (useCategories().data ?? []).filter((c) => c.product_count > 0)
  const [layer, setLayer] = useState(0)
  const printed = layer >= LAYERS

  return (
    // Full width, and runs up behind the floating header so the panel starts at the very top of the page. The
    // panel's rounded foot sits on the next section's stone, so the two read as separate pieces of the page.
    <section aria-label="Simply Odd" className="-mt-[66px] bg-stone lg:-mt-[78px]">
      <div className="relative isolate flex min-h-[100svh] flex-col overflow-hidden rounded-b-[2rem] text-ink shadow-[0_30px_60px_-36px_rgb(66_44_28/0.45)] lg:h-[100svh] lg:min-h-[44rem] lg:rounded-b-[3rem]">
        {/* A shell-to-clay wash, lighter than the rest of the page, with warm light pooled behind the piece. */}
        <div aria-hidden className="absolute inset-0 -z-10" style={{
          background: [
            'radial-gradient(ellipse 34% 42% at 50% 52%, rgb(255 216 170 / 0.75), transparent 70%)',
            'radial-gradient(ellipse 45% 50% at 100% 100%, rgb(201 135 116 / 0.28), transparent 70%)',
            'linear-gradient(180deg, #FBF5EF 0%, #F8EAE0 55%, #F2DBCD 100%)',
          ].join(','),
        }} />
        <div aria-hidden className="linen absolute inset-0 -z-10 opacity-40" />

        {/* The stage: the name across the back wall, and the mark, as large as the height allows, printing in
            front of it with the words written over its edges. */}
        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-5 pt-28 lg:pb-20 lg:pt-32">
          <motion.p aria-hidden initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.6, ease: OUT, delay: 0.1 }}
            className="pointer-events-none absolute inset-x-0 top-[17%] select-none text-center font-sans text-[clamp(5rem,20vw,21rem)] leading-[0.8] tracking-[-0.055em] lg:top-[19%]"
            style={{ backgroundImage: 'linear-gradient(to bottom, rgb(42 31 23 / 0.1), rgb(42 31 23 / 0.015) 85%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            <span className="font-medium">simply</span><span className="font-extrabold">odd</span>
          </motion.p>

          <div className="relative z-10 aspect-[190/230] h-[clamp(20rem,52svh,28rem)] lg:h-full lg:max-h-[min(48rem,calc((100vw-42rem)*1.21))] xl:max-h-[min(48rem,calc((100vw-58rem)*1.21))]">
            <PrintedMark onLayer={setLayer} className="block size-full cursor-pointer rounded-3xl focus-visible:outline-offset-8" />

            {/* Written over the piece's edges by hand once it's printed. */}
            <div aria-hidden className="pointer-events-none absolute left-0 top-[28%] z-20 lg:left-auto lg:right-[calc(100%-3.5rem)] lg:top-[30%] lg:text-right">
              <Scribble show={printed} delay={0.05} className="text-[clamp(2.6rem,7vw,7.5rem)]" color={ODD}>Oddly</Scribble>
              <Scribble show={printed} delay={0.55} className="-mt-1 text-[clamp(1.5rem,2.6vw,2.7rem)] text-ink lg:mr-6">build for you.</Scribble>
            </div>
            <div aria-hidden className="pointer-events-none absolute right-0 top-[62%] z-20 lg:left-[calc(100%-3.5rem)] lg:right-auto lg:top-[48%]">
              <Scribble show={printed} delay={0.3} className="text-[clamp(2.6rem,7vw,7.5rem)]" color={ODD}>beautiful</Scribble>
            </div>
          </div>
        </div>

        {/* The foot of the panel, on one line: the studio and the way in, the shop's categories, a one-off piece.
            On wide screens it lies over the stage, the words and the card beside the narrow base of the piece. */}
        <div className="pointer-events-none relative z-30 mx-auto grid w-full max-w-[1520px] gap-8 px-5 pb-10 pt-8 sm:px-10 lg:absolute lg:inset-x-0 lg:bottom-0 lg:grid-cols-[1fr_auto_1fr] lg:items-end lg:gap-10 lg:pt-0 [&>*]:pointer-events-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: OUT, delay: 0.5 }}
            className="max-w-[24rem] max-lg:order-2 lg:max-w-[18rem] xl:max-w-[24rem]">
            <h1 className="text-[15px] font-semibold uppercase tracking-[0.12em] text-ink">Objects for oddly beautiful spaces</h1>
            <p className="mt-3 text-[15px] leading-[1.65] text-ink/65">
              Lamps, vessels and small sculptures from a small design studio in India, made to order layer by
              layer, then finished by hand.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <ButtonLink to="/shop" variant="terra" size="md">Explore the objects</ButtonLink>
              <Link to="/about#process" className="link-draw text-[14px] font-medium text-ink">See how they’re made</Link>
            </div>
          </motion.div>

          {/* Under the piece, what the shop makes: its categories, each a way in. */}
          {categories.length > 0 ? (
            <motion.nav aria-label="Shop by category" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: OUT, delay: 0.4 }}
              className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[clamp(0.8125rem,1vw,0.9375rem)] font-medium uppercase tracking-[0.14em] text-ink/70 max-lg:order-1 lg:pb-3">
              {categories.map((c, i) => (
                <Fragment key={c.id}>
                  {i > 0 && <span aria-hidden className="text-accent">·</span>}
                  <Link to={`/collections/${c.slug}`} className="link-draw transition-colors hover:text-ink">{c.name}</Link>
                </Fragment>
              ))}
            </motion.nav>
          ) : <span aria-hidden />}

          {/* Floating: the way into a one-off piece. */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: OUT, delay: 0.7 }}
            className="max-lg:order-3 lg:justify-self-end">
            <motion.div animate={reducedMotion() ? undefined : { y: [0, -8, 0] }} transition={{ duration: 5, ease: 'easeInOut', repeat: Infinity }}>
              <Link to="/customise"
                className="group flex w-full max-w-[18rem] flex-col gap-2.5 rounded-2xl border border-ink/10 bg-paper-2/80 p-4 shadow-[0_28px_50px_-28px_rgb(66_44_28/0.5)] backdrop-blur-md transition-colors duration-500 hover:bg-paper-2">
                <span className="flex items-center gap-2 text-[14px] font-semibold uppercase tracking-[0.12em] text-ink">
                  <Icon name="layers" size={16} className="text-accent" /> Customise
                </span>
                <span className="font-odd text-[1.3rem] leading-tight text-ink">Have an odd idea? Send a sketch, we’ll build it.</span>
                <span className="mt-1 flex items-center justify-between text-[13.5px] font-medium text-ink">
                  Start your piece
                  <span className="grid size-8 place-items-center rounded-full border border-ink/25 transition-colors duration-500 group-hover:border-ink group-hover:bg-ink group-hover:text-paper">
                    <Icon name="arrowUpRight" size={14} />
                  </span>
                </span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/** A line in the handwritten script, drawn on from left to right as if by pen. */
function Scribble({ show, delay, className, color, children }: {
  show: boolean; delay: number; className?: string; color?: string; children: string
}) {
  return (
    <motion.p className={cn('font-script whitespace-nowrap leading-[1.1] [text-shadow:0_2px_20px_rgb(243_237_228/0.9)]', className)} style={{ color }}
      initial={false}
      animate={show ? { clipPath: 'inset(-20% -5% -20% -5%)', opacity: 1 } : { clipPath: 'inset(-20% 105% -20% -5%)', opacity: 0 }}
      transition={show ? { duration: 0.9, ease: [0.65, 0, 0.35, 1], delay } : { duration: 0.3 }}>
      {children}
    </motion.p>
  )
}
