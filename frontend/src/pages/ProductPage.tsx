import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useProduct, useConfig } from '@/lib/queries'
import { useCart } from '@/stores/cart'
import { useUi } from '@/stores/ui'
import { useWishlist } from '@/stores/wishlist'
import { useDocumentTitle } from '@/lib/hooks'
import { money } from '@/lib/format'
import { Container } from '@/components/layout/Container'
import { Gallery } from '@/components/product/Gallery'
import { Price } from '@/components/product/Price'
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
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import NotFoundPage from './NotFoundPage'

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
  const [dock, setDock] = useState(false)
  useDocumentTitle(data?.product.name)
  useEffect(() => { setQty(1) }, [slug])

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
        <Skeleton className="aspect-[4/5] lg:col-span-7" />
        <div className="flex flex-col gap-4 lg:col-span-4 lg:col-start-9"><Skeleton className="h-24" /><Skeleton className="h-10 w-1/3" /><Skeleton className="h-48" /></div>
      </Container>
    )
  }

  const { product: p, category, related, frequently_bought } = data
  const soldOut = p.availability === 'out_of_stock'
  const dims = [p.dimensions.width_cm, p.dimensions.height_cm, p.dimensions.depth_cm]
  const addToBag = () => { add(p.id, qty); setCart(true) }
  const buyNow = () => { add(p.id, qty); navigate('/checkout') }

  const specs: [string, string][] = [
    ['Material', p.materials.join(', ') || '—'],
    ...(dims.some(Boolean) ? [['Dimensions', `${dims.map((d) => d ?? '–').join(' × ')} cm`] as [string, string]] : []),
    ...(p.weight_g ? [['Weight', p.weight_g >= 1000 ? `${(p.weight_g / 1000).toFixed(2)} kg` : `${p.weight_g} g`] as [string, string]] : []),
    ['Made', 'To order, in our studio'],
  ]

  return (
    <>
      <Container className="pt-6 sm:pt-10">
        <nav className="label mb-8 flex flex-wrap gap-2 text-fog" aria-label="Breadcrumb">
          <Link to="/shop" className="link-draw hover:text-ink">Shop</Link>
          {category && <><span aria-hidden>/</span><Link to={`/collections/${category.slug}`} className="link-draw hover:text-ink">{category.name}</Link></>}
          <span aria-hidden>/</span><span className="text-ink">{p.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7"><Gallery images={p.images} name={p.name} /></div>

          <div className="lg:col-span-4 lg:col-start-9">
            <div className="lg:sticky lg:top-28">
              <div className="flex items-start justify-between gap-4">
                <SplitReveal key={p.id} as="h1" on="load" delay={0.1} className="font-display text-[clamp(2.8rem,4.6vw,4.75rem)] leading-[0.95] text-ink">
                  {p.name}
                </SplitReveal>
                <WishlistButton productId={p.id} name={p.name} size={20}
                  className="mt-2 grid size-11 shrink-0 place-items-center rounded-full border border-ink/15 text-ink hover:border-ink" />
              </div>

              <Reveal key={`${p.id}-body`} delay={0.25} y={20}>
                {p.tagline && <p className="mt-4 font-serif text-xl italic text-smoke">{p.tagline}</p>}
                {p.rating.count > 0 && (
                  <a href="#reviews" className="mt-4 inline-flex items-center gap-2 text-[13px] text-smoke hover:text-ink">
                    <Stars value={p.rating.average} className="text-ink" /> {p.rating.average.toFixed(1)} · {p.rating.count} {p.rating.count === 1 ? 'review' : 'reviews'}
                  </a>
                )}

                <div className="mt-8 flex flex-wrap items-baseline gap-3 border-t border-rule pt-6">
                  <Price price={p.price} compareAt={p.compare_at_price} size="lg" />
                  {p.discount_percent > 0 && <span className="label rounded-full bg-hot px-2.5 py-1 text-paper">Save {p.discount_percent}%</span>}
                </div>
                <p className="mt-1 text-[13px] text-fog">Inclusive of GST. Shipping calculated at checkout.</p>

                <p className={cn('mt-6 flex items-center gap-2.5 text-[14px]', soldOut ? 'text-fog' : p.availability === 'low_stock' ? 'text-accent' : 'text-graphite')}>
                  <span className={cn('size-1.5 rounded-full', soldOut ? 'bg-fog' : 'animate-pulse-dot', p.availability === 'low_stock' ? 'bg-hot' : !soldOut && 'bg-sage')} />
                  {soldOut ? 'Sold out. A new batch is in production.'
                    : p.availability === 'low_stock' ? `Only ${p.stock} left in this batch` : 'In stock · dispatched in 2–4 days'}
                </p>

                <div ref={buyBox}>
                  {!soldOut ? (
                    <div className="mt-6 flex flex-col gap-3">
                      <div className="flex gap-3">
                        <QuantityStepper value={qty} onChange={setQty} max={p.stock} />
                        <Button size="lg" className="flex-1" onClick={addToBag}>Add to bag · {money(p.price * qty)}</Button>
                      </div>
                      <Button size="lg" variant="outline" onClick={buyNow}>Buy now</Button>
                    </div>
                  ) : (
                    <Button size="lg" variant="outline" className="mt-6 w-full" onClick={() => void toggleWish(p.id, p.name)}>
                      <Icon name="heart" size={18} filled={saved} /> {saved ? 'Saved' : 'Save for when it’s back'}
                    </Button>
                  )}
                </div>

                <ul className="mt-6 grid grid-cols-3 gap-2 border-y border-rule py-4 text-center">
                  {[['Made', 'to order'], ['Free shipping', `over ${money(config?.free_shipping_threshold ?? 1999)}`], ['Returns', 'within 14 days']].map(([a, b]) => (
                    <li key={a}><p className="label text-ink">{a}</p><p className="mt-1 text-[12px] text-fog">{b}</p></li>
                  ))}
                </ul>

                <div className="mt-2">
                  <Accordion title="Description" defaultOpen><p className="text-pretty">{p.description}</p></Accordion>
                  <Accordion title="Specifications">
                    <dl className="grid grid-cols-[7rem_1fr] gap-y-2.5">
                      {specs.map(([k, v]) => <div key={k} className="contents"><dt className="label pt-0.5 text-fog">{k}</dt><dd className="tabular-nums text-ink">{v}</dd></div>)}
                    </dl>
                  </Accordion>
                  <Accordion title="How it's made"><p>{p.manufacturing || 'Designed and printed in our studio.'}</p></Accordion>
                  <Accordion title="Shipping and returns">
                    <p>Standard delivery takes 5–8 business days and is complimentary over {money(config?.free_shipping_threshold ?? 1999)}. Express takes 2–3 business days.
                      Unused pieces can be returned within 14 days; anything damaged in transit is remade at no cost.{' '}
                      <Link to="/help/shipping" className="link-draw text-ink">Details</Link></p>
                  </Accordion>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </Container>

      <Container className="mt-28">
        <BoughtTogether key={p.id} product={p} others={frequently_bought} />
        <Reviews product={p} />
      </Container>

      {related.length > 0 && (
        <ProductRail title="You may also like" kicker="Related pieces" products={related.slice(0, 4)}
          href={category ? `/collections/${category.slug}` : '/shop'} linkLabel={category ? `More ${category.name}` : 'Shop all'} />
      )}

      <AnimatePresence>
        {dock && !soldOut && (
          <motion.div initial={{ y: '110%' }} animate={{ y: 0 }} exit={{ y: '110%' }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-4 border-t border-rule bg-paper px-5 py-3 lg:hidden">
            <img src={p.images[0]?.url} alt="" className="size-12 bg-ash object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] text-ink">{p.name}</p>
              <p className="font-mono text-[12px] text-fog">{money(p.price)}</p>
            </div>
            <Button onClick={addToBag}>Add to bag</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
