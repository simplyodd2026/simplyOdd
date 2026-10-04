import { useEffect, useState } from 'react'

const cache = new Map<string, string>()
const WALL = [247, 246, 243] // --color-paper-2, the stage the glow sits on

/**
 * The colour a piece would cast on the wall behind it: its own colour, softened into a pastel.
 * Samples the photo on a tiny canvas, treats the corners as backdrop, and averages the object's pixels,
 * leaning on the more saturated ones so a peach vase reads as peach rather than as its shadow.
 */
function sample(img: HTMLImageElement): string | null {
  const W = 24, H = 30
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, W, H)
  const px = ctx.getImageData(0, 0, W, H).data // throws on a cross-origin image without CORS

  const at = (x: number, y: number) => { const i = (y * W + x) * 4; return [px[i], px[i + 1], px[i + 2]] }
  const corners = [at(0, 0), at(W - 1, 0), at(0, H - 1), at(W - 1, H - 1)]
  const bg = [0, 1, 2].map((c) => corners.reduce((n, p) => n + p[c], 0) / 4)

  let r = 0, g = 0, b = 0, weight = 0
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 128) continue
    const [R, G, B] = [px[i], px[i + 1], px[i + 2]]
    if (Math.abs(R - bg[0]) + Math.abs(G - bg[1]) + Math.abs(B - bg[2]) < 60) continue
    const w = 1 + (Math.max(R, G, B) - Math.min(R, G, B)) / 30
    r += R * w; g += G * w; b += B * w; weight += w
  }
  if (!weight) return null

  // Dark objects would cast a muddy glow, so they're lifted further toward the wall colour.
  const rgb = [r / weight, g / weight, b / weight]
  const lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255
  const keep = lum < 0.3 ? 0.3 : 0.62
  const mixed = rgb.map((v, c) => Math.round(v * keep + WALL[c] * (1 - keep)))
  return `rgb(${mixed.join(' ')})`
}

export function usePieceTone(url: string | undefined, fallback = 'rgb(230 220 200)') {
  const [tone, setTone] = useState(fallback)
  useEffect(() => {
    if (!url) return
    const hit = cache.get(url)
    if (hit) { setTone(hit); return }
    let live = true
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      let found: string | null = null
      try { found = sample(img) } catch { /* image host doesn't allow reading pixels: keep the fallback */ }
      const value = found ?? fallback
      cache.set(url, value)
      if (live) setTone(value)
    }
    img.src = url
    return () => { live = false }
  }, [url, fallback])
  return tone
}
