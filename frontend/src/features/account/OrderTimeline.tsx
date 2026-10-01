import type { Order } from '@/lib/types'
import { ORDER_STATUS_LABEL, dateTime } from '@/lib/format'
import { cn } from '@/lib/cn'

const HAPPY_PATH = ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'] as const

export function OrderProgress({ order }: { order: Order }) {
  if (['cancelled', 'refunded', 'pending'].includes(order.status)) return null
  const current = HAPPY_PATH.indexOf(order.status as (typeof HAPPY_PATH)[number])
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Delivery progress">
      {HAPPY_PATH.map((s, i) => (
        <li key={s} className="flex flex-col gap-2">
          <span className={cn('h-1', i <= current ? 'bg-accent' : 'bg-rule')} />
          <span className={cn('text-xs leading-tight sm:text-sm', i <= current ? 'text-ink' : 'text-fog')}>{ORDER_STATUS_LABEL[s]}</span>
        </li>
      ))}
    </ol>
  )
}

export function OrderHistory({ order }: { order: Order }) {
  return (
    <ol className="flex flex-col gap-3 border-l border-rule pl-5">
      {[...order.history].reverse().map((h, i) => (
        <li key={i} className="relative">
          <span className={cn('absolute -left-[25px] top-1.5 size-2 rounded-full', i === 0 ? 'bg-accent' : 'bg-rule')} />
          <p className={cn('text-[15px]', i === 0 ? 'text-ink' : 'text-smoke')}>{ORDER_STATUS_LABEL[h.status]}{h.note && <span className="text-fog">. {h.note}</span>}</p>
          <p className="text-sm tabular-nums text-fog">{dateTime(h.at)}</p>
        </li>
      ))}
    </ol>
  )
}
