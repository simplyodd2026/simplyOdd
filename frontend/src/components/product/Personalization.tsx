import type { Personalization, PersonalizationField, PersonalizationValue } from '@/lib/types'
import { Input } from '@/components/ui/Field'
import { money } from '@/lib/format'
import { cn } from '@/lib/cn'

/** Whether a piece can't go in the bag until the shopper writes something on it. */
export const needsPersonalization = (p: { personalization?: PersonalizationField[] }) =>
  !!p.personalization?.some((f) => f.required)

/** What's missing or wrong with the values, field by field; empty when they're ready to add to the bag. */
export function personalizationErrors(fields: PersonalizationField[], values: Personalization): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const f of fields) {
    const v = (values[f.key] ?? '').trim()
    if (f.required && !v) errors[f.key] = `Add the ${f.label.toLowerCase()}`
    else if (v.length > f.max_length) errors[f.key] = `Up to ${f.max_length} characters`
  }
  return errors
}

/** The inputs for a personalised piece, on its product page. */
export function PersonalizationForm({ fields, fee, values, onChange, errors, className }: {
  fields: PersonalizationField[]
  fee: number
  values: Personalization
  onChange: (values: Personalization) => void
  /** Shown only once the shopper has tried to add the piece. */
  errors?: Record<string, string>
  className?: string
}) {
  if (!fields.length) return null
  return (
    <fieldset className={cn('flex flex-col gap-4', className)}>
      <legend className="mb-3 flex w-full items-baseline justify-between gap-3">
        <span className="label text-smoke">Personalise it</span>
        {fee > 0 && <span className="text-[13px] tabular-nums text-fog">+{money(fee)}</span>}
      </legend>
      {fields.map((f) => {
        const value = values[f.key] ?? ''
        return (
          <Input key={f.key} label={<>{f.label}{!f.required && <span className="ml-1.5 normal-case text-fog">(optional)</span>}</>}
            value={value} placeholder={f.placeholder} maxLength={f.max_length} autoComplete="off" spellCheck={false}
            onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}
            error={errors?.[f.key]} hint={`${value.length}/${f.max_length}`} />
        )
      })}
      <p className="-mt-1 text-[13px] text-fog">Printed exactly as typed, so check the spelling.</p>
    </fieldset>
  )
}

/** A line's personalisation, read-only: in the bag, at checkout, and on orders. */
export function PersonalizationTag({ details, className }: { details?: PersonalizationValue[] | null; className?: string }) {
  if (!details?.length) return null
  return (
    <dl className={cn('flex flex-col gap-0.5', className)}>
      {details.map((d) => (
        <div key={d.key} className="flex flex-wrap gap-x-1.5">
          <dt>{d.label}:</dt>
          <dd className="font-medium text-ink">“{d.value}”</dd>
        </div>
      ))}
    </dl>
  )
}
