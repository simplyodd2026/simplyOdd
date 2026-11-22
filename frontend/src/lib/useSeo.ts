import { useEffect } from 'react'
import { ldJson, SITE_DESCRIPTION, SITE_IMAGE, SITE_NAME, type PageMeta } from './seo'

// What a page without its own tags shows: index.html's site-wide values. Fixed rather than read from the
// page, because a prerendered product page loads with that product's tags already in place.
const DEFAULTS: Record<string, string | null> = {
  description: SITE_DESCRIPTION, 'og:title': SITE_NAME, 'og:description': SITE_DESCRIPTION, 'og:image': SITE_IMAGE,
}

function meta(attr: 'name' | 'property', key: string, value: string | undefined) {
  if (value === undefined) return
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = value
}

function restore(attr: 'name' | 'property', key: string) {
  const el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  const original = DEFAULTS[key]
  if (!el) return
  if (original == null) el.remove()
  else el.content = original
}

// Product-only tags a prerendered page arrives with, dropped when moving on to another page.
const PAGE_ONLY = ['og:image:width', 'og:image:height', 'product:price:amount', 'product:price:currency']

const OG = ['og:title', 'og:description', 'og:url', 'og:type', 'og:image', 'og:image:alt'] as const

/**
 * Description, canonical link, Open Graph tags and JSON-LD for the page on screen. Prerendered product
 * pages arrive with the same tags in their HTML (scripts/prerender.mjs); this keeps them right as the shopper moves around.
 * The title is left to useDocumentTitle.
 */
export function useSeo(page: PageMeta | null, jsonLd?: unknown) {
  const ld = jsonLd === undefined ? '' : ldJson(jsonLd)
  const key = page ? JSON.stringify(page) : ''
  useEffect(() => {
    if (!page) return
    meta('name', 'description', page.description)
    const og: Record<(typeof OG)[number], string | undefined> = {
      'og:title': page.title, 'og:description': page.description, 'og:url': page.canonical,
      'og:type': page.type, 'og:image': page.image, 'og:image:alt': page.image ? page.imageAlt : undefined,
    }
    for (const k of OG) meta('property', k, og[k])

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = page.canonical

    let script = document.head.querySelector<HTMLScriptElement>('script[type="application/ld+json"][data-seo]')
    if (ld) {
      if (!script) {
        script = document.createElement('script')
        script.type = 'application/ld+json'
        script.dataset.seo = ''
        document.head.appendChild(script)
      }
      script.textContent = ld
    }

    return () => {
      document.head.querySelector('link[rel="canonical"]')?.remove()
      document.head.querySelector('script[type="application/ld+json"][data-seo]')?.remove()
      restore('name', 'description')
      for (const k of OG) restore('property', k)
      for (const k of PAGE_ONLY) document.head.querySelector(`meta[property="${k}"]`)?.remove()
    }
    // `key` and `ld` capture everything `page` and `jsonLd` hold.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ld])
}
