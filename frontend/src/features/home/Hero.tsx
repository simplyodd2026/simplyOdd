import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useProducts } from '@/lib/queries'
import { money } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Container } from '@/components/layout/Container'
import { ButtonLink } from '@/components/ui/Button'
import { SplitReveal, Reveal } from '@/components/motion/Reveal'
import { usePieceTone } from './usePieceTone'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * The shop as a gallery room: one piece on show at a time, with its wall label beside it.
 * The tan band along the bottom is the exhibit switcher, so the hero is something you browse, not a banner.
 * The light on the wall takes the colour of whichever piece is on show, and the whole stage fits one screen
 * on desktop, so the price and button are visible without scrolling.
 */
export function Hero() {
  const { data } = useProducts({ flag: 'featured', sort: 'popular', page_size: 4 })
  const pieces = data?.items ?? []
  const [n, setN] = useState(0)
  const piece = pieces[n] ?? pieces[0]
  const tone = usePieceTone(piece?.images[0]?.url)
  const dims = piece ? [piece.dimensions.width_cm, piece.dimensions.height_cm, piece.dimensions.depth_cm] : []

  return (
    <Container className="pt-3 sm:pt-5">
      <section className="relative isolate mx-auto max-w-[1440px] overflow-hidden rounded-[20px] bg-paper-2 ring-1 ring-ink/5 sm:rounded-[28px] lg:h-[calc(100dvh-160px)] lg:max-h-[820px] lg:min-h-[500px]">
        {/* Light on the wall behind the piece, tinted by the piece itself. */}
        <div aria-hidden style={{ backgroundColor: tone }}
          className="pointer-events-none absolute left-1/2 top-[8%] -z-10 h-[78%] w-[62%] -translate-x-[38%] rounded-full opacity-90 blur-[110px] transition-[background-color] duration-[1400ms] ease-out max-lg:left-0 max-lg:w-full max-lg:translate-x-0" />

        <div className="grid gap-10 px-5 pt-10 sm:px-10 lg:h-full lg:grid-cols-12 lg:items-center lg:gap-6 lg:px-14 lg:pb-24 lg:pt-6">
          <div className="lg:col-span-4">
            <SplitReveal as="h1" on="load" delay={0.1} className="font-display text-[clamp(3rem,min(4.9vw,9.5dvh),5.5rem)] leading-[1.02] text-ink">
              Odd shapes. Quiet rooms.
            </SplitReveal>
            <Reveal delay={0.35} y={18} className="mt-6 max-w-[22rem]">
              <p className="text-[17px] leading-[1.6] text-graphite text-pretty">
                Vases, lamps and small sculptures, designed in our studio and printed to order from plant-based materials, then finished by hand.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-5">
                <ButtonLink to="/shop" size="lg">Shop the collection</ButtonLink>
                <Link to="/new" className="link-draw text-[15px] font-medium text-ink">See what's new</Link>
              </div>
            </Reveal>
          </div>

          <div className="relative flex min-h-[340px] items-center justify-center lg:col-span-4 lg:min-h-0">
            <AnimatePresence mode="popLayout" initial={false}>
              {piece ? (
                <motion.div key={piece.id} className="w-full max-w-[28rem]"
                  initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.98 }}
                  transition={{ duration: 0.9, ease: EASE }}>
                  <Link to={`/product/${piece.slug}`} aria-label={`View ${piece.name}`} className="block">
                    <img src={piece.images[0]?.url} alt={piece.images[0]?.alt || piece.name} draggable={false}
                      className="mx-auto block h-auto max-h-[min(calc(100dvh-330px),540px)] w-auto max-w-full object-contain" />
                  </Link>
                </motion.div>
              ) : <div className="aspect-[4/5] w-full max-w-[28rem] animate-pulse rounded-full bg-ink/[0.04]" />}
            </AnimatePresence>
          </div>

          {/* The wall label for whichever piece is on show. */}
          <div className="lg:col-span-3 lg:col-start-10 lg:pt-6" aria-live="polite">
            {piece && (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={piece.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.5, ease: EASE }}>
                  <p className="text-[13px] text-fog">On show</p>
                  <p className="mt-1 font-display text-[clamp(2rem,2.6vw,2.75rem)] leading-none text-ink">{piece.name}</p>
                  {piece.tagline && <p className="mt-3 text-[15px] text-smoke">{piece.tagline}</p>}
                  <dl className="mt-6 border-b border-ink/70">
                    <div className="border-t border-ink/70 py-4">
                      <dt className="text-[12px] font-medium text-fog">Material</dt>
                      <dd className="mt-1 line-clamp-2 text-[15px] text-ink">{piece.materials[0] ?? 'Plant-based PLA'}</dd>
                    </div>
                    {dims.every(Boolean) && (
                      <div className="border-t border-ink/70 py-4">
                        <dt className="text-[12px] font-medium text-fog">Dimension</dt>
                        <dd className="mt-1 text-[15px] tabular-nums text-ink">{dims.join(' × ')} cm</dd>
                      </div>
                    )}
                  </dl>
                  <Link to={`/product/${piece.slug}`} className="mt-5 inline-block text-[15px] font-medium text-ink"><span className="link-draw">View this piece</span></Link>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* The tan band: price of the piece on show, and the other pieces you can put on the plinth. */}
        <div className="relative mt-10 flex flex-wrap items-center gap-x-6 gap-y-4 bg-tan px-5 py-4 sm:px-10 lg:absolute lg:bottom-0 lg:right-0 lg:mt-0 lg:w-[62%] lg:flex-nowrap lg:py-3 lg:pl-10 lg:pr-5">
          <p className="mr-auto font-display text-[clamp(2.5rem,3.6vw,3.5rem)] font-light leading-none tabular-nums text-ink">
            {piece ? money(piece.price) : ' '}
          </p>
          <div className="flex items-center gap-2" role="tablist" aria-label="Featured pieces">
            {pieces.map((p, i) => (
              <button key={p.id} type="button" role="tab" aria-selected={i === n} aria-label={`Show ${p.name}`} onClick={() => setN(i)}
                className={cn('size-14 overflow-hidden rounded-full border-2 bg-paper-2 transition-[border-color,transform] duration-500 ease-[var(--ease-out-quint)] hover:-translate-y-0.5',
                  i === n ? 'border-ink' : 'border-transparent')}>
                <img src={p.images[0]?.url} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
          {piece && <ButtonLink to={`/product/${piece.slug}`} size="lg" className="h-14 w-full px-10 sm:w-auto">Shop this piece</ButtonLink>}
        </div>
      </section>
    </Container>
  )
}
