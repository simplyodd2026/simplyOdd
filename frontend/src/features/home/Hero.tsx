import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, animate, motion, useMotionValue } from 'motion/react'
import { useProduct, useProducts } from '@/lib/queries'
import { useUi } from '@/stores/ui'
import { money } from '@/lib/format'
import { cn } from '@/lib/cn'
import { reducedMotion } from '@/lib/motion'
import { ButtonLink } from '@/components/ui/Button'

const OUT = [0.16, 1, 0.3, 1] as const
// The lamp on show: its first photograph is the room lit, its second the same room with the lamp off.
const LAMP = 'ignis'
// How far the bead can be pulled, and how far counts as a pull.
const MAX_PULL = 100
const TRIGGER = 40
// If nobody pulls the cord, the lamp switches itself on after this long.
const AUTO_ON_MS = 7000

/**
 * The lamp room. The first screen is a dark room with one framed photograph of Ignis in the middle, shown
 * whole at its own proportions, and the lamp's name set huge across the wall behind it. A cord hangs from
 * the top of the screen beside the frame. Pull it (drag, tap, click or press Enter) and the lamp switches
 * on: the lit photograph fades in over the dark one and warm light spreads across the whole room. Pull
 * again to switch it off. If nobody pulls, it comes on by itself; with reduced motion it starts lit.
 * Until Ignis is published, the featured piece stands in, its dark state made by dimming the photograph.
 */
export function Hero() {
  const lamp = useProduct(LAMP)
  const fallback = useProducts({ flag: 'featured', sort: 'popular', page_size: 1 }, lamp.isError)
  const piece = lamp.data?.product ?? (lamp.isError ? fallback.data?.items[0] : undefined)
  const lit = piece?.images[0]
  const dark = lamp.data ? piece?.images[1] : undefined
  const setHeroDark = useUi((s) => s.setHeroDark)

  const [on, setOn] = useState(() => reducedMotion())
  const [touched, setTouched] = useState(false)
  const y = useMotionValue(0)
  const dragged = useRef(false)

  // Light text on the header while the room is dark; the normal header once the lamp has lit it.
  useEffect(() => { setHeroDark(!on) }, [on, setHeroDark])
  useEffect(() => () => setHeroDark(false), [setHeroDark])

  const pull = () => { setTouched(true); setOn((v) => !v) }
  const tug = () => {
    animate(y, [0, 70, 0], { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] })
    pull()
  }
  useEffect(() => {
    if (on || touched) return
    const t = window.setTimeout(() => setOn(true), AUTO_ON_MS)
    return () => window.clearTimeout(t)
  }, [on, touched])

  // Each photograph's own proportions (width ÷ height), read once it has loaded.
  const [ratio, setRatio] = useState<{ lit?: number; dark?: number }>({})
  // Measured off-screen, so a photograph already in the browser's cache is measured too.
  useEffect(() => {
    const measure = (key: 'lit' | 'dark', url?: string) => {
      if (!url) return
      const img = new Image()
      img.onload = () => setRatio((r) => ({ ...r, [key]: img.naturalWidth / img.naturalHeight }))
      img.src = url
    }
    measure('lit', lit?.url)
    measure('dark', dark?.url)
  }, [lit?.url, dark?.url])
  // The largest the frame may be: wide and fairly tall on desktop, the screen's width on phones.
  const [space, setSpace] = useState({ w: 640, h: 560 })
  useEffect(() => {
    const fit = () => {
      const vw = window.innerWidth, vh = window.innerHeight
      setSpace(vw >= 1024
        ? { w: Math.min(vw * 0.46, 832), h: Math.min(vh * 0.64, 720) }
        : { w: Math.min(vw - 40, vw >= 640 ? 704 : vw), h: Math.min(vh * 0.6, 680) })
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  const shown = (on ? ratio.lit : ratio.dark ?? ratio.lit) ?? ratio.lit ?? ratio.dark ?? 0.8
  const box = shown > space.w / space.h
    ? { width: space.w, height: space.w / shown }
    : { width: space.h * shown, height: space.h }

  const name = piece?.name ?? 'Odd'
  const fade = 'transition-[opacity,filter] duration-[1400ms] ease-[var(--ease-out-quint)]'

  return (
    // Runs up behind the floating header, so the room starts at the very top of the page.
    <section aria-label="Simply Odd" className={cn('relative isolate -mt-[66px] flex min-h-[100svh] flex-col overflow-hidden bg-[#1C1510] pb-10 pt-28 lg:-mt-[78px] lg:pb-14 lg:pt-32', !on && 'over-photo')}>
      {/* Dusk: a faint warm glow from the unlit lamp in the middle of the dark room. */}
      <div aria-hidden className="absolute inset-0 -z-30" style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 48%, #3B2A1E 0%, #1C1510 70%)' }} />
      {/* Lit: the room fills with the shop's own ivory and linen, warmest around the lamp. */}
      <div aria-hidden className={cn('absolute inset-0 -z-20 transition-opacity duration-[1600ms] ease-[var(--ease-out-quint)]', on ? 'opacity-100' : 'opacity-0')}
        style={{ background: 'radial-gradient(ellipse 55% 60% at 50% 48%, #F6DEB4 0%, #F3E7D6 38%, #F3EDE4 62%, #E8DCCB 100%)' }} />
      <div aria-hidden className="linen absolute inset-0 -z-10 opacity-60" />

      {/* The lamp's name, set huge across the wall. An outline in the dark; warm once it's lit. */}
      <p aria-hidden className={cn('pointer-events-none absolute inset-x-0 top-1/2 -z-10 hidden -translate-y-1/2 select-none lg:block text-center font-odd text-[clamp(9rem,30vw,32rem)] leading-none transition-[color,-webkit-text-stroke-color] duration-[1600ms]',
        on ? 'text-clay/[0.16]' : 'text-transparent [-webkit-text-stroke:1px_rgb(249_246_241/0.12)]')}>
        {name}
      </p>

      <div className="mx-auto flex w-full max-w-[1520px] flex-1 flex-col items-center gap-12 px-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:px-10">
        {/* The words, low on the left. */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: OUT, delay: 0.2 }}
          className="order-2 w-full max-w-[30rem] lg:order-1 lg:min-w-[23rem] lg:flex-1 lg:pb-4">
          <p className="text-[14px] text-ink/60">A small 3D-printing studio in India</p>
          <h1 className="mt-4 font-display text-[clamp(2.6rem,3.4vw,4.3rem)] leading-[0.98] text-ink">
            Objects for<br /><span className="whitespace-nowrap font-odd">oddly beautiful</span><br />spaces.
          </h1>
          <p className="mt-6 text-[16.5px] leading-[1.65] text-ink/70">
            Lamps, vessels and small sculptures, designed in our studio and printed to order, then finished by hand.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
            <ButtonLink to="/shop" variant="terra" size="lg">Explore the objects</ButtonLink>
            <Link to="/about#process" className="link-draw text-[15px] font-medium text-ink">See how they’re made</Link>
          </div>
        </motion.div>

        {/* The framed photograph, shown whole: the dark room underneath, the lit room fading in on top. */}
        <motion.figure initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 1.3, ease: OUT }}
          className="relative order-1 self-center lg:order-2 lg:self-center">
          <span aria-hidden className={cn('absolute left-1/2 top-1/2 -z-10 aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F2B866] blur-[120px] transition-opacity duration-[1600ms]', on ? 'opacity-30' : 'opacity-0')} />
          <div className={cn('relative rounded-[1.25rem] p-2.5 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.75)] transition-colors duration-[1400ms] sm:p-3', on ? 'bg-paper-2 shadow-[0_40px_70px_-34px_rgb(66_44_28/0.55)]' : 'bg-[#3A2E25]')}>
            {/* The frame takes the shape of whichever photograph is showing, and reshapes smoothly between them,
                so each fills it completely and neither is cropped. */}
            <div className="relative overflow-hidden rounded-[0.75rem] bg-[#0f0b08] transition-[width,height] duration-[1100ms] ease-[var(--ease-out-quint)]"
              style={{ width: box.width, height: box.height }}>
              {lit ? (
                <>
                  <img src={(dark ?? lit).url} alt="" aria-hidden draggable={false}
                    className={cn('absolute inset-0 size-full object-cover', fade, on ? 'opacity-0' : 'opacity-100', !dark && 'brightness-[0.22] saturate-50')} />
                  <img src={lit.url} alt={lit.alt || piece?.name || ''} draggable={false} fetchPriority="high"
                    className={cn('absolute inset-0 size-full object-cover', fade, on ? 'opacity-100' : 'opacity-0')} />
                </>
              ) : <div className="size-full animate-pulse" />}
            </div>
          </div>

          {/* The cord: from above the top of the screen down to a brass bead beside the frame. */}
          <div className="absolute right-4 top-[14%] z-20 lg:-right-14 lg:top-[20%]">
            <div className={cn(!touched && !on && 'animate-sway')}>
              <motion.span aria-hidden style={{ y }} className={cn('absolute bottom-0 left-1/2 block h-[150svh] w-px -translate-x-1/2 transition-colors duration-1000', on ? 'bg-ink/40' : 'bg-ink/35')} />
              <motion.button type="button" aria-pressed={on}
                aria-label={on ? `Pull the cord to switch ${name} off` : `Pull the cord to switch ${name} on`}
                drag="y" dragConstraints={{ top: 0, bottom: MAX_PULL }} dragElastic={0.12} dragSnapToOrigin dragMomentum={false}
                onDragStart={() => { dragged.current = true }}
                onDragEnd={(_, info) => { if (info.offset.y > TRIGGER) pull() }}
                onClick={() => { if (dragged.current) { dragged.current = false; return } tug() }}
                style={{ y }}
                whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.95 }}
                className="relative -ml-3.5 block size-7 cursor-grab touch-none rounded-full shadow-[0_8px_14px_rgb(0_0_0/0.5)] active:cursor-grabbing">
                <span aria-hidden className="block size-full rounded-full" style={{ background: 'radial-gradient(circle at 35% 30%, #FFF1CF 0 12%, #D4A574 32%, #7A5A40 100%)' }} />
                <span aria-hidden className={cn('absolute -inset-3 -z-10 rounded-full bg-[#FFD99A]/40 blur-md transition-opacity duration-700', on ? 'opacity-0' : 'animate-pulse opacity-100')} />
              </motion.button>
            </div>
            <AnimatePresence>
              {!touched && (
                <motion.p aria-hidden initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 1, ease: OUT, delay: 1 }}
                  className="font-script pointer-events-none absolute right-6 top-9 whitespace-nowrap text-[2.1rem] leading-none text-accent lg:left-1 lg:right-auto lg:top-11">
                  pull the cord
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.figure>

        {/* The lamp on show, low on the right. */}
        {piece && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: OUT, delay: 0.4 }}
            className="order-3 w-full max-w-[30rem] lg:flex-1 lg:pb-4 lg:text-right">
            <p className="text-[13px] text-ink/55">{on ? 'Lit' : 'Unlit'}, on show</p>
            <p className="mt-1 font-odd text-[clamp(2rem,3vw,2.8rem)] leading-tight text-ink">{piece.name}</p>
            {piece.tagline && <p className="mt-1 text-[15px] text-ink/65">{piece.tagline}</p>}
            <p className="mt-4 flex items-baseline gap-4 text-[15px] text-ink/80 lg:justify-end">
              <span className="font-display text-[1.6rem] tabular-nums text-ink">{money(piece.price)}</span>
              <Link to={`/product/${piece.slug}`} className="link-draw font-medium text-ink">Shop {piece.name}</Link>
            </p>
          </motion.div>
        )}
      </div>
    </section>
  )
}
