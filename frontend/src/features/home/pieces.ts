import { useProducts } from '@/lib/queries'
import type { Product } from '@/lib/types'

/**
 * Who appears where on the home page. Each chapter asks for a different role so that a small range
 * still reads as a varied exhibition: the hero is the featured piece, the spotlight is the most-loved
 * piece that isn't already on stage, and the room shot comes from whichever piece has the most photos.
 */
export function useHomePieces() {
  const featured = useProducts({ flag: 'featured', sort: 'popular', page_size: 4 })
  const popular = useProducts({ sort: 'popular', page_size: 12 })
  const all = popular.data?.items ?? []
  const hero: Product | undefined = featured.data?.items[0] ?? all[0]
  const spotlight = all.find((p) => p.id !== hero?.id) ?? hero
  const roomPiece = [...all].sort((a, b) => b.images.length - a.images.length)[0]
  return {
    hero,
    spotlight,
    all,
    total: popular.data?.total ?? 0,
    // The in-room photograph: the richest piece's first shot, or its second if the first is the hero's.
    room: roomPiece ? { product: roomPiece, image: roomPiece.images[0] } : undefined,
    loading: featured.isLoading || popular.isLoading,
  }
}

/** "Object 01": a gallery-style index, by position in the shop's own ordering. */
export const objectNo = (i: number) => `Object ${String(i + 1).padStart(2, '0')}`
