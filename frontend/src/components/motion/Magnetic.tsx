import { useRef, type ReactNode } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'
import { finePointer, reducedMotion } from '@/lib/motion'
import { cn } from '@/lib/cn'

/** Pulls its child toward the pointer, then springs back. Only on precise pointers. */
export function Magnetic({ children, strength = 0.35, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useSpring(useMotionValue(0), { stiffness: 180, damping: 16, mass: 0.6 })
  const y = useSpring(useMotionValue(0), { stiffness: 180, damping: 16, mass: 0.6 })

  const move = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !finePointer() || reducedMotion()) return
    const r = ref.current!.getBoundingClientRect()
    x.set((e.clientX - r.left - r.width / 2) * strength)
    y.set((e.clientY - r.top - r.height / 2) * strength)
  }
  const leave = () => { x.set(0); y.set(0) }

  return (
    <motion.div ref={ref} onPointerMove={move} onPointerLeave={leave} style={{ x, y }} className={cn('inline-flex', className)}>
      {children}
    </motion.div>
  )
}
