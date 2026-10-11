import { useId, useRef, type KeyboardEvent } from 'react'
import type { Filament, FilamentChoice } from '@/lib/types'
import { filamentLabel, needsEdge, swatchStyle } from '@/lib/filaments'
import { cn } from '@/lib/cn'

/** A filament dot: a flat colour, or a texture for clear, translucent and silk finishes. */
export function Swatch({ filament, className }: { filament: Pick<FilamentChoice, 'finish' | 'hex'>; className?: string }) {
  return (
    <span aria-hidden style={swatchStyle(filament)}
      className={cn('block shrink-0 rounded-full', needsEdge(filament) && 'shadow-[inset_0_0_0_1px_rgb(42_31_23/0.2)]', className)} />
  )
}

/** The chosen colour as a small line of text with its dot, for the bag, checkout and orders. */
export function ColorTag({ filament, className }: { filament: FilamentChoice; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <Swatch filament={filament} className="size-3" />
      {filamentLabel(filament)}
    </span>
  )
}

/**
 * Choose a filament colour. A radio group: Tab lands on the chosen swatch, the arrow keys move and select,
 * Home and End jump to either end. With `manual`, the arrows only move focus and Enter, Space or a click
 * selects, for places where each selection does real work (changing a line in the bag). Names show on hover and focus, and the chosen name is always written out
 * beside the label, so nothing depends on hovering (touch) or on telling colours apart.
 * Special finishes sit on their own row so they read as a different material, not just another colour.
 */
export function ColorSwatches({ options, value, onChange, label = 'Colour', size = 'md', note, manual = false, className }: {
  options: Filament[]
  value: string | null
  onChange: (id: string) => void
  label?: string
  size?: 'sm' | 'md'
  note?: string | null
  manual?: boolean
  className?: string
}) {
  const id = useId()
  const refs = useRef(new Map<string, HTMLButtonElement>())
  const selected = options.find((f) => f.id === value) ?? null
  const rows = [options.filter((f) => f.group !== 'special'), options.filter((f) => f.group === 'special')].filter((r) => r.length)
  const focusable = selected?.id ?? options[0]?.id

  const onKey = (e: KeyboardEvent, index: number) => {
    const last = options.length - 1
    const next = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: last }[e.key]
    if (next === undefined) return
    e.preventDefault()
    const target = options[(next + options.length) % options.length]
    if (!manual) onChange(target.id)
    refs.current.get(target.id)?.focus()
  }

  const dot = size === 'sm' ? 'size-8' : 'size-10'
  return (
    <div className={className}>
      <p id={`${id}-label`} className="flex flex-wrap items-baseline gap-x-2 text-[14px] text-fog">
        {label}
        <span className="text-ink" aria-live="polite">{selected ? filamentLabel(selected) : 'Choose one'}</span>
      </p>
      <div role="radiogroup" aria-labelledby={`${id}-label`} className="mt-3 flex flex-col gap-3">
        {rows.map((row, r) => (
          <div key={r} className="flex flex-col gap-2">
            {rows.length > 1 && r === 1 && <span className="text-[12px] text-fog">Special finishes</span>}
            <div className="-mx-1 flex flex-wrap gap-1">
              {row.map((f) => {
                const on = f.id === value
                return (
                  <button key={f.id} type="button" role="radio" aria-checked={on} aria-label={filamentLabel(f)}
                    ref={(el) => { if (el) refs.current.set(f.id, el); else refs.current.delete(f.id) }}
                    tabIndex={f.id === focusable ? 0 : -1}
                    onClick={() => onChange(f.id)} onKeyDown={(e) => onKey(e, options.indexOf(f))}
                    className={cn('group relative grid place-items-center rounded-full p-[3px] transition-shadow duration-200', dot,
                      on ? 'shadow-[inset_0_0_0_1.5px_var(--color-ink)]' : 'hover:shadow-[inset_0_0_0_1px_rgb(42_31_23/0.35)]')}>
                    <Swatch filament={f} className="size-full" />
                    <span aria-hidden
                      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[12px] text-paper hidden group-hover:block group-focus-visible:block">
                      {f.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      {note && <p className="mt-3 text-[13px] leading-relaxed text-fog">{note}</p>}
    </div>
  )
}
