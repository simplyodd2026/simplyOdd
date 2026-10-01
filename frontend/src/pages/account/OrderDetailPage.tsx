import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useMyOrder } from '@/lib/queries'
import type { Order } from '@/lib/types'
import { toast, toastError } from '@/stores/toast'
import { useDocumentTitle } from '@/lib/hooks'
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, date } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Overlay'
import { StatusPill } from '@/components/ui/misc'
import { PageSpinner } from '@/components/ui/Spinner'
import { OrderItems } from '@/features/account/OrderItems'
import { OrderHistory, OrderProgress } from '@/features/account/OrderTimeline'
import NotFoundPage from '../NotFoundPage'

export default function OrderDetailPage() {
  const { id = '' } = useParams()
  const { data: order, isLoading } = useMyOrder(id)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const qc = useQueryClient()
  useDocumentTitle(order ? `Order ${order.number}` : 'Order')
  if (isLoading) return <PageSpinner />
  if (!order) return <NotFoundPage />
  const a = order.address
  const cancellable = order.status === 'pending' || order.status === 'confirmed'

  const cancel = async () => {
    setBusy(true)
    try {
      const updated = await api<Order>(`/me/orders/${order.id}/cancel`, { method: 'POST' })
      qc.setQueryData(['my-order', order.id], updated)
      qc.invalidateQueries({ queryKey: ['my-orders'] })
      toast(updated.payment.status === 'refund_pending' ? 'Order cancelled. Your refund is on its way.' : 'Order cancelled')
      setConfirming(false)
    } catch (e) { toastError(e) } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/account/orders" className="text-sm text-fog hover:text-ink">All orders</Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-4xl font-display">{order.number}</h2>
            <StatusPill status={order.status} label={ORDER_STATUS_LABEL[order.status]} />
          </div>
          <p className="mt-1 text-smoke">Placed {date(order.created_at)}</p>
        </div>
        {cancellable && <Button variant="danger" onClick={() => setConfirming(true)}>Cancel order</Button>}
      </div>

      <OrderProgress order={order} />

      <div className="grid gap-12 xl:grid-cols-12">
        <div className="xl:col-span-7"><OrderItems order={order} /></div>
        <div className="flex flex-col gap-8 xl:col-span-5">
          <dl className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1">
            <div>
              <dt className="mb-2 text-sm text-fog">Delivering to</dt>
              <dd className="leading-relaxed">{a.full_name}<br />{a.line1}{a.line2 && `, ${a.line2}`}<br />{a.city}, {a.state} {a.postal_code}<br />{a.phone}</dd>
            </div>
            <div>
              <dt className="mb-2 text-sm text-fog">Payment</dt>
              <dd>{PAYMENT_STATUS_LABEL[order.payment.status]}<span className="text-smoke">, {order.payment.provider === 'cod' ? 'cash on delivery' : order.payment.provider === 'mock' ? 'test card' : order.payment.provider}</span></dd>
              {order.tracking_number && <><dt className="mb-2 mt-4 text-sm text-fog">Tracking number</dt><dd className="tabular-nums">{order.tracking_number}</dd></>}
            </div>
          </dl>
          <div>
            <h3 className="mb-4 text-sm text-fog">History</h3>
            <OrderHistory order={order} />
          </div>
        </div>
      </div>

      <Modal open={confirming} onClose={() => setConfirming(false)} title={`Cancel ${order.number}?`}>
        <p className="text-smoke">
          {order.payment.status === 'paid' ? "We'll refund the full amount to your original payment method within 5–7 business days." : "You haven't been charged, so there's nothing to refund."}
        </p>
        <div className="mt-6 flex gap-3">
          <Button variant="danger" loading={busy} onClick={cancel}>Cancel order</Button>
          <Button variant="ghost" onClick={() => setConfirming(false)}>Keep order</Button>
        </div>
      </Modal>
    </div>
  )
}
