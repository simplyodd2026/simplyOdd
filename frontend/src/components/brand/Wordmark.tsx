import { cn } from '@/lib/cn'

/** The name set plainly in Fraunces: confident, quiet, nothing out of line. */
export function Wordmark({ className }: { className?: string; letterClassName?: string; animate?: boolean; text?: string }) {
  return (
    <span className={cn('font-display inline-flex items-baseline whitespace-nowrap leading-none tracking-[-0.04em]', className)} aria-label="Simply Odd" role="img">
      <span aria-hidden="true">Simply Odd</span>
    </span>
  )
}
