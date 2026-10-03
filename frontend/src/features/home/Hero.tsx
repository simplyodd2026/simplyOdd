import { ButtonLink } from '@/components/ui/Button'
import { Ransom } from '@/components/scrapbook/Ransom'
import { TornEdge, TornNote } from '@/components/scrapbook/Torn'
import { Polaroid } from '@/components/scrapbook/Polaroid'
import { Daisy, DenimStar, Gingham, Mushroom, Rainbow, Sparkle, Strawberry, Tulip } from '@/components/scrapbook/Stickers'
import { useRef } from 'react'
import { useProducts } from '@/lib/queries'
import { useScrapMotion } from '@/components/scrapbook/useScrapMotion'
import { money } from '@/lib/format'
import { Slang } from '@/components/scrapbook/Slang'

// Where each photo sits on the collage (desktop), as [left, top, width, tilt].
const SPOTS: [string, string, string, number][] = [
  ['4%', '6%', '46%', -6],
  ['50%', '0%', '42%', 5],
  ['26%', '44%', '44%', -2],
]

/** A scrapbook page: ransom title, a torn note on pink grid paper and a collage of taped photos. */
export function Hero() {
  const { data } = useProducts({ flag: 'featured', sort: 'popular', page_size: 3 })
  const root = useRef<HTMLElement>(null)
  useScrapMotion(root)
  const products = data?.items ?? []
  const lead = products[0]

  return (
    <section ref={root} className="relative overflow-hidden">
      <div className="relative mx-auto max-w-[1600px] px-4 pb-4 pt-10 sm:px-6 sm:pt-14 lg:px-10">
        <Daisy className="animate-bob absolute -left-3 top-2 w-16 sm:left-2 sm:w-24" />
        <div className="relative z-10 pl-10 sm:pl-24">
          <p className="font-hand -rotate-2 text-lg text-accent sm:text-xl">hello, weirdo <span aria-hidden="true">♡</span></p>
          <h1 className="mt-3 text-[clamp(2.6rem,8vw,6.5rem)]">
            <Ransom text="simply odd things" seed="hero" />
          </h1>
        </div>
        <Rainbow className="absolute -bottom-10 right-[3%] z-20 hidden w-36 -rotate-6 md:block lg:w-44" />
        <Mushroom className="absolute right-4 top-4 w-20 rotate-6 sm:w-28 lg:right-10" />
        <Slang text="custom? say less" tone="pink" tilt={5} className="absolute right-[17%] top-6 hidden lg:inline-flex" />
      </div>

      <div className="relative">
        <div className="bg-paper"><TornEdge color="var(--color-pink)" fibre="var(--color-paper-2)" seed="hero-top" /></div>
        <div className="kraft-grid pink-grid -mt-px">
          <div className="mx-auto grid max-w-[1600px] items-center gap-10 px-4 pb-16 pt-6 sm:px-6 md:grid-cols-12 lg:px-10">
            <div data-drop className="relative md:col-span-6 lg:col-span-5">
              <TornNote seed="hero-note" className="-rotate-1" paperClassName="px-7 py-9 sm:px-10 sm:py-12">
                <p className="text-lg font-medium leading-relaxed text-ink text-pretty sm:text-xl">
                  Lamps that look like they grew overnight, vases caught mid-thought, and a box that
                  contains nothing at all. Every piece is designed by us, printed layer by layer in small
                  batches, and finished by hand. Odd on purpose, made with care.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <ButtonLink to="/shop" size="lg">Shop the collection</ButtonLink>
                  <ButtonLink to="/new" size="lg" variant="outline">What's new</ButtonLink>
                </div>
              </TornNote>
              <DenimStar className="absolute -bottom-10 right-4 w-20 rotate-12 sm:w-24" />
            </div>

            <div className="relative h-[440px] sm:h-[560px] md:col-span-6 lg:col-span-7">
              {SPOTS.map(([left, top, width, tilt], i) => {
                const p = products[i]
                return (
                  <div key={i} data-drop className="absolute" style={{ left, top, width }}>
                    {p ? (
                      <Polaroid to={`/product/${p.slug}`} src={p.images[1]?.url ?? p.images[0]?.url} alt={p.name} caption={p.name}
                        style={{ transform: `rotate(${tilt}deg)` }} />
                    ) : (
                      <div className="aspect-[5/6] animate-pulse bg-paper/60" style={{ transform: `rotate(${tilt}deg)` }} />
                    )}
                  </div>
                )
              })}
              {lead && <PriceBurst price={money(lead.price)} className="absolute right-[2%] top-[58%] z-10 w-24 sm:w-28" />}
              <Sparkle className="absolute left-[44%] top-[36%] w-14 sm:w-16" />
              <Sparkle className="absolute left-[40%] top-[30%] w-7 sm:w-9" />
              <Strawberry className="absolute bottom-2 right-[30%] w-16 -rotate-12 sm:w-20" />
              <Tulip className="absolute bottom-0 left-0 hidden w-14 -rotate-6 sm:block" />
              <Gingham className="absolute -right-6 top-[30%] h-20 w-28 rotate-6" />
            </div>
          </div>
          <TornEdge color="var(--color-paper)" fibre="var(--color-cream)" seed="hero-bottom" />
        </div>
      </div>
    </section>
  )
}

/** A starburst price sticker, like the ones on a thrift-shop find. */
function PriceBurst({ price, className }: { price: string; className?: string }) {
  const points = Array.from({ length: 32 }, (_, i) => {
    const r = i % 2 ? 40 : 50
    const a = (i / 32) * Math.PI * 2
    return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
  return (
    <div className={`cutout pointer-events-none rotate-12 ${className ?? ''}`} aria-hidden="true">
      <svg viewBox="0 0 100 100" className="w-full">
        <polygon points={points} fill="#EBDDC2" stroke="#B45309" strokeWidth="1.5" />
        <text x="50" y="44" textAnchor="middle" fontFamily="Gochi Hand, cursive" fontSize="11" fill="#43302A">only</text>
        <text x="50" y="62" textAnchor="middle" fontFamily="Chewy, sans-serif" fontSize="17" fill="#43302A">{price}</text>
      </svg>
    </div>
  )
}
