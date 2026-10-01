import { Hero } from '@/features/home/Hero'
import { Featured } from '@/features/home/Featured'
import { CategoryMosaic } from '@/features/home/CategoryMosaic'
import { BrandStory } from '@/features/home/BrandStory'
import { ProductRail } from '@/features/home/ProductRail'
import { Moodboard } from '@/features/home/Moodboard'
import { Clothesline } from '@/features/home/Clothesline'
import { Reviews } from '@/features/home/Reviews'
import { PromoPair } from '@/features/home/PromoPair'
import { Principles } from '@/features/home/Principles'
import { Newsletter } from '@/features/home/Newsletter'
import { useDocumentTitle } from '@/lib/hooks'

export default function HomePage() {
  useDocumentTitle(undefined)
  return (
    <>
      <Hero />
      <CategoryMosaic />
      <Moodboard />
      <ProductRail ranked kicker="everyone's obsessed" title="Best sellers" query={{ flag: 'bestseller', sort: 'popular' }} href="/bestsellers" linkLabel="All best sellers" />
      <PromoPair />
      <Featured />
      <BrandStory />
      <Clothesline />
      <Reviews />
      <Principles />
      <Newsletter />
    </>
  )
}
