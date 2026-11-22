// Prerenders every published product page at build time (run by `npm run build`, after the client and
// server bundles). For each product it renders the real app (src/entry-server.tsx) with live catalogue
// data from the public API, writes dist/product/<slug>/index.html with the page's own title,
// description, canonical link, Open Graph tags and Product JSON-LD, and embeds the data the page was
// rendered with so the browser hydrates it instead of starting from scratch.
//
// Also writes dist/sitemap.xml (from the API's sitemap, limited to products that were built) and
// dist/404.html. Data comes only from public, published-only endpoints: no credentials are involved.
//
// If the API can't be reached the build fails, and Vercel keeps serving the previous deployment.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const API = (process.env.VITE_API_URL || '').replace(/\/$/, '')
if (!/^https?:\/\//.test(API)) {
  // On Vercel this is a misconfiguration; locally (VITE_API_URL empty, Vite proxies /api) it just means no prerendering.
  if (process.env.VERCEL) {
    console.error('[prerender] VITE_API_URL must be the API\'s absolute URL (set it in the Vercel project settings).')
    process.exit(1)
  }
  console.warn('[prerender] VITE_API_URL is not an absolute URL; skipping prerendering (fine for local builds).')
  process.exit(0)
}

const { render, productMeta, productJsonLd, ldJson, SITE_URL } = await import(join(root, 'dist-ssr/entry-server.js'))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** GET with retries: the API scales to zero, so the first call after a quiet spell can be slow. */
async function get(path, as = 'json') {
  let last
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(30_000) })
      if (res.ok) return as === 'json' ? res.json() : res.text()
      last = new Error(`${res.status} ${res.statusText}`)
      if (res.status < 500) break
    } catch (e) { last = e }
    await sleep(attempt * 2000)
  }
  throw new Error(`[prerender] GET ${path} failed: ${last?.message ?? last}`)
}

async function publishedProducts() {
  const all = []
  for (let page = 1; ; page++) {
    const res = await get(`/api/products?page_size=100&sort=newest&page=${page}`)
    all.push(...res.items)
    if (page >= res.pages) break
  }
  return all
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// Product photos are multi-MB PNGs, which WhatsApp won't show; link previews get a small JPEG instead.
const ogImage = (url) =>
  `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1200&h=630&fit=contain&cbg=F3EDE4&output=jpg&q=80`

function page(template, { html, state, detail }) {
  const meta = productMeta(detail.product)
  const head = [
    `<link rel="canonical" href="${esc(meta.canonical)}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    `<meta property="og:type" content="product" />`,
    `<meta property="og:site_name" content="Simply Odd" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${esc(meta.canonical)}" />`,
    ...(meta.image
      ? [
          `<meta property="og:image" content="${esc(ogImage(meta.image))}" />`,
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
          `<meta property="og:image:alt" content="${esc(meta.imageAlt)}" />`,
        ]
      : []),
    `<meta property="product:price:amount" content="${meta.price.toFixed(2)}" />`,
    `<meta property="product:price:currency" content="INR" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<script type="application/ld+json" data-seo>${ldJson(productJsonLd(detail.product, detail.category))}</script>`,
  ].join('\n    ')

  return template
    .replace(/\s*<meta (property|name)="(og|twitter):[^>]*>/g, '')
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(meta.description)}" />`)
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>\n    ${head}`)
    // The data the HTML was rendered with; main.tsx hydrates from it. `<` is escaped so text can't end the script.
    .replace('</head>', `  <script>window.__PRERENDER_STATE__=${ldJson(state)}</script>\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`)
}

async function main() {
  const started = Date.now()
  const template = await readFile(join(dist, 'index.html'), 'utf8')
  if (!template.includes('<div id="root"></div>')) throw new Error('[prerender] dist/index.html has no empty #root')

  const products = await publishedProducts()
  if (!products.length) throw new Error('[prerender] The API returned no published products; refusing to deploy an empty shop.')

  const built = []
  // A few at a time: enough to be quick, gentle on an API capped at one instance.
  const queue = [...products]
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let p; (p = queue.shift()); ) {
      const url = `${SITE_URL}/product/${encodeURIComponent(p.slug)}`
      const out = await render(url)
      if (out.status === 404) { console.warn(`[prerender] skipped ${p.slug}: unpublished since the list was fetched`); continue }
      const detail = out.state.queries.find((q) => q.queryKey[0] === 'product' && q.queryKey[1] === p.slug)?.state.data
      if (!detail?.product) throw new Error(`[prerender] ${p.slug}: rendered without product data`)
      const file = join(dist, 'product', p.slug, 'index.html')
      await mkdir(dirname(file), { recursive: true })
      await writeFile(file, page(template, { ...out, detail }))
      built.push(p.slug)
    }
  }))

  // Sitemap: the API's (pages, collections, lastmod dates), with product URLs limited to pages that exist.
  const builtUrls = new Set(built.map((s) => `${SITE_URL}/product/${encodeURIComponent(s)}`))
  const xml = await get('/api/sitemap.xml', 'text')
  const sitemap = xml.replace(/\s*<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/g, (entry, loc) =>
    loc.startsWith(`${SITE_URL}/product/`) && !builtUrls.has(loc) ? '' : entry)
  await writeFile(join(dist, 'sitemap.xml'), sitemap)

  // Served by Vercel, with status 404, for any path without a file, such as an unknown product. It's the
  // app itself, so a product published moments ago still opens for shoppers until the next build has it.
  await writeFile(join(dist, '404.html'),
    template.replace(/<title>[^<]*<\/title>/, '<title>Not found | Simply Odd</title>\n    <meta name="robots" content="noindex" />'))

  console.log(`[prerender] ${built.length}/${products.length} product pages, sitemap with ${(sitemap.match(/<url>/g) || []).length} URLs, in ${((Date.now() - started) / 1000).toFixed(1)}s`)
}

main().catch((e) => { console.error(e); process.exit(1) })
