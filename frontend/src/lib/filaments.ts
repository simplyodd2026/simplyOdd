import { useMemo, type CSSProperties } from 'react'
import { useConfig } from '@/lib/queries'
import type { Filament, FilamentChoice, Product } from '@/lib/types'

/**
 * The filament palette comes from the API (`/config`), so colours are defined once, on the backend,
 * and the storefront, bag and orders all read the same list.
 */
export function useFilaments() {
  const { data } = useConfig()
  return useMemo(() => {
    const list = data?.filaments ?? []
    return { list, byId: new Map(list.map((f) => [f.id, f])) }
  }, [data])
}

/** A product's colour options in the order the studio listed them, skipping any no longer in the palette. */
export const productFilaments = (p: Pick<Product, 'colors'>, byId: Map<string, Filament>) =>
  p.colors.map((id) => byId.get(id)).filter((f): f is Filament => !!f)

/** The colour a quick add uses: the product's default, else its first option; null when it has none. */
export const defaultColor = (p: Pick<Product, 'colors' | 'default_color'>) =>
  p.colors.length ? (p.default_color && p.colors.includes(p.default_color) ? p.default_color : p.colors[0]) : null

/** Pale swatches need an edge to read against the ivory page. */
export function isLight(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55
}

// A fine checker under see-through finishes, so they read as see-through rather than as a pale flat colour.
const CHECKER = 'repeating-conic-gradient(#D6CFC4 0 25%, #F7F3EC 0 50%) 0 0 / 7px 7px'
const GLINT = 'linear-gradient(135deg, rgb(255 255 255 / 0.85) 0%, rgb(255 255 255 / 0) 42%)'

/** The fill for a swatch. Special finishes get a texture; only solid colours are a flat hex. */
export function swatchStyle(f: Pick<FilamentChoice, 'finish' | 'hex'>): CSSProperties {
  switch (f.finish) {
    case 'transparent':
      return { background: `${GLINT}, linear-gradient(${f.hex}66, ${f.hex}66), ${CHECKER}` }
    case 'translucent':
      return { background: `${GLINT}, linear-gradient(${f.hex}C0, ${f.hex}C0), ${CHECKER}` }
    case 'silk':
      return {
        background: `linear-gradient(125deg, color-mix(in srgb, ${f.hex}, black 30%) 0%, ${f.hex} 30%,
          color-mix(in srgb, ${f.hex}, white 70%) 48%, ${f.hex} 62%, color-mix(in srgb, ${f.hex}, black 25%) 100%)`,
      }
    default:
      return { background: f.hex }
  }
}

/** Needs a hairline edge: pale colours and anything see-through. */
export const needsEdge = (f: Pick<FilamentChoice, 'finish' | 'hex'>) =>
  f.finish === 'transparent' || f.finish === 'translucent' || isLight(f.hex)

/** "Sage Green", or "Silk Gold, silk finish" where the finish isn't a plain colour. */
export const filamentLabel = (f: Pick<FilamentChoice, 'name' | 'finish' | 'finish_label'>) =>
  f.finish === 'solid' || f.name.toLowerCase().includes(f.finish_label.toLowerCase()) ? f.name : `${f.name}, ${f.finish_label.toLowerCase()} finish`
