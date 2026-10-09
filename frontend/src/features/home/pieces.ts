import { useHomepage, useProducts } from '@/lib/queries'
import type { HomeSlot, Product, ProductImage } from '@/lib/types'

/** A product as one section shows it: with a photo chosen in the admin, or none to use the section's default. */
export type Piece = { product: Product; image?: ProductImage }

/**
 * Who appears where on the home page. The admin's Home page panel can place a product (and a photo of it)
 * in each section; anything left empty is chosen automatically. Automatically, each chapter asks for a
 * different role so that a small range still reads as a varied exhibition: the hero is the featured piece,
 * the spotlight is the most-loved piece that isn't already on stage, and the room shot comes from whichever
 * piece has the most photos.
 */
export function useHomePieces() {
  const featured = useProducts({ flag: 'featured', sort: 'popular', page_size: 4 })
  const popular = useProducts({ sort: 'popular', page_size: 14 })
  const home = useHomepage()
  const all = popular.data?.items ?? []
  const layout = home.data?.layout
  const byId = new Map((home.data?.products ?? []).map((p) => [p.id, p]))

  const piece = (slot: HomeSlot | null | undefined): Piece | undefined => {
    const product = slot && byId.get(slot.product_id)
    if (!product) return undefined
    return { product, image: slot.image ? photo(product, slot.image) : undefined }
  }
  const pieces = (slots: HomeSlot[] | undefined) => (slots ?? []).map(piece).filter((p): p is Piece => !!p)

  const hero: Product | undefined = featured.data?.items[0] ?? all[0]
  const autoSpotlight = all.find((p) => p.id !== hero?.id) ?? hero
  const spotlight = piece(layout?.spotlight) ?? (autoSpotlight && { product: autoSpotlight })
  // The collection's two large pieces and its sliding row are chosen separately; whichever is left
  // automatic fills from the popular pieces the other doesn't already show.
  const large = pieces(layout?.collection)
  const row = pieces(layout?.collection_row)
  const unused = (taken: Piece[]) => all.filter((p) => !taken.some((t) => t.product.id === p.id)).map((product) => ({ product }))
  const collectionLarge = large.length ? large : unused(row).slice(0, 2)
  const collectionRow = row.length ? row : unused(collectionLarge).slice(0, 12)
  const moodboard = pieces(layout?.moodboard)
  const roomPiece = [...all].sort((a, b) => b.images.length - a.images.length)[0]
  const room = piece(layout?.room) ?? (roomPiece && { product: roomPiece })
  const studio = layout?.studio_image
    ?? (room?.product.images[2] ?? room?.product.images[1] ?? hero?.images[0])?.url

  return {
    hero,
    spotlight,
    // The small round photo beside the spotlight: the admin's pick, else the spotlight piece's second photo.
    spotlightInset: layout?.spotlight_inset ?? spotlight?.product.images.find((i) => i.url !== spotlight.image?.url && i !== spotlight.product.images[0])?.url,
    all,
    collectionLarge,
    collectionRow,
    moodboard: moodboard.length ? moodboard : all.map((product) => ({ product })),
    room,
    studio,
    total: popular.data?.total ?? 0,
    loading: featured.isLoading || popular.isLoading || home.isLoading,
  }
}

/** One of the product's own photos if the URL is one, so it keeps its alt text; otherwise an uploaded photo. */
function photo(product: Product, url: string): ProductImage {
  return product.images.find((i) => i.url === url) ?? { url, alt: product.name }
}

/** "Object 01": a gallery-style index, by position in the shop's own ordering. */
export const objectNo = (i: number) => `Object ${String(i + 1).padStart(2, '0')}`
