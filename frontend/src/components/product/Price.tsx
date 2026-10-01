import { money } from '@/lib/format'
import { cn } from '@/lib/cn'

export function Price({ price, compareAt, className, size = 'md' }: {
  price: number; compareAt?: number | null; className?: string; size?: 'md' | 'lg'
}) {
  const discounted = !!compareAt && compareAt > price
  return (
    <span className={cn('inline-flex items-baseline gap-2 tabular-nums', className)}>
      <span className={cn(size === 'lg' ? 'text-2xl font-semibold' : 'font-medium', discounted && 'text-accent')}>
        {money(price)}
      </span>
      {discounted && (
        <s className={cn('text-fog', size === 'lg' ? 'text-base' : 'text-sm')} aria-label={`was ${money(compareAt!)}`}>
          {money(compareAt!)}
        </s>
      )}
    </span>
  )
}
