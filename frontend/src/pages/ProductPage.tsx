import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useProduct, useConfig } from '@/lib/queries'
import { useCart } from '@/stores/cart'
import { useUi } from '@/stores/ui'
import { useWishlist } from '@/stores/wishlist'
import { useDocumentTitle } from '@/lib/hooks'
import { money } from '@/lib/format'
import { useTilt } from '@/lib/useTilt'
import { Container } from '@/components/layout/Container'
import { Viewer } from '@/components/product/Gallery'
import { QuantityStepper } from '@/components/product/QuantityStepper'
import { WishlistButton } from '@/components/product/WishlistButton'
import { Button } from '@/components/ui/Button'
import { Accordion } from '@/components/ui/Accordion'
import { Stars, Skeleton } from '@/components/ui/misc'
import { Icon } from '@/components/ui/Icon'
import { SplitReveal, Reveal } from '@/components/motion/Reveal'
import { Reviews } from '@/features/product/Reviews'
import { BoughtTogether } from '@/features/product/BoughtTogether'
import { ProductRail } from '@/features/home/ProductRail'
import { ProcessStrip } from '@/features/home/Process'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import NotFoundPage from './NotFoundPage'

const EASE = [0.16, 1, 0.3, 1] as const
// The gallery frame: a cut slab with three soft corners, the crisp one top right.
const SLAB = 'rounded-[2.5rem_0.5rem_2.5rem_2.5rem]'

/**
 * A product, laid out like a feature in a design magazine: the object large, then everything you need to
 * buy it right beside it. Below the fold the story continues in short chapters: why it exists, the details
 * (with a close-up of the surface), how it's made, the piece at home, and what to look at next.
 */
export default function ProductPage() {
  const { slug = '' } = useParams()
  const { data, isLoading, error } = useProduct(slug)
  const { data: config } = useConfig()
  const [qty, setQty] = useState(1)
  const add = useCart((s) => s.add)
  const setCart = useUi((s) => s.setCart)
  const navigate = useNavigate()
  const toggleWish = useWishlist((s) => s.toggle)
  const saved = useWishlist((s) => !!data && s.ids.includes(data.product.id))
  const buyBox = useRef<HTMLDivElement>(null)
  const tilt = useTilt<HTMLDivElement>(2.5)
  const [dock, setDock] = useState(false)
  const [shot, setShot] = useState(0)
  const [viewer, setViewer] = useState<number | null>(null)
  useDocumentTitle(data?.product.name)
  useEffect(() => { setQty(1); setShot(0) }, [slug])

  // On small screens, a slim purchase bar docks to the bottom once the main buttons scroll away.
  useEffect(() => {
    const el = buyBox.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setDock(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [data])

  if (error instanceof ApiError && error.status === 404) return <NotFoundPage />
  if (isLoading || !data) {
    return (
      <Container className="grid gap-10 pt-10 lg:grid-cols-12">
        <Skeleton className={cn('mx-auto aspect-[4/5] w-full max-w-[calc((100svh-10rem)*0.8)] lg:col-span-7', SLAB)} />
        <div className="flex flex-col gap-4 lg:col-span-4 lg:col-start-9"><Skeleton className="h-24" /><Skeleton className="h-10 w-1/3" /><Skeleton className="h-48" /></div>
      </Container>
    )
  }

  const { product: p, category, related, frequently_bought } = data
  const soldOut = p.availability === 'out_of_stock'
  const discounted = !!p.compare_at_price && p.compare_at_price > p.price
  const dims = [p.dimensions.width_cm, p.dimensions.height_cm, p.dimensions.depth_cm]
  const hero = p.images[shot] ?? p.images[0]
  const paragraphs = (p.description || '').split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean)
  const [lede, ...story] = paragraphs
  const room = p.images.slice(1)
  const freeOver = money(config?.free_shipping_threshold ?? 1999)
  const addToBag = () => { add(p.id, qty); setCart(true) }
  const buyNow = () => { add(p.id, qty); navigate('/checkout') }
  const availability = soldOut ? 'Sold out' : p.availability === 'low_stock' ? `Only ${p.stock} left` : 'In stock, ships in 2–4 days'

  const details: [string, string][] = [
    ['Material', p.materials.join(', ') || 'Plant-based PLA'],
    ...(dims.some(Boolean) ? [['Dimensions', `${dims.map((d) => d ?? '–').join(' × ')} cm`] as [string, string]] : []),
    ...(p.weight_g ? [['Weight', p.weight_g >= 1000 ? `${(p.weight_g / 1000).toFixed(2)} kg` : `${p.weight_g} g`] as [string, string]] : []),
    ['Finish', 'Supports removed and edges refined by hand'],
    ['Making time', p.manufacturing || 'Made to order in our studio, layer by layer'],
    ['Care', 'Dust with a soft, dry cloth. Keep away from direct heat and strong afternoon sun.'],
    ['Availability', availability],
  ]

  return (
    <>
      {/* The object and the means to buy it, side by side. */}
      <Container className="pt-6 sm:pt-10">
        <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="relative lg:col-span-7">
            <span aria-hidden className="pebble absolute -left-[6%] bottom-[10%] -z-10 aspect-square w-[46%] bg-clay/45 max-sm:hidden" />
            <motion.div key={p.id} initial={{ clipPath: 'inset(100% 0% 0% 0%)' }} animate={{ clipPath: 'inset(0% 0% 0% 0%)' }} transition={{ duration: 1.3, ease: EASE }}
              className="mx-auto w-full max-w-[calc((100svh-10rem)*0.8)]">
              <div ref={tilt}>
                <button type="button" onClick={() => setViewer(shot)} aria-label={`Open image ${shot + 1} of ${p.images.length}`}
                  className={cn('table-shadow relative block aspect-[4/5] w-full overflow-hidden bg-ash', SLAB)}>
                  <AnimatePresence mode="popLayout" initial={false}>
                    {hero ? (
                      <motion.img key={hero.url} src={hero.url} alt={hero.alt || p.name} draggable={false}
                        initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8, ease: EASE }}
                        className="absolute inset-0 size-full object-cover" />
                    ) : null}
                  </AnimatePresence>
                </button>
              </div>
            </motion.div>
            {p.images.length > 1 && (
              <div className="mx-auto mt-5 flex w-full max-w-[calc((100svh-10rem)*0.8)] flex-wrap gap-3" role="tablist" aria-label="Product images">
                {p.images.map((img, i) => (
                  <button key={img.url} type="button" role="tab" aria-selected={i === shot} aria-label={`Show image ${i + 1}`} onClick={() => setShot(i)}
                    className={cn('plate size-16 overflow-hidden ring-1 ring-offset-2 ring-offset-paper transition-[box-shadow,opacity] duration-300',
                      i === shot ? 'ring-ink' : 'opacity-60 ring-transparent hover:opacity-100')}>
                    <img src={img.url} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <nav className="mb-8 flex flex-wrap gap-2 text-[13px] text-fog" aria-label="Breadcrumb">
                <Link to="/shop" className="link-draw hover:text-ink">Objects</Link>
                {category && <><span aria-hidden>/</span><Link to={`/collections/${category.slug}`} className="link-draw hover:text-ink">{category.name}</Link></>}
                <span aria-hidden>/</span><span className="text-ink">{p.name}</span>
              </nav>
              <SplitReveal key={p.id} as="h1" on="load" delay={0.1} className="font-display text-[clamp(3rem,5.4vw,5.75rem)] leading-[0.98] text-ink text-balance">
                {p.name}
              </SplitReveal>
              {p.tagline && <p className="mt-3 font-odd text-[clamp(1.4rem,2vw,1.8rem)] leading-snug text-smoke">{p.tagline}</p>}
              {lede && <p className="mt-6 line-clamp-4 max-w-[30rem] text-[16.5px] leading-[1.7] text-graphite text-pretty">{lede}</p>}
              {p.rating.count > 0 && (
                <a href="#reviews" className="mt-5 inline-flex items-center gap-2 text-[13px] text-smoke hover:text-ink">
                  <Stars value={p.rating.average} className="text-ink" /> {p.rating.average.toFixed(1)}, {p.rating.count} {p.rating.count === 1 ? 'review' : 'reviews'}
                </a>
              )}

              <div className="mt-8 flex flex-wrap items-baseline gap-x-4 gap-y-2 border-t border-rule pt-7">
                <span className={cn('font-display text-[clamp(2.6rem,3.6vw,3.4rem)] leading-none tabular-nums text-ink', discounted && 'text-accent')}>{money(p.price)}</span>
                {discounted && <s className="text-[15px] text-fog" aria-label={`was ${money(p.compare_at_price!)}`}>{money(p.compare_at_price!)}</s>}
                {p.discount_percent > 0 && <span className="rounded-full bg-hot px-2.5 py-1 text-[12px] font-medium text-paper">−{p.discount_percent}%</span>}
              </div>
              <p className={cn('mt-3 flex items-center gap-2.5 text-[14px]', soldOut ? 'text-fog' : p.availability === 'low_stock' ? 'text-accent' : 'text-graphite')}>
                <span className={cn('size-1.5 rounded-full', soldOut ? 'bg-fog' : p.availability === 'low_stock' ? 'bg-hot' : 'bg-olive')} />
                {availability}
              </p>

              <div ref={buyBox} className="mt-7">
                {!soldOut ? (
                  <>
                    <div className="flex items-center gap-3">
                      <QuantityStepper value={qty} onChange={setQty} max={p.stock} />
                      <Button size="lg" className="h-14 flex-1" onClick={addToBag}>Add to bag</Button>
                      <WishlistButton productId={p.id} name={p.name} size={18}
                        className="grid size-14 shrink-0 place-items-center rounded-full border border-ink/15 text-ink hover:border-ink" />
                    </div>
                    <Button size="lg" variant="outline" className="mt-3 h-14 w-full" onClick={buyNow}>Buy now, {money(p.price * qty)}</Button>
                  </>
                ) : (
                  <Button size="lg" className="h-14 w-full" onClick={() => void toggleWish(p.id, p.name)}>
                    <Icon name="heart" size={18} filled={saved} /> {saved ? 'Saved' : 'Save for when it’s back'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* Why it exists: the maker's note, given room. */}
      {(story.length > 0 || p.tagline || lede) && (
        <Container className="py-28 sm:py-40">
          <div className="mx-auto grid max-w-[1300px] gap-10 lg:grid-cols-12">
            <p className="text-[14px] text-fog lg:col-span-2 lg:pt-3">Why it exists</p>
            <div className="lg:col-span-9">
              <SplitReveal as="p" className="font-display text-[clamp(2rem,3.8vw,3.8rem)] leading-[1.1] text-ink text-balance">
                {p.tagline ? `${p.tagline.trim().replace(/[.!?]+$/, '')}.` : lede}
              </SplitReveal>
              {(story.length > 0 || (p.tagline && lede)) && (
                <Reveal y={20} className="mt-10 max-w-[38rem] space-y-5 text-[17px] leading-[1.75] text-graphite text-pretty">
                  {(p.tagline ? paragraphs : story).map((t, i) => <p key={i}>{t}</p>)}
                </Reveal>
              )}
            </div>
          </div>
        </Container>
      )}

      {/* The details, with the surface seen up close. */}
      <section className="linen bg-stone py-24 sm:py-32">
        <Container>
          <div className="mx-auto grid max-w-[1300px] gap-14 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-5">
              <h2 className="font-display text-[clamp(2.4rem,4vw,4rem)] leading-[1] text-ink">The details</h2>
              {p.images[0] && (
                <figure className="mt-10 max-w-[22rem]">
                  {/* A close crop of the main photograph: the layer lines and the hand finish. */}
                  <div className="plate aspect-square overflow-hidden bg-ash">
                    <img src={p.images[0].url} alt={`${p.name}, close up`} loading="lazy" className="size-full scale-[1.5] object-cover" />
                  </div>
                  <figcaption className="mt-4 font-odd text-[1.05rem] text-smoke">Up close: the surface, layer by layer.</figcaption>
                </figure>
              )}
            </div>
            <dl className="border-b border-ink/15 lg:col-span-7">
              {details.map(([k, v]) => (
                <div key={k} className="grid gap-1 border-t border-ink/15 py-5 sm:grid-cols-[10rem_1fr] sm:gap-6">
                  <dt className="text-[14px] text-fog">{k}</dt>
                  <dd className="text-[16px] leading-relaxed text-ink">{v}</dd>
                </div>
              ))}
              <div className="border-t border-ink/15">
                <Accordion title="Shipping and returns">
                  <p>Standard delivery takes 5–8 business days and is complimentary over {freeOver}. Express takes 2–3 business days.
                    Unused pieces can be returned within 14 days; anything damaged in transit is remade at no cost.{' '}
                    <Link to="/help/shipping" className="link-draw text-ink">Details</Link></p>
                </Accordion>
              </div>
            </dl>
          </div>
        </Container>
      </section>

      {/* How it's made, still: four stages, no scroll held. */}
      <Container className="py-28 sm:py-36">
        <div className="mx-auto max-w-[1300px]">
          <div className="mb-16 flex flex-wrap items-end justify-between gap-6">
            <h2 className="font-display text-[clamp(2.4rem,4vw,4rem)] leading-[1] text-ink">Made layer <span className="font-odd">by layer.</span></h2>
            <Link to="/about#process" className="link-draw text-[15px] font-medium text-ink">More on our process</Link>
          </div>
          <ProcessStrip />
        </div>
      </Container>

      {/* The piece at home: the remaining photographs, at different scales. */}
      {room.length > 0 && (
        <Container className="pb-28 sm:pb-36">
          <div className="mx-auto max-w-[1300px]">
            <h2 className="mb-12 font-display text-[clamp(2.4rem,4vw,4rem)] leading-[1] text-ink">In your space</h2>
            <div className="grid gap-5 sm:grid-cols-12 sm:gap-6">
              {room.slice(0, 3).map((img, i) => (
                <button key={img.url} type="button" onClick={() => setViewer(i + 1)} aria-label={`Open image ${i + 2} of ${p.images.length}`}
                  className={cn('block overflow-hidden bg-ash',
                    i === 0 ? 'pebble-2 aspect-[4/3] sm:col-span-7' : i === 1 ? 'arch aspect-[3/4] sm:col-span-4 sm:col-start-9 sm:mt-24' : 'slab aspect-[16/9] sm:col-span-6 sm:col-start-3')}>
                  <img src={img.url} alt={img.alt || `${p.name} at home`} loading="lazy" decoding="async"
                    className="size-full object-cover transition-transform duration-[1.4s] ease-[var(--ease-out-quint)] hover:scale-[1.03]" />
                </button>
              ))}
            </div>
          </div>
        </Container>
      )}

      <Viewer images={p.images} name={p.name} index={viewer} onChange={setViewer} />

      <Container><div className="mx-auto max-w-[1440px]">
        <BoughtTogether key={p.id} product={p} others={frequently_bought} />
        <Reviews product={p} />
      </div></Container>

      {related.length > 0 && (
        <ProductRail title="You may also like" products={related.slice(0, 4)}
          href={category ? `/collections/${category.slug}` : '/shop'} linkLabel={category ? `More ${category.name}` : 'See all objects'} />
      )}

      <AnimatePresence>
        {dock && !soldOut && (
          <motion.div initial={{ y: '110%' }} animate={{ y: 0 }} exit={{ y: '110%' }} transition={{ duration: 0.6, ease: EASE }}
            className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-4 border-t border-rule bg-paper px-5 py-3 lg:hidden">
            <img src={p.images[0]?.url} alt="" className="plate size-12 bg-ash object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[16px] text-ink">{p.name}</p>
              <p className="text-[13px] tabular-nums text-fog">{money(p.price)}</p>
            </div>
            <Button onClick={addToBag}>Add to bag</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
