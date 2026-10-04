import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'light' | 'outline' | 'ghost' | 'dark' | 'outline-dark' | 'danger' | 'hot' | 'brass' | 'outline-light' | 'terra' | 'olive'
type Size = 'sm' | 'md' | 'lg'

const base =
  'group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-medium tracking-[-0.01em] whitespace-nowrap select-none ' +
  'transition-[color,background-color,border-color,transform] duration-500 ease-[var(--ease-out-quint)] active:scale-[0.97] ' +
  'disabled:opacity-35 disabled:active:scale-100'
const variants: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:bg-hot',
  dark: 'bg-ink text-paper hover:bg-hot',
  hot: 'bg-hot text-paper hover:bg-ink',
  light: 'bg-paper text-ink hover:bg-ink hover:text-paper',
  outline: 'border border-ink/80 text-ink hover:bg-ink hover:text-paper',
  'outline-dark': 'border border-ink/20 text-ink hover:border-ink',
  ghost: 'text-graphite hover:bg-ink/5 hover:text-ink',
  danger: 'border border-accent/60 text-accent hover:bg-accent hover:text-paper',
  brass: 'bg-tan text-ink hover:bg-paper',
  terra: 'bg-hot text-paper hover:bg-ink',
  olive: 'bg-olive text-paper hover:bg-ink',
  'outline-light': 'border border-paper/30 text-paper hover:border-paper hover:bg-paper hover:text-ink',
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
