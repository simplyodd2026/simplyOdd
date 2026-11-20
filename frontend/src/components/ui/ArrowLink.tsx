import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'

/** A text link with an arrow that slides out and is replaced by a fresh one on hover.
 *  `action` turns it into a navy primary button (same tokens as Button's primary), for links that are
 *  the main call to action of their section. */
export function ArrowLink({ to, children, className, onClick, action = false }:
  { to: string; children: ReactNode; className?: string; onClick?: () => void; action?: boolean }) {
  return (
    <Link to={to} onClick={onClick}
      className={cn('group inline-flex items-center gap-3 text-[15px] font-medium',
        action
          ? 'h-12 rounded-full bg-action pl-6 pr-1.5 text-white transition-colors duration-300 hover:bg-action-hover active:bg-action-active'
          : 'text-ink',
        className)}>
      <span className={action ? undefined : 'link-draw'}>{children}</span>
      <span className={cn('relative grid size-9 place-items-center overflow-hidden rounded-full transition-colors duration-500',
        action
          ? 'bg-white/15 group-hover:bg-white group-hover:text-action'
          : 'border border-current/25 group-hover:border-ink group-hover:bg-ink group-hover:text-paper')}>
        <Icon name="arrowRight" size={16} className="transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:translate-x-[180%]" />
        <Icon name="arrowRight" size={16} className="absolute -translate-x-[180%] transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:translate-x-0" />
      </span>
    </Link>
  )
}
