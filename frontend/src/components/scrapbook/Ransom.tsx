import { cn } from '@/lib/cn'
import { seeded } from './random'

// Magazine scraps: [paper, ink]. Dark scraps are rare so the word stays light and airy.
const SCRAPS: [string, string][] = [
  ['#D8CEC2', '#3B2A21'], ['#EADBC8', '#43302A'], ['#E3DAD0', '#5C1F1F'], ['#F8DCCB', '#1A1A1A'],
  ['#EBDDC2', '#6E6450'], ['#E9DFCF', '#1A1A1A'], ['#F5C9A6', '#3B2A21'], ['#A8927A', '#FBF7F0'],
  ['#F0B9A0', '#43302A'], ['#3F3A36', '#EBDDC2'], ['#E3D2B4', '#8A6A2A'], ['#FFFFFF', '#5C1F1F'],
]
const FACES: { family: string; style?: string; weight?: number }[] = [
  { family: '"Abril Fatface", serif' },
  { family: '"DM Serif Display", serif' },
  { family: '"Playfair Display", serif', style: 'italic', weight: 900 },
  { family: '"Chewy", sans-serif' },
  { family: '"DM Serif Display", serif', style: 'italic' },
]

/**
 * A ransom-note title: every letter is cut from a different magazine scrap.
 * Words never break across lines, and screen readers hear the plain text.
 */
export function Ransom({ text, className, seed }: { text: string; className?: string; seed?: string }) {
  const r = seeded(seed ?? text)
  const words = text.split(' ')
  return (
    <span className={cn('cutout inline-flex flex-wrap items-center gap-x-[0.3em] gap-y-[0.12em] leading-none', className)} role="img" aria-label={text}>
      {words.map((w, wi) => (
        <span key={wi} data-ransom className="inline-flex whitespace-nowrap" aria-hidden="true">
          {[...w].map((ch, i) => {
            const [bg, fg] = SCRAPS[Math.floor(r() * SCRAPS.length)]
            const face = FACES[Math.floor(r() * FACES.length)]
            const rot = (r() - 0.5) * 12
            const dy = (r() - 0.5) * 0.12
            const pad = 0.06 + r() * 0.08
            // Slightly uneven corners, like a scissor cut.
            const c = () => (r() * 7).toFixed(1)
            return (
              <span key={i} data-letter className="grain -mx-[0.02em] inline-block"
                style={{
                  backgroundColor: bg, color: fg, fontFamily: face.family, fontStyle: face.style, fontWeight: face.weight ?? 400,
                  padding: `${pad}em ${pad + 0.05}em ${pad + 0.02}em`,
                  transform: `rotate(${rot.toFixed(1)}deg) translateY(${dy.toFixed(2)}em)`,
                  clipPath: `polygon(${c()}% ${c()}%, ${100 - +c()}% ${c()}%, ${100 - +c()}% ${100 - +c()}%, ${c()}% ${100 - +c()}%)`,
                }}>
                {ch}
              </span>
            )
          })}
        </span>
      ))}
    </span>
  )
}
