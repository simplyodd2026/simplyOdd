/** Deterministic pseudo-random numbers, so scrapbook shapes are identical on every render. */
export function seeded(seed: string | number) {
  let h = typeof seed === 'number' ? seed : [...seed].reduce((a, c) => Math.imul(a ^ c.charCodeAt(0), 16777619), 2166136261)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

/** An irregular polygon for clip-path: a rectangle whose edges look torn by hand. */
export function tornPolygon(seed: string, roughness = 1.6, step = 3.5) {
  const r = seeded(seed)
  const pts: string[] = []
  const j = () => (r() * roughness).toFixed(2)
  for (let x = 0; x <= 100; x += step + r() * step) pts.push(`${x.toFixed(1)}% ${j()}%`)
  for (let y = 0; y <= 100; y += step + r() * step) pts.push(`${(100 - +j()).toFixed(2)}% ${y.toFixed(1)}%`)
  for (let x = 100; x >= 0; x -= step + r() * step) pts.push(`${x.toFixed(1)}% ${(100 - +j()).toFixed(2)}%`)
  for (let y = 100; y >= 0; y -= step + r() * step) pts.push(`${j()}% ${y.toFixed(1)}%`)
  return `polygon(${pts.join(',')})`
}
