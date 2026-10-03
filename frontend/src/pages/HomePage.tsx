import { Hero } from '@/features/home/Hero'
import { ServiceBar } from '@/features/home/ServiceBar'
import { CategoryGrid } from '@/features/home/CategoryGrid'
import { ProductCarousel } from '@/features/home/ProductCarousel'
import { Moodboard } from '@/features/home/Moodboard'
import { PromoBanners } from '@/features/home/PromoBanners'
import { ShopTabs } from '@/features/home/ShopTabs'
import { Reviews } from '@/features/home/Reviews'
import { useDocumentTitle } from '@/lib/hooks'

/**
 * A storefront with a scrapbook heart: the collage hero, the Odd Board and the reviews phone
 * keep the brand's handmade voice, while the shopping sections around them stay clean and quick to scan.
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
      <PromoBanners />
      <ShopTabs />
      <Reviews />
    </>
  )
}
