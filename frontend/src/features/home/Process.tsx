import { useRef } from 'react'
import { gsap, useGSAP, MQ, EASE } from '@/lib/motion'
import { SplitReveal } from '@/components/motion/Reveal'

export const STEPS = [
  ['Design', 'Every piece starts as a sketch and a question. We model it in-house and prototype until the proportions feel resolved.'],
  ['Slice', 'The form is cut into hundreds of horizontal layers, each 0.2 mm tall, and the toolpath is tuned for that exact shape.'],
  ['Print', 'Made to order in PLA or heat-resistant PETG. A medium vessel takes the better part of a day to build.'],
  ['Finish', 'Supports removed, edges refined, interiors sealed where needed, then inspected by hand and packed in paper pulp.'],
] as const

const LAYERS = 96
const W = 360
const H = 480
const LAYER_H = H / LAYERS
const HOT = '#E0B44C'

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

/**
 * The craft, told by the object itself. On desktop the section pins while a vessel builds layer by layer
 * with the scroll, a print head tracking the current layer and the steps lighting in turn.
 * On touch screens it builds as you pass through, without pinning.
 */
export function Process() {
  const root = useRef<HTMLElement>(null)
  const counter = useRef<HTMLSpanElement>(null)

  useGSAP(() => {
    const layers = gsap.utils.toArray<SVGRectElement>('.pr-layer')
    const steps = gsap.utils.toArray<HTMLElement>('.pr-step')
    const state = { n: 0 }
    const setStep = (p: number) => {
      const active = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length))
      steps.forEach((s, i) => s.classList.toggle('is-active', i === active))
    }
    const build = () => gsap.timeline()
      .to(layers, { opacity: 1, scaleX: 1, duration: 0.2, stagger: 0.8 / LAYERS, ease: 'power2.out' }, 0)
      .to('.pr-head', { y: 0, duration: 1, ease: 'none' }, 0)
      .to(state, {
        n: LAYERS, duration: 1, ease: 'none',
        onUpdate: () => { if (counter.current) counter.current.textContent = String(Math.round(state.n)).padStart(3, '0') },
      }, 0)
      .to('.pr-head', { autoAlpha: 0, duration: 0.05 }, 1)
      .to('.pr-solid', { autoAlpha: 1, duration: 0.15 }, 1)

    const mm = gsap.matchMedia()
    // The canvas wipes open from a framed panel to full bleed as you arrive.
    mm.add(MQ.motion, () => {
      gsap.fromTo(root.current, { clipPath: 'inset(0% 3% 0% 3% round 8px)' }, {
        clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'top top', scrub: true },
      })
    })
    mm.add(MQ.desktop, () => {
      gsap.set(layers, { opacity: 0, scaleX: 0.2, transformOrigin: '50% 50%' })
      const tl = build()
      tl.eventCallback('onUpdate', () => setStep(tl.progress()))
      gsap.timeline({
        scrollTrigger: { trigger: root.current, start: 'top top', end: '+=260%', pin: true, scrub: 1, anticipatePin: 1 },
      }).add(tl)
    })
    mm.add(MQ.mobile, () => {
      gsap.set(layers, { opacity: 0, scaleX: 0.2, transformOrigin: '50% 50%' })
      const tl = build()
      gsap.timeline({ scrollTrigger: { trigger: '.pr-figure', start: 'top 75%', end: 'bottom 35%', scrub: 1 } }).add(tl)
      steps.forEach((s) => gsap.from(s, { y: 30, autoAlpha: 0, duration: 1, ease: EASE.out, scrollTrigger: { trigger: s, start: 'top 90%', once: true } }))
      steps.forEach((s) => s.classList.add('is-active'))
    })
    mm.add('(prefers-reduced-motion: reduce)', () => { steps.forEach((s) => s.classList.add('is-active')) })
    return () => mm.revert()
  }, { scope: root })

  return (
    <section ref={root} className="film-grain relative overflow-hidden bg-night text-paper lg:h-svh">
      <div className="mx-auto grid h-full max-w-[1680px] gap-14 px-5 py-24 sm:px-8 lg:grid-cols-12 lg:items-center lg:gap-8 lg:px-10 lg:py-0">
        <div className="lg:col-span-5">
          <p className="label mb-5 text-paper/50"><span className="text-paper">(03)</span>&nbsp;&nbsp;Process</p>
          <SplitReveal as="h2" className="font-display text-[clamp(2.25rem,4.4vw,4.75rem)] leading-[0.98]">
            Made layer by layer, <span className="font-odd text-paper/60">to order.</span>
          </SplitReveal>
          <ol className="mt-8 border-t border-paper/15 xl:mt-12">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="pr-step group border-b border-paper/15 py-4 transition-opacity duration-700 [&:not(.is-active)]:opacity-35 xl:py-5">
                <div className="flex items-baseline gap-5">
                  <span className="font-mono text-[11px] text-paper/50">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className="text-xl text-paper">{title}</h3>
                    <p className="mt-1.5 max-w-md text-[14px] leading-relaxed text-paper/60 xl:text-[15px]">{body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="pr-figure relative lg:col-span-6 lg:col-start-7">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-[34rem] border border-paper/10">
            <div className="absolute inset-x-4 top-4 flex justify-between label text-paper/50">
              <span>Layer <span ref={counter} className="text-paper">000</span> / {LAYERS}</span>
              <span>0.20 mm · PETG</span>
            </div>
            <div className="absolute inset-x-4 bottom-4 flex justify-between label text-paper/40">
              <span>Nozzle 0.4 mm</span>
              <span>Bed 70 °C</span>
            </div>

            <svg viewBox={`0 -20 ${W} ${H + 40}`} className="absolute inset-[12%] h-[76%] w-[76%]" aria-hidden="true">
              <defs>
                <linearGradient id="pr-shade" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor="#8C7461" />
                  <stop offset="0.35" stopColor="#F1E7D3" />
                  <stop offset="0.6" stopColor="#D8C6AE" />
                  <stop offset="1" stopColor="#6E5A4B" />
                </linearGradient>
              </defs>
              <line x1="0" x2={W} y1={H + 6} y2={H + 6} stroke="rgb(250 247 245 / 0.25)" strokeWidth="1" />
              {Array.from({ length: LAYERS }, (_, i) => {
                const l = layerAt(i)
                return <rect key={i} className="pr-layer" x={l.x} y={l.y} width={l.w} height={LAYER_H * 0.78} rx={LAYER_H / 2} fill="url(#pr-shade)" />
              })}
              <g className="pr-solid" style={{ opacity: 0, visibility: 'hidden' }}>
                {Array.from({ length: LAYERS }, (_, i) => {
                  const l = layerAt(i)
                  return i % 6 === 0 ? <rect key={i} x={l.x} y={l.y} width={l.w} height={LAYER_H * 0.5} fill={HOT} opacity="0.18" /> : null
                })}
              </g>
              <g className="pr-head" transform={`translate(0 ${H - LAYER_H})`}>
                <line x1="-20" x2={W + 20} y1="0" y2="0" stroke={HOT} strokeWidth="1" strokeDasharray="3 5" />
                <rect x={W / 2 - 14} y="-26" width="28" height="22" fill={HOT} />
                <path d={`M${W / 2 - 6} -4 L${W / 2} 2 L${W / 2 + 6} -4 Z`} fill={HOT} />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}
