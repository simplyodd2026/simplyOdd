import { useEffect } from 'react'
import { ldJson, type PageMeta } from './seo'

// index.html's site-wide description and Open Graph tags, put back when a page with its own leaves.
const defaults = new Map<string, string | null>()
const remember = (el: Element | null, key: string) => {
  if (!defaults.has(key)) defaults.set(key, el?.getAttribute('content') ?? null)
}

function meta(attr: 'name' | 'property', key: string, value: string | undefined) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  remember(el, key)
  if (value === undefined) return
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = value
}

function restore(attr: 'name' | 'property', key: string) {
  const el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  const original = defaults.get(key)
  if (!el) return
  if (original == null) el.remove()
  else el.content = original
}

const OG = ['og:title', 'og:description', 'og:url', 'og:type', 'og:image', 'og:image:alt'] as const

/**
 * Description, canonical link, Open Graph tags and JSON-LD for the page on screen. Crawlers get the same
 * tags in the HTML itself from middleware.ts; this keeps the browser (and Google's rendered view) in step.
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
    }
    // `key` and `ld` capture everything `page` and `jsonLd` hold.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ld])
}
