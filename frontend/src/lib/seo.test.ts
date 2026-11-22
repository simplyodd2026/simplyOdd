import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { clip, ldJson, productJsonLd, productMeta, SITE_DESCRIPTION } from './seo'
import { useSeo } from './useSeo'
import type { Category, Product } from './types'

const product = (over: Partial<Product> = {}): Product => ({
  id: 'p_1', slug: 'loop-lamp', name: 'Loop Lamp', tagline: 'Light, shaped differently', description: 'A sculptural lamp. Printed to order.',
  price: 1499, compare_at_price: null, category_ids: ['c_1'], tags: [], materials: ['PLA'], dimensions: {}, weight_g: null,
  manufacturing: '', images: [{ url: 'https://img/1.png', alt: 'Lamp' }, { url: 'https://img/1.png', alt: 'dup' }, { url: 'https://img/2.png', alt: '' }],
  is_featured: false, is_bestseller: false, is_new_arrival: false, is_published: true, frequently_bought_with: [], colors: [],
  default_color: null, personalization: [], personalization_fee: 0, variant_label: '', variants: [], default_variant: null,
  rating: { average: 0, count: 0, distribution: {} }, sales_count: 0, discount_percent: 0, created_at: '', updated_at: '', ...over,
})
const category: Category = { id: 'c_1', slug: 'lighting', name: 'Lighting', description: '', image: null, position: 0, product_count: 3 }

describe('product metadata', () => {
  it('is specific to the product and points at its canonical URL', () => {
    const m = productMeta(product())
    expect(m.title).toBe('Loop Lamp | Simply Odd')
    expect(m.canonical).toBe('https://simplyodd.in/product/loop-lamp')
    expect(m.description).toBe('Light, shaped differently. A sculptural lamp. ₹1,499. Made to order by Simply Odd.')
    expect(m.description.length).toBeLessThanOrEqual(160)
    expect(productMeta(product({ tagline: 'x'.repeat(400) })).description.length).toBeLessThanOrEqual(160)
  })

  it('builds Product JSON-LD from real data only', () => {
    const [ld, crumbs] = productJsonLd(product(), category)['@graph'] as Record<string, any>[]
    expect(ld).toMatchObject({
      '@type': 'Product', name: 'Loop Lamp', url: 'https://simplyodd.in/product/loop-lamp', brand: { name: 'Simply Odd' },
      image: ['https://img/1.png', 'https://img/2.png'],
      offers: { price: '1499.00', priceCurrency: 'INR', availability: 'https://schema.org/InStock' },
    })
    expect(ld.aggregateRating).toBeUndefined() // no reviews, no rating
    expect(ld.description).toBe('Light, shaped differently. A sculptural lamp. Printed to order.')
    expect((productJsonLd(product({ tagline: 'Ends here.' }), null)['@graph'] as any[])[0].description).toMatch(/^Ends here\. A/)
    expect(crumbs.itemListElement.map((c: any) => c.name)).toEqual(['Home', 'Shop', 'Lighting', 'Loop Lamp'])
  })

  it('lists each variant and only real ratings', () => {
    const p = product({ variants: [{ key: 'a', label: 'Without frame', price: 499 }, { key: 'b', label: 'With frame', price: 899 }],
      rating: { average: 4.666, count: 3, distribution: {} } })
    const ld = (productJsonLd(p, null)['@graph'] as Record<string, any>[])[0]
    expect(ld.offers.map((o: any) => o.price)).toEqual(['499.00', '899.00'])
    expect(ld.aggregateRating).toMatchObject({ ratingValue: 4.7, reviewCount: 3 })
    expect(productMeta(p).description).toContain('From ₹499')
  })

  it('keeps JSON-LD from closing its script tag', () => {
    expect(ldJson({ name: '</script><script>alert(1)</script>' })).not.toContain('<')
    expect(clip('one two three four', 16)).toBe('one two three…')
  })
})

describe('useSeo', () => {
  it('sets the head tags and puts the site defaults back afterwards', () => {
    document.head.innerHTML = '<meta name="description" content="Product specific" />'
    const m = productMeta(product())
    const { unmount } = renderHook(() => useSeo(m, productJsonLd(product(), category)))
    expect(document.head.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe(m.canonical)
    expect(document.head.querySelector('meta[name=description]')?.getAttribute('content')).toBe(m.description)
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Loop Lamp | Simply Odd')
    expect(JSON.parse(document.head.querySelector('script[type="application/ld+json"]')!.textContent!)['@graph'][0].name).toBe('Loop Lamp')
    unmount()
    expect(document.head.querySelector('link[rel=canonical]')).toBeNull()
    expect(document.head.querySelector('script[type="application/ld+json"]')).toBeNull()
    expect(document.head.querySelector('meta[name=description]')?.getAttribute('content')).toBe(SITE_DESCRIPTION)
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Simply Odd')
  })
})
