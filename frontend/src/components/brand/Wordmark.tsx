import { cn } from '@/lib/cn'

/** The name in widely spaced condensed capitals, like lettering above a gallery door. */
export function Wordmark({ className }: { className?: string; letterClassName?: string; animate?: boolean; text?: string }) {
  return (
    <span className={cn('inline-flex items-baseline whitespace-nowrap font-[family-name:var(--font-display)] font-medium uppercase leading-none tracking-[0.34em]', className)}
      aria-label="Simply Odd" role="img">
      <span aria-hidden="true">Simply Odd</span>
    </span>
  )
}
