import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'

/** A text link with an arrow that slides out and is replaced by a fresh one on hover. */
export function ArrowLink({ to, children, className, onClick }: { to: string; children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <Link to={to} onClick={onClick} className={cn('group inline-flex items-center gap-3 text-[15px] font-medium text-ink', className)}>
      <span className="link-draw">{children}</span>
      <span className="relative grid size-9 place-items-center overflow-hidden rounded-full border border-current/25 transition-colors duration-500 group-hover:border-ink group-hover:bg-ink group-hover:text-paper">
        <Icon name="arrowRight" size={16} className="transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:translate-x-[180%]" />
        <Icon name="arrowRight" size={16} className="absolute -translate-x-[180%] transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:translate-x-0" />
      </span>
    </Link>
  )
}
