import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'light' | 'outline-light'
type Size = 'sm' | 'md' | 'lg'

const base =
  'group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full border font-sans font-medium tracking-[-0.01em] whitespace-nowrap select-none ' +
  'transition-[color,background-color,border-color,transform] duration-300 ease-[var(--ease-out-quint)] active:scale-[0.98] ' +
  'disabled:pointer-events-none disabled:opacity-40'
// The action hierarchy. Every action group gets ONE primary; the rest are secondary or tertiary.
//   primary   navy fill, white type: the most important action (Buy now, Check out, Place order, Save)
//   secondary brown outline on ivory, filling brown on hover: supporting actions (Add to bag, Cancel, View bag)
//   tertiary  quiet text: low-priority actions (Clear, Turn off, View in store)
// All share height, padding, radius, weight and border width (secondary's 1px border is matched by a
// transparent one), so mixed groups line up. `danger` is the one off-palette exception, for
// irreversible actions; `light` / `outline-light` are for dark or coloured bands.
const variants: Record<Variant, string> = {
  primary: 'border-transparent bg-action text-white hover:bg-action-hover active:bg-action-active',
  secondary: 'border-ink bg-transparent text-ink hover:bg-ink hover:text-paper active:bg-night',
  tertiary: 'border-transparent text-smoke hover:text-ink hover:bg-ink/[0.04] active:bg-ink/[0.08]',
  danger: 'border-accent/60 text-accent hover:bg-accent hover:text-paper',
  light: 'border-transparent bg-paper text-ink hover:bg-paper-2 active:bg-paper-3',
  'outline-light': 'border-paper/30 text-paper hover:border-paper hover:bg-paper hover:text-ink',
}
const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-11 px-6 text-[14px]',
  lg: 'h-14 px-8 text-[15px]',
}

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', className?: string) =>
  cn(base, variants[variant], sizes[size], className)

/** Plain-text labels roll upward on hover: the old copy leaves, a fresh one arrives from below. */
export function Roll({ children }: { children: ReactNode }) {
  if (typeof children !== 'string') return <>{children}</>
  return (
    <span className="relative block overflow-hidden">
      <span className="block transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover/btn:-translate-y-full">{children}</span>
      <span aria-hidden="true" className="absolute inset-0 block translate-y-full transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover/btn:translate-y-0">{children}</span>
    </span>
  )
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, type = 'button', ...rest }, ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading}
      aria-busy={loading || undefined} {...rest}>
      {loading && <Spinner size={16} />}
      <Roll>{children}</Roll>
    </button>
  )
})

export function ButtonLink({ variant = 'primary', size = 'md', className, children, ...rest }:
  LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest}><Roll>{children as ReactNode}</Roll></Link>
}
