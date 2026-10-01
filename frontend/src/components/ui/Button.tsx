import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'light' | 'outline' | 'ghost' | 'dark' | 'outline-dark' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 font-semibold tracking-tight transition-[color,background-color,border-color,transform] duration-200 ' +
  'rounded-full select-none active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 whitespace-nowrap'
const variants: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:bg-accent',
  light: 'bg-paper text-ink shadow-sm hover:bg-ink hover:text-paper',
  outline: 'border-2 border-ink text-ink hover:bg-ink hover:text-paper',
  ghost: 'text-graphite hover:text-ink hover:bg-black/5',
  dark: 'bg-ink text-paper hover:bg-accent',
  'outline-dark': 'border-2 border-ink/20 text-ink hover:border-accent hover:text-accent',
  danger: 'border-2 border-accent/60 text-accent hover:bg-accent hover:text-paper',
}
const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-[15px]',
  lg: 'h-14 px-8 text-base',
}

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', className?: string) =>
  cn(base, variants[variant], sizes[size], className)

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
      {children}
    </button>
  )
})

export function ButtonLink({ variant = 'primary', size = 'md', className, ...rest }:
  LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />
}
