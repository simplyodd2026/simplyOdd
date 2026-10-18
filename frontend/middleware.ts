// Vercel Edge Middleware: link-preview bots (WhatsApp, iMessage, Slack, …) don't run
// JavaScript, so they only ever see index.html's generic tags. For product URLs we
// hand bots a copy of index.html with that product's title, description and image.
// Real browsers pass straight through untouched.

export const config = { matcher: '/product/:slug*' }

// Vercel's edge runtime provides process.env; this project doesn't ship Node types.
declare const process: { env: Record<string, string | undefined> }

const API = (process.env.VITE_API_URL || 'https://simplyodd-api-18861122418.asia-south1.run.app').replace(/\/$/, '')

const BOTS =
  /bot|crawler|spider|preview|facebookexternalhit|facebookcatalog|whatsapp|telegram|slack|discord|linkedin|pinterest|skype|embedly|vkshare|redditbot|applebot|quora/i

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Product photos are multi-MB PNGs, which WhatsApp won't show; serve a small JPEG instead.
const thumb = (url: string) =>
  `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1200&h=630&fit=contain&cbg=F3EDE4&output=jpg&q=80`

export default async function middleware(request: Request) {
  if (!BOTS.test(request.headers.get('user-agent') ?? '')) return

  const url = new URL(request.url)
  const slug = decodeURIComponent(url.pathname.split('/')[2] ?? '')
  if (!slug) return

  try {
    const [apiRes, pageRes] = await Promise.all([
      fetch(`${API}/api/products/${encodeURIComponent(slug)}`, { signal: AbortSignal.timeout(8000) }),
      fetch(new URL('/index.html', url)),
    ])
    if (!apiRes.ok || !pageRes.ok) return
    const { product } = await apiRes.json()
    let html = await pageRes.text()

    const title = `${product.name} | Simply Odd`
    const description = (product.tagline || product.description || '').slice(0, 200)
    const image = product.images?.[0]?.url

    const tags = [
      `<meta property="og:type" content="product" />`,
      `<meta property="og:site_name" content="Simply Odd" />`,
      `<meta property="og:title" content="${esc(title)}" />`,
      `<meta property="og:description" content="${esc(description)}" />`,
      `<meta property="og:url" content="${esc(url.origin + url.pathname)}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      ...(image
        ? [
            `<meta property="og:image" content="${esc(thumb(image))}" />`,
            `<meta property="og:image:width" content="1200" />`,
            `<meta property="og:image:height" content="630" />`,
            `<meta property="og:image:alt" content="${esc(product.images[0].alt || product.name)}" />`,
          ]
        : []),
    ].join('\n    ')

    html = html
      .replace(/\s*<meta (property|name)="(og|twitter):[^>]*>/g, '')
      .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(description)}" />`)
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>\n    ${tags}`)

    return new Response(html, {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=600' },
    })
  } catch {
    return
  }
}
