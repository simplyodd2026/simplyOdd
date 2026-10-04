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
  const [more, setMore] = useState(false)
  const [shot, setShot] = useState(0)
  const [viewer, setViewer] = useState<number | null>(null)
  useDocumentTitle(data?.product.name)
  useEffect(() => { setQty(1); setShot(0); setMore(false) }, [slug])

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
  const hero = p.images[shot] ?? p.images[0]
  const paragraphs = (p.description || '').split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean)
  const addToBag = () => { add(p.id, qty); setCart(true) }
  const buyNow = () => { add(p.id, qty); navigate('/checkout') }

  const specs: [string, string][] = [
    ['Material', p.materials.join(', ') || '—'],
    ...(dims.some(Boolean) ? [['Dimension', `${dims.map((d) => d ?? '–').join(' × ')} cm`] as [string, string]] : []),
    ...(p.weight_g ? [['Weight', p.weight_g >= 1000 ? `${(p.weight_g / 1000).toFixed(2)} kg` : `${p.weight_g} g`] as [string, string]] : []),
    ['Made', 'To order, in our studio'],
  ]

  return (
    <>
      {/* The stage: a framed card with a capped width, like a print mounted on the page. */}
      <Container className="pt-4 sm:pt-6">
      <section className="relative isolate mx-auto max-w-[1440px] overflow-hidden rounded-[20px] bg-paper-2 shadow-[0_1px_0_rgba(26,26,26,0.04),0_30px_60px_-30px_rgba(42,20,20,0.18)] ring-1 ring-ink/5 sm:rounded-[28px] lg:min-h-[min(calc(100dvh-140px),860px)]">
        {/* A soft blush bloom behind the specs, like light falling across a plaster wall. */}
        <div aria-hidden className="pointer-events-none absolute -right-[10%] top-[8%] -z-10 h-[80%] w-[55%] rounded-full bg-pink/70 blur-[120px]" />

        <div className="grid gap-10 px-5 pt-6 sm:px-10 sm:pt-8 lg:min-h-[min(calc(100dvh-140px),860px)] lg:grid-cols-12 lg:items-center lg:gap-6 lg:px-14 lg:pb-32">
          <div className="lg:col-span-4 xl:col-start-1 xl:pl-[4%]">
            <nav className="label mb-8 flex flex-wrap gap-2 text-fog lg:mb-10" aria-label="Breadcrumb">
              <Link to="/shop" className="link-draw hover:text-ink">Shop</Link>
              {category && <><span aria-hidden>/</span><Link to={`/collections/${category.slug}`} className="link-draw hover:text-ink">{category.name}</Link></>}
              <span aria-hidden>/</span><span className="text-ink">{p.name}</span>
            </nav>

            <SplitReveal key={p.id} as="h1" on="load" delay={0.1}
              className="font-condensed text-[clamp(3.5rem,7.4vw,8rem)] uppercase leading-[0.98] text-ink text-balance">
              {p.name}
            </SplitReveal>

            <Reveal key={`${p.id}-body`} delay={0.3} y={20} className="mt-8 max-w-[24rem] sm:pl-1 lg:mt-10">
              {p.tagline && <p className="text-[15px] font-medium text-ink">{p.tagline}</p>}
              <div className="mt-6 space-y-5 text-[17px] leading-[1.6] text-graphite text-pretty">
                {paragraphs.map((t, i) => <p key={i}>{t}</p>)}
              </div>
              {p.rating.count > 0 && (
                <a href="#reviews" className="mt-6 inline-flex items-center gap-2 text-[13px] text-smoke hover:text-ink">
                  <Stars value={p.rating.average} className="text-ink" /> {p.rating.average.toFixed(1)} · {p.rating.count} {p.rating.count === 1 ? 'review' : 'reviews'}
                </a>
              )}
              <button type="button" onClick={() => setMore(!more)} aria-expanded={more} aria-controls="more-details"
                className="mt-10 flex items-center gap-1.5 text-[14px] font-medium text-ink">
                <span className="link-draw">{more ? 'Fewer details' : 'More details'}</span>
                <Icon name="chevronDown" size={14} className={cn('transition-transform duration-500 ease-[var(--ease-out-quint)]', more && 'rotate-180')} />
              </button>
            </Reveal>
          </div>

          {/* The piece itself, its photo feathered into the wall so it floats like a cut-out. */}
          <div className="relative flex flex-col items-center lg:col-span-4">
            <motion.button key={hero?.url} type="button" onClick={() => setViewer(shot)} aria-label={`Open image ${shot + 1} of ${p.images.length}`}
              initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              className="relative z-10 block w-full max-w-[30rem] cursor-zoom-in">
              {hero ? (
                <img src={hero.url} alt={hero.alt || p.name} draggable={false}
                  className="mx-auto aspect-[4/5] max-h-[min(64vh,600px)] w-full object-cover mix-blend-multiply [mask-image:radial-gradient(ellipse_closest-side_at_50%_50%,#000_70%,transparent_100%)]" />
              ) : <div className="aspect-[4/5] w-full bg-ash" />}
            </motion.button>
            {p.images.length > 1 && (
              <div className="mt-4 flex gap-2" role="tablist" aria-label="Product images">
                {p.images.map((img, i) => (
                  <button key={img.url} type="button" role="tab" aria-selected={i === shot} aria-label={`Show image ${i + 1}`} onClick={() => setShot(i)}
                    className={cn('size-12 overflow-hidden rounded-full border transition-[border-color,opacity] duration-300', i === shot ? 'border-ink' : 'border-transparent opacity-60 hover:opacity-100')}>
                    <img src={img.url} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <Reveal key={`${p.id}-specs`} delay={0.45} y={20} className="lg:col-span-3 lg:col-start-10 lg:self-center lg:pt-24">
            <dl className="border-b border-ink/70">
              {specs.map(([k, v]) => (
                <div key={k} className="border-t border-ink/70 py-5">
                  <dt className="text-[12px] font-medium text-fog">{k}</dt>
                  <dd className="mt-1 text-[15px] text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex items-center justify-between gap-4">
              <p className={cn('flex items-center gap-2.5 text-[13px]', soldOut ? 'text-fog' : p.availability === 'low_stock' ? 'text-accent' : 'text-graphite')}>
                <span className={cn('size-1.5 rounded-full', soldOut ? 'bg-fog' : 'animate-pulse-dot', p.availability === 'low_stock' ? 'bg-hot' : !soldOut && 'bg-sage')} />
                {soldOut ? 'Sold out' : p.availability === 'low_stock' ? `Only ${p.stock} left` : 'In stock, ships in 2–4 days'}
              </p>
              <WishlistButton productId={p.id} name={p.name} size={18}
                className="grid size-10 shrink-0 place-items-center rounded-full border border-ink/15 text-ink hover:border-ink" />
            </div>
          </Reveal>
        </div>

        {/* The purchase bar: a tan band anchored to the bottom right of the stage. */}
        <div ref={buyBox} className="relative mt-10 flex flex-wrap items-center gap-4 bg-tan px-5 py-4 sm:px-10 lg:absolute lg:bottom-0 lg:right-0 lg:mt-0 lg:w-[58%] lg:flex-nowrap lg:py-3 lg:pl-10 lg:pr-5">
          <div className="mr-auto flex items-baseline gap-3">
            <span className={cn('font-condensed text-[clamp(2.75rem,4vw,3.75rem)] font-light leading-none tabular-nums text-ink', p.compare_at_price && p.compare_at_price > p.price && 'text-accent')}>
              {money(p.price)}
            </span>
            {p.compare_at_price && p.compare_at_price > p.price && (
              <s className="font-mono text-sm text-ink/60" aria-label={`was ${money(p.compare_at_price)}`}>{money(p.compare_at_price)}</s>
            )}
            {p.discount_percent > 0 && <span className="rounded-full bg-accent px-2.5 py-1 text-[12px] font-medium text-paper">−{p.discount_percent}%</span>}
          </div>
          {!soldOut ? (
            <div className="flex w-full items-center gap-3 sm:w-auto">
              <div className="rounded-full bg-paper px-2 [&>div]:border-0"><QuantityStepper value={qty} onChange={setQty} max={p.stock} /></div>
              <Button size="lg" className="h-16 flex-1 px-12 sm:flex-none lg:px-16" onClick={addToBag}>Add to bag</Button>
            </div>
          ) : (
            <Button size="lg" className="h-16 w-full sm:w-auto" onClick={() => void toggleWish(p.id, p.name)}>
              <Icon name="heart" size={18} filled={saved} /> {saved ? 'Saved' : 'Save for when it’s back'}
            </Button>
          )}
        </div>
      </section>
      </Container>

      <div id="more-details" className={cn('grid transition-[grid-template-rows] duration-700 ease-[var(--ease-out-quint)]', more ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="min-h-0 overflow-hidden">
          <Container><div className="mx-auto grid max-w-[1440px] gap-x-16 pt-10 lg:grid-cols-2">
            <div>
              <Accordion title="Description" defaultOpen><p className="text-pretty">{p.description}</p></Accordion>
              <Accordion title="How it's made"><p>{p.manufacturing || 'Designed and printed in our studio.'}</p></Accordion>
            </div>
            <div>
              <Accordion title="Shipping and returns" defaultOpen>
                <p>Standard delivery takes 5–8 business days and is complimentary over {money(config?.free_shipping_threshold ?? 1999)}. Express takes 2–3 business days.
                  Unused pieces can be returned within 14 days; anything damaged in transit is remade at no cost.{' '}
                  <Link to="/help/shipping" className="link-draw text-ink">Details</Link></p>
              </Accordion>
              <ul className="grid grid-cols-3 gap-2 border-b border-rule py-5 text-center">
                {[['Made', 'to order'], ['Free shipping', `over ${money(config?.free_shipping_threshold ?? 1999)}`], ['Returns', 'within 14 days']].map(([a, b]) => (
                  <li key={a}><p className="label text-ink">{a}</p><p className="mt-1 text-[12px] text-fog">{b}</p></li>
                ))}
              </ul>
              {!soldOut && <Button size="lg" variant="outline" className="mt-6 w-full" onClick={buyNow}>Buy now · {money(p.price * qty)}</Button>}
            </div>
          </div></Container>
        </div>
      </div>

      <Viewer images={p.images} name={p.name} index={viewer} onChange={setViewer} />

      <Container className="mt-28"><div className="mx-auto max-w-[1440px]">
        <BoughtTogether key={p.id} product={p} others={frequently_bought} />
        <Reviews product={p} />
      </div></Container>

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
