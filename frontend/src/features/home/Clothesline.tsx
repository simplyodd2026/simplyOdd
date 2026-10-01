import { Link } from 'react-router-dom'
import { Container, SectionHeading } from '@/components/layout/Container'
import { useProducts } from '@/lib/queries'
import { money } from '@/lib/format'
import { Planet, SmileyFlower } from '@/components/scrapbook/Stickers'

const SAG = 56 // how far the line droops in the middle, in px

/** New arrivals, pegged to a drooping clothesline and swaying a little. */
export function Clothesline() {
  const { data } = useProducts({ flag: 'new', sort: 'newest', page_size: 5 })
  const items = data?.items ?? []
  if (!items.length) return null

  return (
    <Container className="relative py-14 sm:py-16">
      <SmileyFlower className="absolute left-[40%] top-8 hidden w-14 -rotate-6 lg:block" petal="#D3C8EE" />
      <Planet className="absolute right-[22%] top-6 hidden w-20 rotate-12 lg:block" color="#F4D3D7" ring="#BFD1E8" />
      <SectionHeading variant="stamp" kicker="fresh off the line" title="New arrivals" aside={
        <Link to="/new" className="inline-flex h-10 items-center rounded-full border-2 border-ink px-5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-paper">Everything new</Link>
      } />
      <div className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <div className="relative min-w-[900px] pb-10 pt-6">
          <svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-x-0 top-6 h-24 w-full">
            <path d={`M0 6 Q500 ${6 + SAG * 2} 1000 6`} fill="none" stroke="#8F7864" strokeWidth="2.5" />
          </svg>
          <ul className="relative grid grid-cols-5 gap-6 px-4">
            {items.map((p, i) => {
              const t = (i + 0.5) / items.length
              const drop = 4 * SAG * t * (1 - t) // follow the curve of the line
              const tilt = ((i * 53) % 9) - 4
              return (
                <li key={p.id} style={{ paddingTop: drop }}>
                  <Link to={`/product/${p.slug}`} className="group animate-swing block" style={{ '--r': `${tilt}deg`, animationDelay: `${i * -0.7}s` } as React.CSSProperties}>
                    <span aria-hidden="true" className="mx-auto -mb-2 block h-9 w-3.5 rounded-[3px] bg-[#D8B98E] shadow-[1px_2px_2px_rgb(0_0_0/0.25)] ring-1 ring-[#B8966A]" />
                    <div className="bg-paper p-2.5 pb-4 shadow-[0_14px_24px_-12px_rgb(67_48_42/0.5)] transition-transform group-hover:scale-105">
                      <div className="aspect-[4/5] overflow-hidden bg-ash">
                        <img src={p.images[0]?.url} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                      </div>
                      <p className="mt-2 truncate text-center font-semibold leading-tight text-ink">{p.name}</p>
                      <p className="font-hand text-center text-sm text-accent">{money(p.price)}</p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </Container>
  )
}
