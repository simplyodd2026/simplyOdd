import { cn } from '@/lib/cn'

/**
 * The Simply Odd logo. Sized by the parent's font-size (1.5em tall), so it
 * drops into the same slots the old text wordmark used. `light` turns it
 * white for dark backgrounds.
 */
export function Wordmark({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <img src="/logo-mark.png" alt="Simply Odd" width={700} height={160} draggable={false}
      // A passed className replaces the default sizing; cn does not resolve conflicting utilities.
      className={cn('block select-none', className ?? 'h-[1.5em] w-auto', light && 'brightness-0 invert')} />
  )
}
