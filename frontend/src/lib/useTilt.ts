import { useEffect, useRef } from 'react'
import { finePointer, reducedMotion } from './motion'

/**
 * A physical lean toward the pointer: the element tips a few degrees and drifts a few pixels,
 * as if it were a light object on a table you'd just nudged. Mouse and trackpad only.
 */
export function useTilt<T extends HTMLElement>(strength = 5) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !finePointer() || reducedMotion()) return
    let frame = 0
    const set = (rx: number, ry: number, tx: number, ty: number) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translate3d(${tx}px, ${ty}px, 0)`
      })
    }
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width - 0.5
      const py = (e.clientY - r.top) / r.height - 0.5
      set(-py * strength, px * strength, px * strength * 1.6, py * strength * 1.6)
    }
    const leave = () => set(0, 0, 0, 0)
    el.style.transition = 'transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)'
    el.style.willChange = 'transform'
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [strength])
  return ref
}
