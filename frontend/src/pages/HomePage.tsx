import { Hero } from '@/features/home/Hero'
import { Spotlight } from '@/features/home/Spotlight'
import { Idea } from '@/features/home/Idea'
import { Collection } from '@/features/home/Collection'
import { InYourSpace } from '@/features/home/InYourSpace'
import { Kinds } from '@/features/home/Kinds'
import { ServiceBar } from '@/features/home/ServiceBar'
import { Moodboard } from '@/features/home/Moodboard'
import { Brand } from '@/features/home/Brand'
import { Reviews } from '@/features/home/Reviews'
import { Finale } from '@/features/home/Finale'
import { useDocumentTitle } from '@/lib/hooks'

/**
 * The home page as a small exhibition, told in chapters:
 * the intro, one object up close, the idea behind them, the collection, a piece at home,
 * the shop itself with the Odd Board pinned up beside it, the studio, what buyers say, and a closing line.
 * The Odd Board is the studio's mood board and the source of the palette and the playful voice elsewhere.
 */
export default function HomePage() {
  useDocumentTitle(undefined)
  return (
    <>
      <Hero />
      <Spotlight />
      <Idea />
      <Collection />
      <InYourSpace />
      <Kinds />
      <ServiceBar />
      <Moodboard />
      <Brand />
      <Reviews />
      <Finale />
    </>
  )
}
