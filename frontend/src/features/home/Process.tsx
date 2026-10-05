import { useRef } from 'react'
import { gsap, useGSAP, MQ, EASE } from '@/lib/motion'
import { SplitReveal } from '@/components/motion/Reveal'
import { cn } from '@/lib/cn'

export const STEPS = [
  ['Digital model', 'Every piece starts as a sketch and a question. We model it in-house and prototype until the proportions feel resolved.'],
  ['First layer', 'The form is sliced into hundreds of layers, each 0.2 mm tall, and the first one is laid down on the bed.'],
  ['Building', 'Made to order in PLA or heat-resistant PETG, one layer on top of the last. A medium vessel takes most of a day.'],
  ['Finished object', 'Supports removed, edges refined, interiors sealed where needed, then inspected by hand and packed in paper pulp.'],
] as const

const LAYERS = 96
const W = 360
const H = 480
const LAYER_H = H / LAYERS
const HEAD = '#5E6647'   // olive print head
const LINE = '#A64F31'   // terracotta wireframe

/** A vessel profile: narrow foot, full belly, pinched neck, flared lip, with a slight lean. */
function layerAt(i: number) {
  const t = i / (LAYERS - 1)
  const belly = Math.sin(Math.PI * Math.min(1, t * 1.18)) * 0.62
  const neck = t > 0.78 ? -(t - 0.78) * 1.2 : 0
  const lip = t > 0.92 ? (t - 0.92) * 4.2 : 0
  const r = Math.max(0.12, 0.2 + belly + neck + lip) * (W * 0.42)
  const lean = Math.sin(t * Math.PI * 0.9) * 14
  return { x: W / 2 - r + lean, w: r * 2, y: H - (i + 1) * LAYER_H }
}

const LAYOUT = Array.from({ length: LAYERS }, (_, i) => layerAt(i))
// The digital model's silhouette: up the left edge, across the lip, down the right edge.
const OUTLINE = [
  ...LAYOUT.map((l) => `${l.x},${l.y + LAYER_H / 2}`),
  ...[...LAYOUT].reverse().map((l) => `${l.x + l.w},${l.y + LAYER_H / 2}`),
].join(' ')

/**
 * The vessel, drawn in SVG. `built` is how many layers are already printed; the wireframe shows while it's
 * unfinished. Animated by the Process section, or rendered still at a given stage elsewhere.
 */
export function Vessel({ built = LAYERS, className, animated }: { built?: number; className?: string; animated?: boolean }) {
  const done = built >= LAYERS
  return (
    <svg viewBox={`-10 -30 ${W + 20} ${H + 50}`} className={className} aria-hidden="true">
      <defs>
        <linearGradient id="pr-shade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#9C6A52" />
          <stop offset="0.35" stopColor="#E8C9B4" />
          <stop offset="0.62" stopColor="#C98774" />
          <stop offset="1" stopColor="#7D4E3B" />
        </linearGradient>
      </defs>
      <line x1="-10" x2={W + 10} y1={H + 4} y2={H + 4} stroke="rgb(42 31 23 / 0.35)" strokeWidth="1" />
      <g className="pr-wire" style={animated ? undefined : { opacity: done ? 0 : 1 }}>
        <polygon points={OUTLINE} fill="none" stroke={LINE} strokeWidth="1" strokeDasharray="4 4" pathLength={1000} className="pr-outline" />
        {LAYOUT.filter((_, i) => i % 12 === 6).map((l, i) => (
          <ellipse key={i} cx={l.x + l.w / 2} cy={l.y} rx={l.w / 2} ry={l.w * 0.06} fill="none" stroke={LINE} strokeWidth="0.6" opacity="0.55" />
        ))}
      </g>
      {LAYOUT.map((l, i) => (
        <rect key={i} className="pr-layer" x={l.x} y={l.y} width={l.w} height={LAYER_H * 0.8} rx={LAYER_H / 2} fill="url(#pr-shade)"
          style={animated ? undefined : { opacity: i < built ? 1 : 0 }} />
      ))}
      {(animated || !done) && (
        <g className="pr-head" transform={`translate(0 ${animated ? H - LAYER_H : (LAYOUT[Math.max(0, built - 1)]?.y ?? H)})`}
          style={animated ? undefined : { opacity: built > 0 ? 1 : 0 }}>
          <line x1="-10" x2={W + 10} y1="0" y2="0" stroke={HEAD} strokeWidth="1" strokeDasharray="3 5" />
          <rect x={W / 2 - 14} y="-26" width="28" height="22" rx="3" fill={HEAD} />
          <path d={`M${W / 2 - 6} -4 L${W / 2} 2 L${W / 2 + 6} -4 Z`} fill={HEAD} />
        </g>
      )}
    </svg>
  )
}

/**
 * Made layer by layer. On desktop the section holds for a short while as the vessel goes from a dashed
 * digital model to a first layer, prints upward under the head, and settles as a finished object, with the
 * matching step lighting beside it. On touch screens it builds as you pass, without holding the page.
 */
export function Process() {
  const root = useRef<HTMLElement>(null)
  const counter = useRef<HTMLSpanElement>(null)

  useGSAP(() => {
    const layers = gsap.utils.toArray<SVGRectElement>('.pr-layer')
    const steps = gsap.utils.toArray<HTMLElement>('.pr-step')
    const state = { n: 0 }
    const setStep = (p: number) => {
      const active = p < 0.14 ? 0 : p < 0.3 ? 1 : p < 0.92 ? 2 : 3
      steps.forEach((s, i) => s.classList.toggle('is-active', i === active))
    }
    const build = () => gsap.timeline()
      .fromTo('.pr-outline', { strokeDashoffset: 1000 }, { strokeDashoffset: 0, duration: 0.14, ease: 'none' }, 0)
      .to(layers, { opacity: 1, scaleX: 1, duration: 0.05, stagger: 0.74 / LAYERS, ease: 'power2.out' }, 0.16)
      .to('.pr-head', { autoAlpha: 1, duration: 0.02 }, 0.15)
      .to('.pr-head', { y: 0, duration: 0.76, ease: 'none' }, 0.16)
      .to(state, {
        n: LAYERS, duration: 0.76, ease: 'none',
        onUpdate: () => { if (counter.current) counter.current.textContent = String(Math.round(state.n)).padStart(3, '0') },
      }, 0.16)
      .to('.pr-head', { autoAlpha: 0, duration: 0.04 }, 0.93)
      .to('.pr-wire', { autoAlpha: 0, duration: 0.06 }, 0.93)

    const prepare = () => {
      gsap.set(layers, { opacity: 0, scaleX: 0.25, transformOrigin: '50% 50%' })
      gsap.set('.pr-head', { autoAlpha: 0 })
    }
    const mm = gsap.matchMedia()
    mm.add(MQ.desktop, () => {
      prepare()
      const tl = build()
      tl.eventCallback('onUpdate', () => setStep(tl.progress()))
      gsap.timeline({
        scrollTrigger: { trigger: root.current, start: 'top top', end: '+=140%', pin: true, scrub: 0.8, anticipatePin: 1 },
      }).add(tl)
    })
    mm.add(MQ.mobile, () => {
      prepare()
      const tl = build()
      gsap.timeline({ scrollTrigger: { trigger: '.pr-figure', start: 'top 80%', end: 'bottom 40%', scrub: 0.8 } }).add(tl)
      steps.forEach((s) => gsap.from(s, { y: 24, autoAlpha: 0, duration: 1, ease: EASE.out, scrollTrigger: { trigger: s, start: 'top 90%', once: true } }))
      steps.forEach((s) => s.classList.add('is-active'))
    })
    mm.add('(prefers-reduced-motion: reduce)', () => {
      steps.forEach((s) => s.classList.add('is-active'))
      gsap.set('.pr-wire, .pr-head', { autoAlpha: 0 })
    })
    return () => mm.revert()
  }, { scope: root })

  return (
    <section ref={root} className="linen relative overflow-hidden bg-sand text-ink lg:h-svh">
      <div className="mx-auto grid h-full max-w-[1440px] gap-14 px-5 py-24 sm:px-8 lg:grid-cols-12 lg:items-center lg:gap-8 lg:px-10 lg:py-0">
        <div className="lg:col-span-5">
          <SplitReveal as="h2" className="font-display text-[clamp(2.6rem,5vw,5.25rem)] leading-[0.98]">
            Made layer<br /><span className="font-odd">by layer.</span>
          </SplitReveal>
          <p className="mt-5 max-w-md text-[16px] leading-[1.7] text-smoke">
            Nothing waits in a warehouse. Your piece is made after you order it, a fifth of a millimetre at a time.
          </p>
          <ol className="mt-10 border-t border-ink/15">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="pr-step border-b border-ink/15 py-4 transition-opacity duration-700 [&:not(.is-active)]:opacity-35 xl:py-5">
                <div className="flex items-baseline gap-5">
                  <span className="w-6 font-odd text-[15px] text-accent">{['i', 'ii', 'iii', 'iv'][i]}.</span>
                  <div>
                    <h3 className="font-display text-[1.45rem] leading-tight">{title}</h3>
                    <p className="mt-1.5 max-w-md text-[14.5px] leading-relaxed text-smoke">{body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="pr-figure relative lg:col-span-6 lg:col-start-7">
          <div className="plate relative mx-auto aspect-square w-full max-w-[36rem] bg-paper-2/60">
            <Vessel animated className="absolute inset-[13%] h-[74%] w-[74%]" />
            <p className="absolute inset-x-0 bottom-[6%] text-center text-[13px] tabular-nums text-smoke">
              Layer <span ref={counter} className="text-ink">000</span> of {LAYERS}, 0.2 mm each
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/** The same four stages, side by side and still: used on product pages, where nothing should hold the scroll. */
export function ProcessStrip({ className }: { className?: string }) {
  const stages = [0, 1, Math.round(LAYERS * 0.55), LAYERS]
  return (
    <ol className={cn('grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4', className)}>
      {STEPS.map(([title, body], i) => (
        <li key={title}>
          <div className="plate mx-auto aspect-square w-full max-w-[15rem] bg-paper-2/70">
            <Vessel built={stages[i]} className="size-full p-[14%]" />
          </div>
          <h3 className="mt-6 flex items-baseline gap-3 font-display text-[1.35rem] text-ink">
            <span className="font-odd text-[14px] text-accent">{['i', 'ii', 'iii', 'iv'][i]}.</span>{title}
          </h3>
          <p className="mt-2 text-[14px] leading-relaxed text-smoke">{body}</p>
        </li>
      ))}
    </ol>
  )
}
