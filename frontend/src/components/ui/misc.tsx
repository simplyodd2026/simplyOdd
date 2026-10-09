import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-sm bg-ink/[0.06]', className)} />
}

export function EmptyState({ title, body, action, className }: { title: string; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-start gap-5 border-t border-rule py-16 sm:py-20', className)}>
      <span className="label text-fog">Nothing here</span>
      <h2 className="max-w-2xl font-display text-4xl leading-[1] text-ink text-balance sm:text-6xl">{title}</h2>
      {body && <div className="max-w-md text-smoke text-pretty">{body}</div>}
      {action}
    </div>
  )
}

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1)
  return (
    <nav className="flex items-center gap-1" aria-label="Pagination">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="p-2 text-smoke hover:text-ink disabled:opacity-30" aria-label="Previous page">
        <Icon name="chevronLeft" />
      </button>
      {nums.map((n, i) => (
        <span key={n} className="flex items-center">
          {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-fog">…</span>}
          <button onClick={() => onChange(n)} aria-current={n === page ? 'page' : undefined}
            className={cn('h-10 min-w-10 px-2 tabular-nums text-[13px] transition-colors', n === page ? 'rounded-full bg-ink text-paper' : 'rounded-full text-smoke hover:bg-ink/5 hover:text-ink')}>
            {n}
          </button>
        </span>
      ))}
      <button disabled={page >= pages} onClick={() => onChange(page + 1)} className="p-2 text-smoke hover:text-ink disabled:opacity-30" aria-label="Next page">
        <Icon name="chevronRight" />
      </button>
    </nav>
  )
}

export function Stars({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${value.toFixed(1)} out of 5`} role="img">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
          <Icon name="star" size={size} strokeWidth={1.4} className="absolute inset-0 text-current opacity-30" />
          <span className="absolute inset-0 overflow-hidden" style={{ width: `${Math.max(0, Math.min(1, value - i + 1)) * 100}%` }}>
            <Icon name="star" size={size} filled strokeWidth={1.4} />
          </span>
        </span>
      ))}
    </span>
  )
}

export function StatusPill({ status, label }: { status: string; label: string }) {
  const tone =
    ['cancelled', 'refunded', 'failed', 'void'].includes(status) ? 'text-fog border-rule'
      : ['pending', 'partially_paid', 'refund_pending', 'cod_due'].includes(status) ? 'text-accent border-accent/50'
        : status === 'delivered' || status === 'paid' ? 'text-ink border-graphite/40'
          : 'text-graphite border-graphite/25'
  return <span className={cn('inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium', tone)}>{label}</span>
}
