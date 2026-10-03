import { useRef, type ElementType, type ReactNode, type CSSProperties } from 'react'
import { gsap, SplitText, useGSAP, EASE, reducedMotion } from '@/lib/motion'
import { cn } from '@/lib/cn'

type SplitBy = 'lines' | 'words' | 'chars'

/**
 * Typography that rises line by line from behind its own baseline.
 * `on="scroll"` plays when it enters the viewport; `on="load"` plays as soon as `ready` is true.
 * SplitText re-splits on resize and after fonts load.
 */
export function SplitReveal({
  as: Tag = 'div', children, className, by = 'lines', on = 'scroll', ready = true, delay = 0, stagger, duration = 1.25, style, id,
}: {
  as?: ElementType; children: ReactNode; className?: string; by?: SplitBy; on?: 'scroll' | 'load'; ready?: boolean
  delay?: number; stagger?: number; duration?: number; style?: CSSProperties; id?: string
}) {
  const ref = useRef<HTMLElement>(null)

  useGSAP(() => {
    const el = ref.current
    if (!el || reducedMotion()) return
    if (!ready) { gsap.set(el, { autoAlpha: 0 }); return }
    gsap.set(el, { autoAlpha: 1 })
    const split = SplitText.create(el, {
      type: by === 'lines' ? 'lines' : `lines,${by}`,
      mask: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      onSplit(self) {
        const targets = by === 'lines' ? self.lines : by === 'words' ? self.words : self.chars
        return gsap.from(targets, {
          yPercent: 115,
          rotate: by === 'chars' ? 4 : 0,
          duration,
          ease: EASE.out,
          delay,
          stagger: stagger ?? (by === 'chars' ? 0.025 : by === 'words' ? 0.04 : 0.09),
          scrollTrigger: on === 'scroll' ? { trigger: el, start: 'top 88%', once: true } : undefined,
        })
      },
    })
    return () => split.revert()
  }, { dependencies: [ready], scope: ref })

  return <Tag ref={ref} id={id} className={className} style={style}>{children}</Tag>
}

/**
 * A block (or, with `stagger`, each of its children) lifting into place as it scrolls into view.
 */
export function Reveal({
  as: Tag = 'div', children, className, y = 36, delay = 0, stagger, start = 'top 88%', style,
}: {
  as?: ElementType; children: ReactNode; className?: string; y?: number; delay?: number; stagger?: number; start?: string; style?: CSSProperties
}) {
  const ref = useRef<HTMLElement>(null)
  useGSAP(() => {
    const el = ref.current
    if (!el || reducedMotion()) return
    const targets = stagger !== undefined ? Array.from(el.children) : el
    gsap.from(targets, {
      y, autoAlpha: 0, duration: 1.2, delay, stagger: stagger ?? 0, ease: EASE.out,
      scrollTrigger: { trigger: el, start, once: true },
    })
  }, { scope: ref })
  return <Tag ref={ref} className={className} style={style}>{children}</Tag>
}

/**
 * The signature image treatment: the frame is "printed" bottom-up in visible layers
 * while the photo settles from a slight zoom. With `parallax`, the image then drifts inside its frame.
 */
export function PrintImage({
  src, alt, className, imgClassName, parallax = false, priority = false, delay = 0, onScreen = true, children,
}: {
  src?: string; alt: string; className?: string; imgClassName?: string; parallax?: boolean; priority?: boolean
  delay?: number; onScreen?: boolean; children?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    const el = ref.current
    const img = el?.querySelector('img')
    if (!el || !img || reducedMotion()) return
    if (!onScreen) { gsap.set(el, { clipPath: 'inset(100% 0% 0% 0%)' }); return }
    const tl = gsap.timeline({
      delay,
      scrollTrigger: priority ? undefined : { trigger: el, start: 'top 90%', once: true },
    })
    tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: EASE.print })
      .from(img, { scale: 1.25, duration: 1.8, ease: EASE.out }, 0)
    if (parallax) {
      gsap.fromTo(img, { yPercent: -7 }, {
        yPercent: 7, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      })
    }
  }, { dependencies: [src, onScreen], scope: ref })

  return (
    <div ref={ref} className={cn('relative overflow-hidden bg-ash', className)}>
      {src && (
        <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" draggable={false}
          className={cn('absolute left-0 w-full object-cover', parallax ? '-top-[8%] h-[116%]' : 'inset-0 h-full', imgClassName)} />
      )}
      {children}
    </div>
  )
}
