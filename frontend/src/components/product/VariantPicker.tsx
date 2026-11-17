import { useId, useRef, type KeyboardEvent } from 'react'
import type { ProductVariant } from '@/lib/types'
import { money } from '@/lib/format'
import { cn } from '@/lib/cn'

/**
 * Choose between versions of a piece at their own prices, like a print without or with a frame. A radio
 * group of cards with each version's name and price: Tab lands on the chosen one, the arrow keys move and
 * select. With `manual`, the arrows only move focus and Enter, Space or a click selects (for the bag).
 */
export function VariantPicker({ variants, value, onChange, label, size = 'md', manual = false, className }: {
  variants: ProductVariant[]
  value: string | null
  onChange: (key: string) => void
  /** What the choice is called, like "Frame". */
  label?: string
  size?: 'sm' | 'md'
  manual?: boolean
  className?: string
}) {
  const id = useId()
  const refs = useRef(new Map<string, HTMLButtonElement>())
  const selected = variants.find((v) => v.key === value) ?? null
  const focusable = selected?.key ?? variants[0]?.key

  const onKey = (e: KeyboardEvent, index: number) => {
    const last = variants.length - 1
    const next = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: last }[e.key]
    if (next === undefined) return
    e.preventDefault()
    const target = variants[(next + variants.length) % variants.length]
    if (!manual) onChange(target.key)
    refs.current.get(target.key)?.focus()
  }

  return (
    <div className={className}>
      <p id={`${id}-label`} className="flex flex-wrap items-baseline gap-x-2 text-[14px] text-fog">
        {label || 'Option'}
        <span className="text-ink" aria-live="polite">{selected ? selected.label : 'Choose one'}</span>
      </p>
      <div role="radiogroup" aria-labelledby={`${id}-label`} className={cn('mt-3 grid gap-2', variants.length > 1 && 'grid-cols-2')}>
        {variants.map((v, i) => {
          const on = v.key === value
          const discounted = !!v.compare_at_price && v.compare_at_price > v.price
          return (
            <button key={v.key} type="button" role="radio" aria-checked={on}
              ref={(el) => { if (el) refs.current.set(v.key, el); else refs.current.delete(v.key) }}
              tabIndex={v.key === focusable ? 0 : -1}
              onClick={() => onChange(v.key)} onKeyDown={(e) => onKey(e, i)}
              className={cn('flex flex-col items-start gap-0.5 rounded-xl border text-left transition-[border-color,box-shadow,background-color] duration-200',
                size === 'sm' ? 'px-3 py-2' : 'px-4 py-3',
                on ? 'border-ink bg-ink/[0.03] shadow-[inset_0_0_0_1px_var(--color-ink)]' : 'border-ink/15 hover:border-ink/40')}>
              <span className={cn('font-medium text-ink', size === 'sm' ? 'text-[13px]' : 'text-[15px]')}>{v.label}</span>
              <span className={cn('tabular-nums', size === 'sm' ? 'text-[12px]' : 'text-[13px]', discounted ? 'text-accent' : 'text-fog')}>
                {money(v.price)}
                {discounted && <s className="ml-1.5 text-fog">{money(v.compare_at_price!)}</s>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** The chosen variant as a small line of text, for the bag, checkout and orders. */
export function VariantTag({ label, name, className }: { label?: string | null; name?: string; className?: string }) {
  if (!label) return null
  return <span className={cn('block', className)}>{name ? `${name}: ` : ''}{label}</span>
}
