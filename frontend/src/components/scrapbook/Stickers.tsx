import { useId, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { tornPolygon } from './random'

interface StickerProps { className?: string; style?: CSSProperties }

/**
 * Wraps a sticker drawing in a felt filter: edges get a slight fuzz and the
 * surface picks up a speckled fabric grain. Stickers are decorative only.
 */
function Felt({ viewBox, children, className, style }: StickerProps & { viewBox: string; children: ReactNode }) {
  const id = `felt${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <svg viewBox={viewBox} aria-hidden="true" className={cn('cutout pointer-events-none select-none overflow-visible', className)} style={style}>
      <defs>
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" result="fuzzy" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 0.62" result="speck" />
          <feComposite in="speck" in2="fuzzy" operator="in" result="grain" />
          <feMerge><feMergeNode in="fuzzy" /><feMergeNode in="grain" /></feMerge>
        </filter>
      </defs>
      <g filter={`url(#${id})`}>{children}</g>
    </svg>
  )
}

const stitch = { fill: 'none', strokeWidth: 1.6, strokeDasharray: '3 3', strokeLinecap: 'round' as const }

export function Sparkle({ className, style, color = '#E0B44C', edge = '#C0852E' }: StickerProps & { color?: string; edge?: string }) {
  return (
    <Felt viewBox="0 0 100 100" className={className} style={style}>
      <path d="M50 3C54 35 65 46 97 50C65 54 54 65 50 97C46 65 35 54 3 50C35 46 46 35 50 3Z" fill={color} stroke={edge} strokeWidth="3.5" strokeLinejoin="round" />
    </Felt>
  )
}

const STAR = 'M50 4L61.2 34.6L93.7 35.8L68.1 55.9L77 87.2L50 69L23 87.2L31.9 55.9L6.3 35.8L38.8 34.6Z'

/** A denim patch star with contrast stitching. */
export function DenimStar({ className, style, color = '#5C1F1F' }: StickerProps & { color?: string }) {
  return (
    <Felt viewBox="0 0 100 92" className={className} style={style}>
      <path d={STAR} fill="#F6E4E1" stroke="#F6E4E1" strokeWidth="8" strokeLinejoin="round" />
      <path d={STAR} fill={color} />
      <path d={STAR} transform="translate(9 9) scale(0.82)" stroke="#F2EBE1" {...stitch} />
    </Felt>
  )
}

export function Strawberry({ className, style }: StickerProps) {
  const seeds = [[36, 50], [50, 46], [64, 50], [30, 64], [44, 62], [58, 62], [70, 64], [38, 77], [52, 78], [64, 76], [46, 89]]
  return (
    <Felt viewBox="0 0 100 100" className={className} style={style}>
      <path d="M50 30C79 27 91 44 87 60C83 80 62 97 50 97C38 97 17 80 13 60C9 44 21 27 50 30Z" fill="#E9A07A" />
      {seeds.map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="2" ry="3" fill="#F6EDDC" transform={`rotate(${(i % 3 - 1) * 15} ${x} ${y})`} />)}
      <path d="M50 38L34 22L46 26L48 8L55 25L69 14L63 31L80 31L61 39L50 44Z" fill="#8A5A3F" stroke="#5C1F1F" strokeWidth="2" strokeLinejoin="round" />
    </Felt>
  )
}

export function Tulip({ className, style, color = '#9B2C2C' }: StickerProps & { color?: string }) {
  return (
    <Felt viewBox="0 0 80 110" className={className} style={style}>
      <path d="M40 50C40 70 40 88 40 108" stroke="#7A4A30" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M40 84C52 70 66 70 72 74C66 86 52 90 40 84Z" fill="#9A6A4C" />
      <path d="M40 92C30 80 16 78 10 82C16 94 30 96 40 92Z" fill="#9A6A4C" />
      <path d="M18 26C18 6 30 0 40 12C50 0 62 6 62 26C62 44 52 52 40 52C28 52 18 44 18 26Z" fill={color} />
      <path d="M40 12C36 24 36 38 40 52" stroke="rgb(0 0 0 / 0.15)" strokeWidth="2" fill="none" />
    </Felt>
  )
}

/** A torn swatch of gingham fabric. */
export function Gingham({ className, style, color = '155 44 44' }: StickerProps & { color?: string }) {
  return (
    <div aria-hidden="true" className={cn('cutout pointer-events-none', className)} style={style}>
      <div className="h-full w-full" style={{
        clipPath: tornPolygon('gingham', 5, 4),
        backgroundColor: '#F8F4EE',
        backgroundImage: `linear-gradient(90deg, rgb(${color} / 0.55) 50%, transparent 50%), linear-gradient(rgb(${color} / 0.55) 50%, transparent 50%)`,
        backgroundSize: '14px 14px',
      }} />
    </div>
  )
}

/** A small stitched heart patch. */
export function HeartPatch({ className, style, color = '#F0B9A0' }: StickerProps & { color?: string }) {
  const d = 'M50 88C20 68 6 50 10 32C14 14 36 10 50 28C64 10 86 14 90 32C94 50 80 68 50 88Z'
  return (
    <Felt viewBox="0 0 100 96" className={className} style={style}>
      <path d={d} fill={color} />
      <path d={d} transform="translate(9 8) scale(0.82)" stroke="#FFFFFF" {...stitch} />
    </Felt>
  )
}

/** A daisy with soft petals and a buttery centre. */
export function Daisy({ className, style, petal = '#FFFFFF', centre = '#E0B44C' }: StickerProps & { petal?: string; centre?: string }) {
  return (
    <Felt viewBox="0 0 100 100" className={className} style={style}>
      {Array.from({ length: 10 }, (_, i) => (
        <ellipse key={i} cx="50" cy="24" rx="10" ry="22" fill={petal} stroke="#E5DCCF" strokeWidth="1.5" transform={`rotate(${i * 36} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="15" fill={centre} />
      <circle cx="50" cy="50" r="15" fill="none" stroke="#C0852E" strokeWidth="1.5" strokeDasharray="2 3" />
    </Felt>
  )
}

/** A chubby polka-dot mushroom. */
export function Mushroom({ className, style, cap = '#E9C3BD' }: StickerProps & { cap?: string }) {
  return (
    <Felt viewBox="0 0 100 100" className={className} style={style}>
      <path d="M38 52C36 70 34 84 36 92C44 96 56 96 64 92C66 84 64 70 62 52Z" fill="#F4EBDD" stroke="#D9CBB6" strokeWidth="2" />
      <path d="M6 54C6 26 26 8 50 8S94 26 94 54C94 60 88 62 50 62S6 60 6 54Z" fill={cap} />
      {[[28, 30, 6], [52, 22, 7], [72, 36, 5], [40, 46, 4], [62, 50, 3.5]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#FFFFFF" />)}
      <circle cx="44" cy="76" r="2" fill="#43302A" /><circle cx="56" cy="76" r="2" fill="#43302A" />
      <path d="M46 82Q50 86 54 82" fill="none" stroke="#43302A" strokeWidth="1.8" strokeLinecap="round" />
    </Felt>
  )
}

/** A pastel rainbow arc with fluffy ends. */
export function Rainbow({ className, style }: StickerProps) {
  const bands = ['#E9C3BD', '#F5C9A6', '#EBDDC2', '#EADBC8', '#D8CEC2']
  return (
    <Felt viewBox="0 0 120 70" className={className} style={style}>
      {bands.map((c, i) => (
        <path key={c} d={`M${10 + i * 8} 62A${50 - i * 8} ${50 - i * 8} 0 0 1 ${110 - i * 8} 62`} fill="none" stroke={c} strokeWidth="8" />
      ))}
      <circle cx="12" cy="62" r="9" fill="#FFFFFF" /><circle cx="22" cy="64" r="7" fill="#FFFFFF" />
      <circle cx="108" cy="62" r="9" fill="#FFFFFF" /><circle cx="98" cy="64" r="7" fill="#FFFFFF" />
    </Felt>
  )
}

/** A wobbly blob with googly eyes, the house mascot of odd. */
export function GooglyBlob({ className, style, color = '#EADBC8' }: StickerProps & { color?: string }) {
  return (
    <Felt viewBox="0 0 100 90" className={className} style={style}>
      <path d="M50 6C72 4 92 20 94 44C96 68 78 86 52 86C26 86 6 72 6 48C6 24 28 8 50 6Z" fill={color} />
      <circle cx="36" cy="40" r="12" fill="#FFFFFF" stroke="#43302A" strokeWidth="2" />
      <circle cx="64" cy="38" r="14" fill="#FFFFFF" stroke="#43302A" strokeWidth="2" />
      <circle cx="39" cy="44" r="5" fill="#43302A" /><circle cx="60" cy="42" r="6" fill="#43302A" />
      <path d="M40 64Q50 72 62 62" fill="none" stroke="#43302A" strokeWidth="2.5" strokeLinecap="round" />
    </Felt>
  )
}

/** A chunky lightning bolt with a stitched edge. */
export function Bolt({ className, style, color = '#EBDDC2' }: StickerProps & { color?: string }) {
  const d = 'M58 4L18 56H46L36 96L84 38H54Z'
  return (
    <Felt viewBox="0 0 100 100" className={className} style={style}>
      <path d={d} fill={color} stroke="#B45309" strokeWidth="3" strokeLinejoin="round" />
      <path d={d} transform="translate(10 9) scale(0.8)" stroke="#FFFFFF" {...stitch} />
    </Felt>
  )
}

/** A little ringed planet. */
export function Planet({ className, style, color = '#E3DAD0', ring = '#F5C9A6' }: StickerProps & { color?: string; ring?: string }) {
  return (
    <Felt viewBox="0 0 120 90" className={className} style={style}>
      <path d="M14 58C4 68 22 74 60 62S118 34 106 26" fill="none" stroke={ring} strokeWidth="7" strokeLinecap="round" />
      <circle cx="60" cy="45" r="30" fill={color} />
      <circle cx="50" cy="36" r="5" fill="#FFFFFF" opacity="0.5" /><circle cx="70" cy="54" r="3.5" fill="#FFFFFF" opacity="0.4" />
      <path d="M106 26C118 18 96 18 60 30S2 58 14 58" fill="none" stroke={ring} strokeWidth="7" strokeLinecap="round" />
    </Felt>
  )
}

/** A swirly lollipop. */
export function Lollipop({ className, style, a = '#E9C3BD', b = '#FFFFFF' }: StickerProps & { a?: string; b?: string }) {
  return (
    <Felt viewBox="0 0 80 120" className={className} style={style}>
      <rect x="37" y="60" width="6" height="56" rx="3" fill="#F4EBDD" stroke="#D9CBB6" strokeWidth="1.5" />
      <circle cx="40" cy="38" r="34" fill={b} />
      <path d="M40 38m0-4a4 4 0 1 1-4 4a8 8 0 0 1 8-8a12 12 0 0 1 12 12a16 16 0 0 1-16 16a20 20 0 0 1-20-20a24 24 0 0 1 24-24a28 28 0 0 1 28 28"
        fill="none" stroke={a} strokeWidth="7" strokeLinecap="round" />
    </Felt>
  )
}

/** A flower with a smiling face. */
export function SmileyFlower({ className, style, petal = '#F5C9A6' }: StickerProps & { petal?: string }) {
  return (
    <Felt viewBox="0 0 100 100" className={className} style={style}>
      {Array.from({ length: 6 }, (_, i) => <circle key={i} cx="50" cy="22" r="18" fill={petal} transform={`rotate(${i * 60} 50 50)`} />)}
      <circle cx="50" cy="50" r="20" fill="#EBDDC2" />
      <circle cx="43" cy="46" r="2.5" fill="#43302A" /><circle cx="57" cy="46" r="2.5" fill="#43302A" />
      <path d="M42 55Q50 62 58 55" fill="none" stroke="#43302A" strokeWidth="2.2" strokeLinecap="round" />
    </Felt>
  )
}
