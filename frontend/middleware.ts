// Vercel Edge Middleware: crawlers and link-preview bots (Googlebot, Bingbot, WhatsApp, Slack, …) get
// index.html with the page's real content already in it: title, description, canonical link, Open Graph
// tags, JSON-LD, and the product details and links as plain HTML inside #root. React replaces that
// markup as soon as it starts, and the same tags are set in the browser by src/lib/useSeo.ts, so people
// and crawlers see the same thing.
//
// Real browsers pass straight through untouched, so shoppers never wait on the API here (it scales to
// zero, and a cold start would hold up the first paint). Only public catalogue endpoints are called.

import {
  SITE_NAME, SITE_URL, breadcrumbs, collectionJsonLd, collectionMeta, ldJson, productJsonLd,
  productMeta, rupees, type PageMeta,
} from './src/lib/seo'
import type { Category, Page, Product, ProductDetail } from './src/lib/types'

export const config = { matcher: ['/', '/shop', '/collections', '/collections/:slug', '/product/:slug'] }

// Vercel's edge runtime provides process.env; this project doesn't ship Node types.
declare const process: { env: Record<string, string | undefined> }

const API = (process.env.VITE_API_URL || 'https://simplyodd-api-18861122418.asia-south1.run.app').replace(/\/$/, '')

const BOTS =
  /bot|crawler|spider|preview|inspectiontool|googleother|mediapartners|yandex|facebookexternalhit|facebookcatalog|whatsapp|telegram|slack|discord|linkedin|pinterest|skype|embedly|vkshare|redditbot|applebot|quora/i

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Product photos are multi-MB PNGs, which WhatsApp won't show; previews get a small JPEG instead.
const thumb = (url: string) =>
  `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1200&h=630&fit=contain&cbg=F3EDE4&output=jpg&q=80`

class Missing extends Error {}

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${API}/api${path}`, { signal: AbortSignal.timeout(8000) })
  if (res.status === 404) throw new Missing()
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json() as Promise<T>
}

/** Every published product matching `query`, across pages (the API caps a page at 100). */
async function allProducts(query = ''): Promise<Product[]> {
  const out: Product[] = []
  for (let page = 1; page <= 20; page++) {
    const res = await api<Page<Product>>(`/products?page_size=100&sort=popular&page=${page}${query}`)
    out.push(...res.items)
    if (page >= res.pages) break
  }
  return out
}

// ------------------------------------------------------------------ HTML pieces

const link = (href: string, text: string) => `<a href="${esc(href)}">${esc(text)}</a>`
const productHref = (p: Product) => `/product/${encodeURIComponent(p.slug)}`

function productList(title: string, products: Product[]) {
  if (!products.length) return ''
  const items = products.map((p) => `<li>${link(productHref(p), p.name)} ${esc(rupees(p.price))}</li>`).join('')
  return `<section><h2>${esc(title)}</h2><ul>${items}</ul></section>`
}

function categoryList(title: string, categories: Category[]) {
  const items = categories.filter((c) => c.product_count > 0)
    .map((c) => `<li>${link(`/collections/${encodeURIComponent(c.slug)}`, c.name)}</li>`).join('')
  return items ? `<nav aria-label="${esc(title)}"><h2>${esc(title)}</h2><ul>${items}</ul></nav>` : ''
}

const SITE_LINKS = `<nav aria-label="Site"><ul>${[
  ['/shop', 'Shop all'], ['/new', 'New arrivals'], ['/bestsellers', 'Best sellers'], ['/collections', 'Collections'],
  ['/customise', 'Customise'], ['/about', 'About us'], ['/help/shipping', 'Shipping'], ['/help/returns', 'Returns'],
  ['/help/faq', 'Questions'],
].map(([href, text]) => `<li>${link(href, text)}</li>`).join('')}</ul></nav>`

const paragraphs = (text: string) =>
  text.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean).map((t) => `<p>${esc(t)}</p>`).join('')

function productBody({ product: p, category, related, frequently_bought }: ProductDetail) {
  const crumbs = breadcrumbs(p, category).map((c, i, all) =>
    `<li>${i === all.length - 1 ? esc(c.name) : link(c.url.replace(SITE_URL, '') || '/', c.name)}</li>`).join('')
  const price = p.variants?.length
    ? `<ul>${p.variants.map((v) => `<li>${esc(v.label)}: ${esc(rupees(v.price))}</li>`).join('')}</ul>`
    : `<p>Price: ${esc(rupees(p.price))}${p.compare_at_price && p.compare_at_price > p.price ? ` <s>${esc(rupees(p.compare_at_price))}</s>` : ''}</p>`
  const images = p.images.filter((i) => i.url)
    .map((i) => `<img src="${esc(i.url)}" alt="${esc(i.alt || p.name)}" loading="lazy" />`).join('')
  const d = p.dimensions || {}
  const size = [d.width_cm, d.height_cm, d.depth_cm].every((n) => n) ? `${d.width_cm} × ${d.height_cm} × ${d.depth_cm} cm` : ''
  const details = [
    p.materials?.length && `Materials: ${p.materials.join(', ')}`,
    size && `Size: ${size}`,
    p.weight_g && `Weight: ${p.weight_g} g`,
    p.manufacturing && p.manufacturing,
  ].filter(Boolean).map((t) => `<li>${esc(String(t))}</li>`).join('')
  const rating = p.rating?.count > 0
    ? `<p>Rated ${p.rating.average.toFixed(1)} out of 5 from ${p.rating.count} verified ${p.rating.count === 1 ? 'review' : 'reviews'}.</p>` : ''
  return `<main>
<nav aria-label="Breadcrumb"><ol>${crumbs}</ol></nav>
<article>
<h1>${esc(p.name)}</h1>
${p.tagline ? `<p>${esc(p.tagline)}</p>` : ''}
${price}
<p>Availability: in stock, made to order.</p>
${rating}
${images}
${paragraphs(p.description || '')}
${details ? `<h2>Details</h2><ul>${details}</ul>` : ''}
${category ? `<p>From the ${link(`/collections/${encodeURIComponent(category.slug)}`, category.name)} collection.</p>` : ''}
</article>
${productList('Frequently bought together', frequently_bought)}
${productList('You may also like', related)}
${SITE_LINKS}
</main>`
}

// ------------------------------------------------------------------ pages

interface Rendered { meta?: PageMeta; jsonLd?: unknown; body: string }

async function renderProduct(slug: string): Promise<Rendered> {
  const detail = await api<ProductDetail>(`/products/${encodeURIComponent(slug)}`)
  return { meta: productMeta(detail.product), jsonLd: productJsonLd(detail.product, detail.category), body: productBody(detail) }
}

async function renderCollection(slug: string): Promise<Rendered> {
  const category = await api<Category>(`/categories/${encodeURIComponent(slug)}`)
  const products = await allProducts(`&category=${encodeURIComponent(category.slug)}`)
  const body = `<main>
<nav aria-label="Breadcrumb"><ol><li>${link('/', 'Home')}</li><li>${link('/collections', 'Collections')}</li><li>${esc(category.name)}</li></ol></nav>
<h1>${esc(category.name)}</h1>
${category.description ? `<p>${esc(category.description)}</p>` : ''}
${productList(`${category.name}: every piece`, products)}
${SITE_LINKS}
</main>`
  return { meta: collectionMeta(category), jsonLd: collectionJsonLd(category), body }
}

async function renderListing(path: string): Promise<Rendered> {
  if (path === '/shop') {
    const [products, categories] = await Promise.all([allProducts(), api<Category[]>('/categories')])
    return {
      meta: { title: `The shop | ${SITE_NAME}`, description: 'Every object Simply Odd currently makes, from lighting to desk pieces. Each is designed in-house, 3D-printed to order and finished by hand.', canonical: `${SITE_URL}/shop`, type: 'website' },
      body: `<main><h1>The shop</h1>${categoryList('Collections', categories)}${productList('Every piece', products)}${SITE_LINKS}</main>`,
    }
  }
  const categories = await api<Category[]>('/categories')
  if (path === '/collections') {
    return {
      meta: { title: `Collections | ${SITE_NAME}`, description: 'Browse Simply Odd by collection: odd, beautiful objects for the home and desk, designed in-house and made in small batches.', canonical: `${SITE_URL}/collections`, type: 'website' },
      body: `<main><h1>Collections</h1>${categoryList('Collections', categories)}${SITE_LINKS}</main>`,
    }
  }
  // Homepage: index.html's own title and description stay; it gains a canonical link and its links in HTML.
  return {
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'Organization', '@id': `${SITE_URL}/#org`, name: SITE_NAME, url: `${SITE_URL}/`, logo: `${SITE_URL}/logo.png`, sameAs: ['https://www.instagram.com/simply__odd/'] },
        { '@type': 'WebSite', '@id': `${SITE_URL}/#site`, name: SITE_NAME, url: `${SITE_URL}/`, publisher: { '@id': `${SITE_URL}/#org` } },
      ],
    },
    body: `<main><h1>${SITE_NAME}</h1><p>Strange, beautiful objects for the home and desk, designed in-house and made in small batches.</p>${categoryList('Shop by collection', categories)}${SITE_LINKS}</main>`,
  }
}

function headTags(meta: PageMeta | undefined, jsonLd: unknown, canonical: string) {
  const tags = [`<link rel="canonical" href="${esc(meta?.canonical ?? canonical)}" />`]
  if (meta) {
    const image = meta.image
    tags.push(
      `<meta property="og:type" content="${meta.type}" />`,
      `<meta property="og:site_name" content="${SITE_NAME}" />`,
      `<meta property="og:title" content="${esc(meta.title)}" />`,
      `<meta property="og:description" content="${esc(meta.description)}" />`,
      `<meta property="og:url" content="${esc(meta.canonical)}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      ...(image
        ? [
            `<meta property="og:image" content="${esc(thumb(image))}" />`,
            `<meta property="og:image:width" content="1200" />`,
            `<meta property="og:image:height" content="630" />`,
            `<meta property="og:image:alt" content="${esc(meta.imageAlt || meta.title)}" />`,
          ]
        : []),
      ...(meta.type === 'product' && meta.price !== undefined
        ? [`<meta property="product:price:amount" content="${meta.price.toFixed(2)}" />`, `<meta property="product:price:currency" content="INR" />`]
        : []),
    )
  }
  if (jsonLd) tags.push(`<script type="application/ld+json" data-seo>${ldJson(jsonLd)}</script>`)
  return tags.join('\n    ')
}

export default async function middleware(request: Request) {
  if (!BOTS.test(request.headers.get('user-agent') ?? '')) return

  const url = new URL(request.url)
  const [, section = '', raw = ''] = url.pathname.split('/')
  const slug = decodeURIComponent(raw)

  try {
    const pagePromise = fetch(new URL('/index.html', url))
    let rendered: Rendered | null = null
    let status = 200
    try {
      rendered = section === 'product' ? await renderProduct(slug)
        : section === 'collections' && slug ? await renderCollection(slug)
        : await renderListing(url.pathname.replace(/\/$/, '') || '/')
    } catch (e) {
      if (!(e instanceof Missing)) throw e
      status = 404 // unpublished, deleted or never existed: tell crawlers so instead of a soft 404
    }
    const pageRes = await pagePromise
    if (!pageRes.ok) return
    let html = await pageRes.text()

    if (!rendered) {
      html = html.replace(/<title>[^<]*<\/title>/, `<title>Not found | ${SITE_NAME}</title>\n    <meta name="robots" content="noindex" />`)
      return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=60' } })
    }

    const { meta, jsonLd, body } = rendered
    const canonical = `${SITE_URL}${url.pathname === '/' ? '/' : url.pathname.replace(/\/$/, '')}`
    if (meta) {
      html = html
        .replace(/\s*<meta (property|name)="(og|twitter):[^>]*>/g, '')
        .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(meta.description)}" />`)
        .replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`)
    }
    html = html
      .replace(/<\/title>/, `</title>\n    ${headTags(meta, jsonLd, canonical)}`)
      .replace('<div id="root"></div>', `<div id="root">${body}</div>`)

    return new Response(html, {
      status,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=600' },
    })
  } catch {
    return // API down or slow: fall back to the plain app rather than fail the request
  }
}
