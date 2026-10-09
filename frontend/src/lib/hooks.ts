import { useCallback, useEffect, useState, type SyntheticEvent } from 'react'

export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} | Simply Odd` : 'Simply Odd'
  }, [title])
}

/**
 * Lets a shaped frame take the proportions of the photo inside it, so a cover-fitted image loses next to
 * nothing to the crop. Spread `img` onto the <img> and `style` onto the frame; until the photo has loaded,
 * the frame keeps its own aspect class. The ratio is held between `min` and `max` so a very tall or wide
 * photo can't stretch the layout.
 */
export function useImageAspect(min = 0.6, max = 1.6) {
  const [ratio, setRatio] = useState<number>()
  const measure = useCallback((el: HTMLImageElement | null) => {
    if (!el) return
    const set = () => setRatio(Math.min(max, Math.max(min, el.naturalWidth / el.naturalHeight)))
    if (el.naturalWidth) return set()
    // A large photo knows its size well before it finishes loading, so check for that rather than wait.
    const poll = setInterval(() => { if (el.naturalWidth || !el.isConnected) { clearInterval(poll); if (el.naturalWidth) set() } }, 100)
  }, [min, max])
  return {
    ratio,
    style: ratio ? { aspectRatio: String(ratio) } : undefined,
    // The ref catches photos already in the cache, which can finish before onLoad is attached.
    img: { ref: measure, onLoad: (e: SyntheticEvent<HTMLImageElement>) => measure(e.currentTarget) },
  }
}
