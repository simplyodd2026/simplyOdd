import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)
gsap.defaults({ ease: 'expo.out', duration: 1.1 })
ScrollTrigger.config({ ignoreMobileResize: true })

/** One easing vocabulary for the whole site: long, weighted exits and a firm in-out for transitions. */
export const EASE = {
  out: 'expo.out',
  inOut: 'power4.inOut',
  /** Layer-by-layer, like a print head stepping up. */
  print: 'steps(18)',
} as const

/** Media queries for gsap.matchMedia(): full choreography on desktop, a lighter pass on touch screens. */
export const MQ = {
  desktop: '(min-width: 1024px) and (prefers-reduced-motion: no-preference)',
  mobile: '(max-width: 1023px) and (prefers-reduced-motion: no-preference)',
  motion: '(prefers-reduced-motion: no-preference)',
} as const

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
export const finePointer = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

/**
 * Sections that depend on fetched data create their triggers late, after sections further down the page.
 * Re-sorting by position before refreshing makes every pin's spacing count for the triggers below it.
 */
let pending: ReturnType<typeof setTimeout> | undefined
export function refreshScroll() {
  clearTimeout(pending)
  pending = setTimeout(() => {
    ScrollTrigger.sort()
    ScrollTrigger.refresh()
  }, 60)
}

export { gsap, ScrollTrigger, SplitText, useGSAP }
