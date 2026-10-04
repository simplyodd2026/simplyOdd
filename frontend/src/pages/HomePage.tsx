import { Hero } from '@/features/home/Hero'
import { ServiceBar } from '@/features/home/ServiceBar'
import { CategoryGrid } from '@/features/home/CategoryGrid'
import { ProductCarousel } from '@/features/home/ProductCarousel'
import { Moodboard } from '@/features/home/Moodboard'
import { Studio } from '@/features/home/Studio'
import { PromoBanners } from '@/features/home/PromoBanners'
import { ShopTabs } from '@/features/home/ShopTabs'
import { Reviews } from '@/features/home/Reviews'
import { useDocumentTitle } from '@/lib/hooks'

/**
 * A gallery shop: the hero puts one piece on a plinth with its wall label, and everything after it
 * is quiet browsing, by kind, by what's new and by what people love. The Odd Board is the one loud moment:
 * a pinned corkboard of products and handwritten notes, in its own scrapbook colours.
 */
export default function HomePage() {
  useDocumentTitle(undefined)
  return (
    <>
      <Hero />
      <ServiceBar />
      <CategoryGrid />
      <ProductCarousel title="New arrivals" query={{ flag: 'new', sort: 'newest' }} href="/new" linkLabel="Shop new arrivals" />
      <Moodboard />
      <Studio />
      <ShopTabs />
      <PromoBanners />
      <Reviews />
    </>
  )
}
