import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { reducedMotion } from '@/lib/motion'

// The Simply Odd mark, measured from the logo: ten rounded layers stacked into a vase, top to bottom, in
// logo units (the mark is 137 wide, 160 tall). The sixth is the odd one, in orange.
const LAYER_H = 11
const LAYERS = [
  { y: 0, x1: 36, x2: 90 },
  { y: 16.5, x1: 41, x2: 85 },
  { y: 33, x1: 42, x2: 84 },
  { y: 49.5, x1: 33, x2: 93 },
  { y: 66, x1: 18, x2: 108 },
  { y: 82.5, x1: 21, x2: 136, odd: true },
  { y: 99, x1: 0, x2: 126 },
  { y: 115.5, x1: 3, x2: 123 },
  { y: 132, x1: 13, x2: 113 },
  { y: 148.5, x1: 28, x2: 98 },
]
const INK = '#18201B' // the logo's own near-black
const ODD = '#F2642A'
const HOT = '#FFB25E' // fresh filament, before it cools
const BED_Y = 163
const PARK = { x: 150, y: -46 }
// How far above the nozzle tip the gantry rail runs.
const RAIL = 28

// The print, scheduled like a real one: bottom layer first, the nozzle travelling to the start of each layer
// and sweeping across it, alternating direction, one layer higher each time.
const START = 0.7
const TRAVEL = 0.13
const SPEED = 0.003 // seconds per logo unit of sweep
function plan() {
  let t = START
  const steps = [...LAYERS].reverse().map((l, k) => {
    const ltr = k % 2 === 0
    const from = ltr ? l.x1 : l.x2
    const to = ltr ? l.x2 : l.x1
    const tipY = l.y + LAYER_H / 2
    const sweep = (l.x2 - l.x1) * SPEED + 0.08
    const step = { layer: LAYERS.length - 1 - k, ltr, from, to, tipY, at: t + TRAVEL, sweep }
    t += TRAVEL + sweep
    return step
  })
  const end = t + 0.55
  // The nozzle's path: parked, then to the start of each layer and across it, then parked again.
  const xs = [PARK.x], ys = [PARK.y], ts = [0], eases: ('linear' | 'easeInOut')[] = []
  xs.push(PARK.x); ys.push(PARK.y); ts.push(START); eases.push('linear')
  for (const s of steps) {
    xs.push(s.from, s.to); ys.push(s.tipY, s.tipY); ts.push(s.at, s.at + s.sweep); eases.push('easeInOut', 'linear')
  }
  xs.push(PARK.x); ys.push(PARK.y); ts.push(end); eases.push('easeInOut')
  return { steps, end, path: { xs, ys, times: ts.map((x) => x / end), eases } }
}
const PLAN = plan()

/**
 * The logo, printed. A print head sweeps back and forth over a glowing bed, laying down the mark's ten
 * layers from the bottom up, each one hot as it's laid and cooling to its colour, the odd orange layer in
 * its turn, then lifts away. Tapping the mark prints it again. With reduced motion it's simply there.
 * `onLayer` reports progress (0 to 10) for a caption; `onDone` fires when the head has parked.
 */
export function PrintedMark({ onLayer, className }: { onLayer?: (n: number) => void; className?: string }) {
  const [run, setRun] = useState(0)
  const still = reducedMotion()

  useEffect(() => {
    if (still) { onLayer?.(LAYERS.length); return }
    onLayer?.(0)
    const timers = PLAN.steps.map((s, k) => window.setTimeout(() => onLayer?.(k + 1), (s.at + s.sweep) * 1000))
    return () => timers.forEach(clearTimeout)
  }, [run, still, onLayer])

  return (
    <button type="button" onClick={() => setRun((r) => r + 1)} aria-label="Simply Odd. Build the logo again"
      className={className}>
      <svg key={run} viewBox="-24 -40 190 230" className="block size-full overflow-visible" aria-hidden>
        <defs>
          <radialGradient id="bed-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFB86B" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FFB86B" stopOpacity="0" />
          </radialGradient>
          <filter id="odd-glow" x="-30%" y="-200%" width="160%" height="500%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* The print bed: a warm pool of light under the piece, and its edge. */}
        <ellipse cx="68" cy={BED_Y + 2} rx="96" ry="10" fill="url(#bed-glow)" />
        <line x1="-14" x2="152" y1={BED_Y} y2={BED_Y} stroke={INK} strokeOpacity="0.28" strokeWidth="0.8" strokeLinecap="round" />

        {LAYERS.map((l, i) => {
          const s = PLAN.steps.find((p) => p.layer === i)!
          const color = l.odd ? ODD : INK
          return (
            <motion.rect key={i} x={l.x1} y={l.y} width={l.x2 - l.x1} height={LAYER_H} rx={LAYER_H / 2}
              filter={l.odd ? 'url(#odd-glow)' : undefined}
              style={{ transformBox: 'fill-box', originX: s.ltr ? 0 : 1 }}
              initial={still ? false : { scaleX: 0, fill: HOT }}
              animate={{ scaleX: 1, fill: [HOT, color] }}
              transition={{
                scaleX: { delay: s.at, duration: s.sweep, ease: 'linear' },
                fill: { delay: s.at + s.sweep * 0.4, duration: 1.1, ease: 'easeOut' },
              }} />
          )
        })}

        {!still && (
          <>
            {/* The gantry rail the head runs along, rising a layer at a time. */}
            <motion.line x1="-30" x2="170" y1="0" y2="0" stroke={INK} strokeOpacity="0.18" strokeWidth="1.2"
              initial={{ y: PARK.y - RAIL, opacity: 0 }}
              animate={{ y: PLAN.path.ys.map((y) => y - RAIL), opacity: [0, 1, 1, 0] }}
              transition={{ y: { duration: PLAN.end, times: PLAN.path.times, ease: PLAN.path.eases }, opacity: { duration: PLAN.end, times: [0, 0.08, 0.9, 1] } }} />
            {/* The print head, drawn with its nozzle tip at the origin. */}
            <motion.g initial={{ x: PARK.x, y: PARK.y, opacity: 0 }}
              animate={{ x: PLAN.path.xs, y: PLAN.path.ys, opacity: [0, 1, 1, 0] }}
              transition={{
                x: { duration: PLAN.end, times: PLAN.path.times, ease: PLAN.path.eases },
                y: { duration: PLAN.end, times: PLAN.path.times, ease: PLAN.path.eases },
                opacity: { duration: PLAN.end, times: [0, 0.06, 0.92, 1] },
              }}>
              <rect x="-11" y="-36" width="22" height="16" rx="2.5" fill="#3E3228" />
              <rect x="-11" y="-36" width="22" height="3" rx="1.5" fill="#D4A574" />
              <rect x="-7" y="-20" width="14" height="9" rx="1" fill="#A9532F" />
              <path d="M-4.5 -11 L4.5 -11 L1.4 -1.5 L-1.4 -1.5 Z" fill="#D4A574" />
              <motion.circle r="3.2" fill="#FFC77A" style={{ filter: 'blur(1.6px)' }}
                animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.5, repeat: Infinity }} />
            </motion.g>
          </>
        )}
      </svg>
    </button>
  )
}
