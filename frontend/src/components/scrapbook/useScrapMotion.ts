import type { RefObject } from 'react'
import { gsap, ScrollTrigger, useGSAP, MQ } from '@/lib/motion'

/**
 * Makes a scrapbook section feel assembled by hand as it scrolls into view:
 * - ransom letters are stuck on one at a time, each landing at its own tilt,
 * - felt stickers pop onto the page and then drift gently with the scroll,
 * - photos and notes marked `data-drop` fall into place, their push pins (`data-pin`) pressed in after,
 * - chat bubbles marked `data-msg` arrive one after another, like messages coming in.
 * Nothing runs for reduced motion; everything stays visible as authored.
 */
export function useScrapMotion(scope: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useGSAP(() => {
    const root = scope.current
    if (!root) return
    const mm = gsap.matchMedia()
    mm.add(MQ.motion, () => {
      root.querySelectorAll<HTMLElement>('[data-ransom]').forEach((word) => {
        const letters = word.querySelectorAll('[data-letter]')
        const st = { trigger: word, start: 'top 92%', once: true }
        // Explicit end values, so a re-run part-way through can never freeze a letter half-faded.
        gsap.fromTo(letters, { scale: 1.8, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.7, ease: 'back.out(2.2)', stagger: 0.035, scrollTrigger: st })
        gsap.from(letters, { rotation: () => gsap.utils.random(-28, 28), duration: 0.7, ease: 'back.out(2.2)', stagger: 0.035, scrollTrigger: { ...st } })
      })

      root.querySelectorAll<SVGGElement>('svg.cutout > g').forEach((g) => {
        const svg = g.ownerSVGElement!
        gsap.fromTo(g, { scale: 0, rotation: -35, transformOrigin: '50% 50%' }, {
          scale: 1, rotation: 0, duration: 0.9, ease: 'back.out(2.4)', delay: gsap.utils.random(0.05, 0.35),
          scrollTrigger: { trigger: svg, start: 'top 94%', once: true },
        })
        gsap.fromTo(g, { y: 7 }, { y: -7, ease: 'none', scrollTrigger: { trigger: svg, start: 'top bottom', end: 'bottom top', scrub: true } })
      })

      const drops = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('[data-drop]'))
      if (drops.length) {
        gsap.set(drops, { autoAlpha: 0, y: -70, rotation: '-=9' })
        ScrollTrigger.batch(drops, {
          start: 'top 92%', once: true,
          onEnter: (batch) => {
            gsap.to(batch, { autoAlpha: 1, y: 0, rotation: '+=9', duration: 0.95, ease: 'back.out(1.5)', stagger: 0.11, overwrite: true })
            const pins = batch.flatMap((el) => Array.from((el as HTMLElement).querySelectorAll('[data-pin]')))
            if (pins.length) gsap.fromTo(pins, { scale: 0 }, { scale: 1, duration: 0.5, ease: 'back.out(3)', stagger: 0.11, delay: 0.55 })
          },
        })
      }

      const msgs = root.querySelectorAll<HTMLElement>('[data-msg]')
      if (msgs.length) {
        gsap.fromTo(msgs, { autoAlpha: 0, y: 22, scale: 0.9, transformOrigin: '0% 100%' }, {
          autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.8)', stagger: 0.22,
          scrollTrigger: { trigger: msgs[0], start: 'top 85%', once: true },
        })
      }
    })
    return () => mm.revert()
  }, { scope, dependencies: deps })
}
