// Search metadata built from real catalogue data. Shared by the React app (lib/useSeo.ts sets these
// tags in the browser) and the Vercel edge middleware (middleware.ts writes them into the HTML that
// crawlers receive), so both always say the same thing. Keep it free of browser APIs and `@/` imports:
// the middleware bundles it on its own.
import type { Category, Product } from './types'

export const SITE_URL = 'https://simplyodd.in'
export const SITE_NAME = 'Simply Odd'
export const BRAND = 'Simply Odd'
export const CURRENCY = 'INR'

export const productUrl = (slug: string) => `${SITE_URL}/product/${encodeURIComponent(slug)}`
export const collectionUrl = (slug: string) => `${SITE_URL}/collections/${encodeURIComponent(slug)}`

const squash = (s: string) => s.replace(/\s+/g, ' ').trim()

/** Cuts at a word boundary so a snippet never ends mid-word. */
export function clip(text: string, max = 160): string {
  const t = squash(text)
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.–—-]+$/, '')}…`
}

export const rupees = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`

/** Every distinct photo URL, in the order the shop shows them. */
export const productImages = (p: Product) => [...new Set(p.images.map((i) => i.url).filter(Boolean))]

/** Lowest and highest price across the piece's versions (just `price` when it has none). */
function priceRange(p: Product): [number, number] {
  const prices = p.variants?.length ? p.variants.map((v) => v.price) : [p.price]
  return [Math.min(...prices), Math.max(...prices)]
}

export interface PageMeta {
  title: string
  description: string
  canonical: string
  image?: string
  imageAlt?: string
  type: 'product' | 'website'
  price?: number
}

export function productMeta(p: Product): PageMeta {
  const [low, high] = priceRange(p)
  const price = low === high ? rupees(low) : `From ${rupees(low)}`
  const sentence = (t: string) => { const s = t.replace(/[.!?…\s]*$/, ''); return s ? `${s}.` : '' }
  const firstLine = squash(p.description || '').split(/(?<=[.!?])\s/)[0] || ''
  const lead = [sentence(squash(p.tagline || '')), sentence(firstLine)].filter((t, i, all) => t && all.indexOf(t) === i).join(' ')
  const body = lead || `${p.name}, designed and 3D-printed in small batches.`
  const tail = ` ${price}. Made to order by ${SITE_NAME}.`
  return {
    title: `${p.name} | ${SITE_NAME}`,
    description: `${clip(body, 160 - tail.length)}${tail}`,
    canonical: productUrl(p.slug),
    image: productImages(p)[0],
    imageAlt: p.images[0]?.alt || p.name,
    type: 'product',
    price: low,
  }
}

export function collectionMeta(c: Category): PageMeta {
  const fallback = `Shop ${c.name.toLowerCase()} from ${SITE_NAME}: odd, beautiful objects designed in-house and 3D-printed to order.`
  return {
    title: `${c.name} | ${SITE_NAME}`,
    description: clip(c.description ? `${squash(c.description)} ${c.product_count} pieces, made to order.` : fallback),
    canonical: collectionUrl(c.slug),
    image: c.image || undefined,
    imageAlt: c.name,
    type: 'website',
  }
}

type Crumb = { name: string; url: string }

export function breadcrumbs(p: Product, category: Category | null): Crumb[] {
  return [
    { name: 'Home', url: `${SITE_URL}/` },
    { name: 'Shop', url: `${SITE_URL}/shop` },
    ...(category ? [{ name: category.name, url: collectionUrl(category.slug) }] : []),
    { name: p.name, url: productUrl(p.slug) },
  ]
}

const breadcrumbLd = (crumbs: Crumb[]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
})

/** schema.org Product + BreadcrumbList, from the product as the API returns it. */
export function productJsonLd(p: Product, category: Category | null) {
  const url = productUrl(p.slug)
  // Every published piece is made to order and can be bought in any quantity (no stock is tracked).
  const offer = (price: number, name?: string) => ({
    '@type': 'Offer',
    ...(name ? { name } : {}),
    price: price.toFixed(2),
    priceCurrency: CURRENCY,
    availability: 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
    url,
    seller: { '@type': 'Organization', name: BRAND },
  })
  const offers = p.variants?.length
    ? p.variants.map((v) => offer(v.price, v.label))
    : offer(p.price)
  const description = squash([p.tagline, p.description].filter(Boolean).join('. ')) || p.name
  const product: Record<string, unknown> = {
    '@type': 'Product',
    '@id': `${url}#product`,
    name: p.name,
    description: clip(description, 5000),
    image: productImages(p),
    sku: p.id,
    url,
    brand: { '@type': 'Brand', name: BRAND },
    ...(category ? { category: category.name } : {}),
    ...(p.materials?.length ? { material: p.materials.join(', ') } : {}),
    offers,
  }
  // Only real ratings from verified buyers, and only when there are some.
  if (p.rating?.count > 0) {
    product.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(p.rating.average.toFixed(1)),
      reviewCount: p.rating.count,
      bestRating: 5,
      worstRating: 1,
    }
  }
  return { '@context': 'https://schema.org', '@graph': [product, breadcrumbLd(breadcrumbs(p, category))] }
}

export function collectionJsonLd(c: Category) {
  return {
    '@context': 'https://schema.org',
    ...breadcrumbLd([
      { name: 'Home', url: `${SITE_URL}/` },
      { name: 'Collections', url: `${SITE_URL}/collections` },
      { name: c.name, url: collectionUrl(c.slug) },
    ]),
  }
}

/** JSON for a <script type="application/ld+json"> block: `<` is escaped so text can't close the tag. */
export const ldJson = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')
