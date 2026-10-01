import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'

export function QuantityStepper({ value, onChange, max = 99, size = 'md', tone = 'dark', label = 'Quantity' }: {
  value: number; onChange: (n: number) => void; max?: number; size?: 'sm' | 'md'; tone?: 'dark' | 'light'; label?: string
}) {
  const h = size === 'sm' ? 'h-9' : 'h-12'
  return (
    <div className={cn('inline-flex items-stretch rounded-full border', h, tone === 'dark' ? 'border-rule' : 'border-rule-light')}
      role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1 && size !== 'sm'}
        className="grid w-10 place-items-center opacity-70 hover:opacity-100 disabled:opacity-25"
        aria-label={value <= 1 ? 'Remove' : 'Decrease quantity'}>
        <Icon name="minus" size={16} />
      </button>
      <input
        value={value}
        inputMode="numeric"
        aria-label={label}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10)
          if (!Number.isNaN(n)) onChange(Math.max(1, Math.min(max, n)))
        }}
        className="w-10 bg-transparent text-center tabular-nums outline-none"
      />
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max}
        className="grid w-10 place-items-center opacity-70 hover:opacity-100 disabled:opacity-25" aria-label="Increase quantity">
        <Icon name="plus" size={16} />
      </button>
    </div>
  )
}
