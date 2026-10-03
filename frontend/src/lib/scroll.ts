import Lenis from 'lenis'
import { gsap, ScrollTrigger, reducedMotion } from './motion'

let lenis: Lenis | null = null
let locks = 0

/** Smooth, weighted wheel scrolling driven by GSAP's ticker so ScrollTrigger stays in sync. Touch keeps native scrolling. */
export function startSmoothScroll() {
  if (lenis || reducedMotion()) return () => undefined
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95, anchors: true })
  lenis.on('scroll', ScrollTrigger.update)
  const tick = (time: number) => lenis?.raf(time * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
  return () => {
    gsap.ticker.remove(tick)
    lenis?.destroy()
    lenis = null
  }
}

/** Reference-counted, so a drawer opening over the search overlay doesn't unlock scrolling when it closes. */
export function lockScroll() {
  locks += 1
  if (locks > 1) return
  lenis?.stop()
  document.documentElement.style.overflow = 'hidden'
}

export function unlockScroll() {
  locks = Math.max(0, locks - 1)
  if (locks) return
  lenis?.start()
  document.documentElement.style.overflow = ''
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
  else window.scrollTo(0, 0)
}

export function scrollToY(y: number) {
  if (lenis) lenis.scrollTo(y, { duration: 1.2 })
  else window.scrollTo({ top: y, behavior: reducedMotion() ? 'auto' : 'smooth' })
}
