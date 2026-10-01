import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useProduct, useConfig } from '@/lib/queries'
import { useCart } from '@/stores/cart'
import { useUi } from '@/stores/ui'
import { useWishlist } from '@/stores/wishlist'
import { useDocumentTitle } from '@/lib/hooks'
import { money } from '@/lib/format'
import { Container, SectionHeading } from '@/components/layout/Container'
import { Gallery } from '@/components/product/Gallery'
import { Price } from '@/components/product/Price'
import { QuantityStepper } from '@/components/product/QuantityStepper'
import { WishlistButton } from '@/components/product/WishlistButton'
import { ProductCard } from '@/components/product/ProductCard'
import { Button } from '@/components/ui/Button'
import { Stars, Skeleton } from '@/components/ui/misc'
import { Icon } from '@/components/ui/Icon'
import { Reviews } from '@/features/product/Reviews'
import { BoughtTogether } from '@/features/product/BoughtTogether'
import { ApiError } from '@/lib/api'
import NotFoundPage from './NotFoundPage'

function Section({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="group border-b border-rule" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[17px] font-medium [&::-webkit-details-marker]:hidden">
        {title}
        <Icon name="plus" size={18} className="text-fog transition-transform group-open:rotate-45" />
      </summary>
      <div className="pb-6 leading-relaxed text-smoke">{children}</div>
    </details>
  )
}

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
  useDocumentTitle(data?.product.name)

  if (error instanceof ApiError && error.status === 404) return <NotFoundPage />
  if (isLoading || !data) {
    return (
      <Container className="grid gap-10 pt-8 lg:grid-cols-12">
        <Skeleton className="aspect-[4/5] lg:col-span-7" />
        <div className="flex flex-col gap-4 lg:col-span-5"><Skeleton className="h-16" /><Skeleton className="h-8 w-1/3" /><Skeleton className="h-40" /></div>
      </Container>
    )
  }

  const { product: p, category, related, frequently_bought } = data
  const soldOut = p.availability === 'out_of_stock'
  const dims = [p.dimensions.width_cm, p.dimensions.height_cm, p.dimensions.depth_cm]

  const addToBag = () => {
    add(p.id, qty)
    setCart(true)
  }
  const buyNow = () => {
    add(p.id, qty)
    navigate('/checkout')
  }

  return (
    <>
      <Container className="pt-6 sm:pt-8">
        <nav className="mb-6 flex gap-2 text-sm text-fog" aria-label="Breadcrumb">
          <Link to="/shop" className="hover:text-ink">Shop</Link>
          {category && <><span aria-hidden>/</span><Link to={`/collections/${category.slug}`} className="hover:text-ink">{category.name}</Link></>}
        </nav>

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7"><Gallery images={p.images} name={p.name} /></div>

          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-5xl font-display leading-[0.95] text-balance sm:text-6xl">{p.name}</h1>
                <WishlistButton productId={p.id} name={p.name} size={24}
                  className="grid size-12 shrink-0 place-items-center border border-rule text-graphite hover:border-accent" />
              </div>
              {p.tagline && <p className="mt-3 font-serif text-2xl italic text-smoke">{p.tagline}</p>}
              {p.rating.count > 0 && (
                <a href="#reviews" className="mt-4 inline-flex items-center gap-2 text-sm text-smoke hover:text-ink">
                  <Stars value={p.rating.average} className="text-accent" /> {p.rating.average.toFixed(1)} from {p.rating.count} {p.rating.count === 1 ? 'review' : 'reviews'}
                </a>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-rule pt-6">
                <Price price={p.price} compareAt={p.compare_at_price} size="lg" />
                {p.discount_percent > 0 && <span className="bg-accent px-2 py-0.5 text-sm font-semibold text-paper">Save {p.discount_percent}%</span>}
              </div>
              <p className="mt-1 text-sm text-fog">Including GST. Shipping calculated at checkout.</p>

              <p className={`mt-5 flex items-center gap-2 text-[15px] ${soldOut ? 'text-fog' : p.availability === 'low_stock' ? 'text-accent' : 'text-graphite'}`}>
                <span className={`size-2 rounded-full ${soldOut ? 'bg-fog' : p.availability === 'low_stock' ? 'bg-accent' : 'bg-graphite'}`} />
                {soldOut ? 'Sold out. We print more in small batches, so check back soon.'
                  : p.availability === 'low_stock' ? `Only ${p.stock} left in this batch` : 'In stock, ships in 2–4 days'}
              </p>

              {!soldOut && (
                <div className="mt-6 flex flex-col gap-3">
                  <div className="flex gap-3">
                    <QuantityStepper value={qty} onChange={setQty} max={p.stock} />
                    <Button size="lg" className="flex-1" onClick={addToBag}>Add to bag</Button>
                  </div>
                  <Button size="lg" variant="light" onClick={buyNow}>Buy now</Button>
                </div>
              )}
              {soldOut && (
                <Button size="lg" variant="outline" className="mt-6 w-full" onClick={() => void toggleWish(p.id, p.name)}>
                  <Icon name="heart" size={18} filled={saved} /> {saved ? 'Saved to your wishlist' : 'Save for when it’s back'}
                </Button>
              )}

              <div className="mt-8 border-t border-rule">
                <Section title="About this piece" open>
                  <p className="text-pretty">{p.description}</p>
                </Section>
                <Section title="Materials and size">
                  <dl className="grid grid-cols-[8rem_1fr] gap-y-2">
                    <dt className="text-fog">Materials</dt><dd>{p.materials.join(', ') || '—'}</dd>
                    {dims.some(Boolean) && <><dt className="text-fog">Dimensions</dt><dd className="tabular-nums">{dims.map((d) => d ?? '–').join(' × ')} cm (W × H × D)</dd></>}
                    {p.weight_g && <><dt className="text-fog">Weight</dt><dd className="tabular-nums">{p.weight_g >= 1000 ? `${(p.weight_g / 1000).toFixed(2)} kg` : `${p.weight_g} g`}</dd></>}
                  </dl>
                </Section>
                <Section title="How it's made"><p>{p.manufacturing || 'Designed and printed in our studio.'}</p></Section>
                <Section title="Shipping">
                  <p>Standard delivery takes 5–8 business days and is free on orders over {money(config?.free_shipping_threshold ?? 1999)}. Express delivery takes 2–3 business days.
                    Every piece is packed in recycled paper pulp. <Link to="/help/shipping" className="text-ink underline underline-offset-4">Shipping details</Link></p>
                </Section>
                <Section title="Returns">
                  <p>Return unused pieces within 14 days of delivery for a full refund. If something arrives damaged, send us a photo and we'll reprint it.
                    {' '}<Link to="/help/returns" className="text-ink underline underline-offset-4">Returns policy</Link></p>
                </Section>
              </div>
            </div>
          </div>
        </div>
      </Container>

      <Container className="mt-20">
        <BoughtTogether key={p.id} product={p} others={frequently_bought} />
        <Reviews product={p} />
      </Container>

      {related.length > 0 && (
        <Container className="mt-24">
          <SectionHeading title="You might also like" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {related.map((r) => <ProductCard key={r.id} product={r} />)}
          </div>
        </Container>
      )}
    </>
  )
}
