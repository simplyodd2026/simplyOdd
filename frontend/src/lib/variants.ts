import type { Product, ProductImage, ProductVariant } from './types'

/** The variant quick add buys: the product's default, else the first. Null when the piece has no variants. */
export const defaultVariant = (p: Pick<Product, 'variants' | 'default_variant'>) =>
  p.variants?.length ? (p.variants.find((v) => v.key === p.default_variant) ?? p.variants[0]).key : null

/** The variant shown and priced on the product page: the shopper's pick, else the default. */
export const chosenVariant = (p: Pick<Product, 'variants' | 'default_variant'>, key: string | null): ProductVariant | null =>
  p.variants?.find((v) => v.key === key) ?? p.variants?.find((v) => v.key === defaultVariant(p)) ?? null

/** The photos that fit a variant: its own first, then the general ones. Photos of other variants are left out. */
export function variantPhotos(images: ProductImage[], variant: string | null) {
  if (!variant) return images
  const own = images.filter((img) => img.variant === variant)
  const general = images.filter((img) => !img.variant)
  return own.length || general.length ? [...own, ...general] : images
}
