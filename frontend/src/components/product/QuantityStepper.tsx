import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'

export function QuantityStepper({ value, onChange, max = 99, size = 'md', label = 'Quantity' }: {
  value: number; onChange: (n: number) => void; max?: number; size?: 'sm' | 'md'; tone?: 'dark' | 'light'; label?: string
}) {
  const h = size === 'sm' ? 'h-9' : 'h-14'
  const btn = 'grid w-10 place-items-center rounded-full text-ink transition-colors hover:bg-ink/5 disabled:opacity-25 disabled:hover:bg-transparent'
  return (
    <div className={cn('inline-flex items-stretch rounded-full border border-ink/15 p-0.5', h)} role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1 && size !== 'sm'} className={btn}
        aria-label={value <= 1 ? 'Remove' : 'Decrease quantity'}>
        <Icon name="minus" size={15} />
      </button>
      <input value={value} inputMode="numeric" aria-label={label}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
          if (!Number.isNaN(n)) onChange(Math.max(1, Math.min(max, n)))
        }}
        className="w-8 bg-transparent text-center font-mono text-[13px] tabular-nums text-ink outline-none" />
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} className={btn} aria-label="Increase quantity">
        <Icon name="plus" size={15} />
      </button>
    </div>
  )
}
