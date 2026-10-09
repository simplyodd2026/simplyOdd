import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap, useGSAP, MQ } from '@/lib/motion'
import type { Product, ProductImage } from '@/lib/types'
import { useHomePieces, type Piece } from './pieces'

type Shot = { product: Product; image: ProductImage; ratio: number }

/**
 * The band is as tall as its photograph, so the picture is never cropped. A photo chosen in the admin is
 * used as is; otherwise, of the room piece's photos, the one whose proportions best suit the screen:
 * the widest on a desktop, the tallest on a phone.
 * The images are mostly in the cache already from the sections above, so measuring them is cheap.
 */
function useRoomShot(room?: Piece) {
  const [shot, setShot] = useState<Shot>()
  const key = room && (room.image?.url ?? room.product.images.map((i) => i.url).join())
  useEffect(() => {
    if (!room) return
    const { product } = room
    let live = true
    const target = window.innerWidth / (window.innerHeight * 0.88)
    const candidates = (room.image ? [room.image] : product.images).map((image) => ({ product, image }))
    Promise.all(candidates.map((c) => new Promise<Shot | null>((done) => {
      const img = new Image()
      img.onload = () => done(img.naturalWidth ? { ...c, ratio: img.naturalWidth / img.naturalHeight } : null)
      img.onerror = () => done(null)
      img.src = c.image.url
    }))).then((shots) => {
      const best = shots.filter((x): x is Shot => !!x)
        .sort((a, b) => Math.abs(Math.log(a.ratio / target)) - Math.abs(Math.log(b.ratio / target)))[0]
      if (live && best) setShot(best)
    })
    return () => { live = false }
  }, [key])
  return shot
}

/**
 * In your space. One photograph of a piece at home, edge to edge, with a line of type laid over the
 * lower corner. The picture eases in from slightly larger as it scrolls past, as if you were walking in.
 */
export function InYourSpace() {
  const { room } = useHomePieces()
  const shot = useRoomShot(room)
  const root = useRef<HTMLElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(MQ.motion, () => {
      gsap.fromTo('.room-img', { scale: 1.04 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true },
      })
    })
    return () => mm.revert()
  }, { scope: root, dependencies: [shot?.image.url] })

  if (!shot) return null
  const { product: p, image, ratio } = shot

  return (
    <section ref={root} className="relative isolate h-[88svh] min-h-[32rem] overflow-hidden bg-ash"
      style={{ height: `calc(100vw / ${ratio})` }}>
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
