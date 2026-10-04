import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap, useGSAP, MQ } from '@/lib/motion'
import { useHomePieces } from './pieces'

/**
 * In your space. One photograph of a piece at home, edge to edge, with a line of type laid over the
 * lower corner. The picture eases in from slightly larger as it scrolls past, as if you were walking in.
 */
export function InYourSpace() {
  const { room } = useHomePieces()
  const root = useRef<HTMLElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(MQ.motion, () => {
      gsap.fromTo('.room-img', { scale: 1.12 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true },
      })
    })
    return () => mm.revert()
  }, { scope: root, dependencies: [room?.image?.url] })

  if (!room?.image) return null
  const { product: p, image } = room

  return (
    <section ref={root} className="relative isolate h-[88svh] min-h-[32rem] overflow-hidden bg-ash">
      <img src={image.url} alt={image.alt || `${p.name} at home`} loading="lazy" decoding="async"
        className="room-img absolute inset-0 -z-10 size-full object-cover" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[rgb(42_31_23/0.62)] via-[rgb(42_31_23/0.12)] to-transparent" />
      <div className="mx-auto flex h-full max-w-[1520px] flex-col justify-end px-5 pb-12 sm:px-8 sm:pb-16 lg:px-10">
        <h2 className="max-w-[14ch] font-display text-[clamp(2.8rem,7vw,7.5rem)] leading-[0.95] text-paper">
          Made for corners <span className="font-odd">that need something.</span>
        </h2>
        <p className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[15px] text-paper/80">
          <span>{p.name}, at home</span>
          <Link to={`/product/${p.slug}`} className="link-draw font-medium text-paper">See this piece</Link>
        </p>
      </div>
    </section>
  )
}
