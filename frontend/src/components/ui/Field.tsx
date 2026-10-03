import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'dark' | 'light'

const control = (tone: Tone, invalid?: boolean) =>
  cn(
    'w-full rounded-md border bg-paper px-3.5 text-[15px] outline-none transition-colors duration-300',
    'placeholder:text-fog/80 hover:border-ink/40 focus:border-ink focus-visible:outline-none',
    tone === 'dark' ? 'border-rule text-graphite' : 'border-rule text-ink bg-paper',
    invalid && 'border-accent',
  )

interface Wrap { label?: ReactNode; hint?: ReactNode; error?: string | null; tone?: Tone; className?: string }

function FieldWrap({ id, label, hint, error, className, children }: Wrap & { id: string; children: ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <label htmlFor={id} className="label text-smoke">{label}</label>}
      {children}
      {error ? <p id={`${id}-err`} className="text-sm text-accent">{error}</p>
        : hint ? <p className="text-sm text-fog">{hint}</p> : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Wrap>(function Input(
  { label, hint, error, tone = 'dark', className, id, ...rest }, ref,
) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <FieldWrap id={fid} label={label} hint={hint} error={error} className={className}>
      <input ref={ref} id={fid} aria-invalid={!!error || undefined} aria-describedby={error ? `${fid}-err` : undefined}
        className={cn(control(tone, !!error), 'h-12')} {...rest} />
    </FieldWrap>
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & Wrap>(function Textarea(
  { label, hint, error, tone = 'dark', className, id, ...rest }, ref,
) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <FieldWrap id={fid} label={label} hint={hint} error={error} className={className}>
      <textarea ref={ref} id={fid} aria-invalid={!!error || undefined} className={cn(control(tone, !!error), 'min-h-28 py-3 leading-relaxed')} {...rest} />
    </FieldWrap>
  )
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & Wrap>(function Select(
  { label, hint, error, tone = 'dark', className, id, children, ...rest }, ref,
) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <FieldWrap id={fid} label={label} hint={hint} error={error} className={className}>
      <select ref={ref} id={fid} className={cn(control(tone, !!error), 'h-12 appearance-none pr-9',
        tone === 'dark' ? '' : '')} {...rest}
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
        {children}
      </select>
    </FieldWrap>
  )
})

export function Checkbox({ label, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2.5 text-[15px]', className)}>
      <input type="checkbox" className="size-4 accent-ink" {...rest} />
      <span>{label}</span>
    </label>
  )
}
