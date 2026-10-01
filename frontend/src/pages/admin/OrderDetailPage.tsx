import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Order, OrderStatus, UserProfile } from '@/lib/types'
import { useDocumentTitle } from '@/lib/hooks'
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, dateTime, money } from '@/lib/format'
import { toast, toastError } from '@/stores/toast'
import { AdminHeader } from '@/features/admin/ui'
import { OrderItems } from '@/features/account/OrderItems'
import { OrderHistory } from '@/features/account/OrderTimeline'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Overlay'
import { PageSpinner } from '@/components/ui/Spinner'
import { StatusPill } from '@/components/ui/misc'

// Mirrors backend STATUS_FLOW (cancel/refund have their own actions).
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed'], confirmed: ['processing'], processing: ['shipped'], shipped: ['out_for_delivery', 'delivered'],
  out_for_delivery: ['delivered'], delivered: [], cancelled: [], refunded: [],
}

export default function AdminOrderDetailPage() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'order', id], queryFn: () => api<{ order: Order; customer: UserProfile | null }>(`/admin/orders/${id}`) })
  const [note, setNote] = useState('')
  const [tracking, setTracking] = useState('')
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<'cancel' | 'refund' | null>(null)
  useDocumentTitle(data ? `Order ${data.order.number}` : 'Order')
  if (isLoading || !data) return <PageSpinner />
  const { order, customer } = data
  const a = order.address

  const act = async (fn: () => Promise<Order>, msg: string) => {
    setBusy(true)
    try {
      const updated = await fn()
      qc.setQueryData(['admin', 'order', id], { order: updated, customer })
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      toast(msg)
      setNote('')
      setDialog(null)
    } catch (e) { toastError(e) } finally { setBusy(false) }
  }

  const move = (status: OrderStatus) => act(() => api<Order>(`/admin/orders/${id}/status`, {
    body: { status, note: note || null, tracking_number: tracking || null },
  }), `Marked as ${ORDER_STATUS_LABEL[status].toLowerCase()}`)

  const canCancel = ['pending', 'confirmed', 'processing'].includes(order.status)
  const canRefund = ['delivered', 'cancelled'].includes(order.status) && ['paid', 'refund_pending'].includes(order.payment.status)

  return (
    <div>
      <Link to="/admin/orders" className="text-sm text-fog hover:text-ink">All orders</Link>
      <AdminHeader title={order.number} sub={<>Placed {dateTime(order.created_at)}</>}
        actions={<><StatusPill status={order.status} label={ORDER_STATUS_LABEL[order.status]} /><StatusPill status={order.payment.status} label={PAYMENT_STATUS_LABEL[order.payment.status]} /></>} />

      <div className="grid gap-8 xl:grid-cols-12 [&>*]:min-w-0">
        <div className="flex flex-col gap-8 xl:col-span-7">
          <section className="border border-rule p-5 sm:p-6">
            <h2 className="mb-5 text-lg font-semibold">Items</h2>
            <OrderItems order={order} />
          </section>
          <section className="border border-rule p-5 sm:p-6">
            <h2 className="mb-5 text-lg font-semibold">History</h2>
            <OrderHistory order={order} />
          </section>
        </div>

        <div className="flex flex-col gap-8 xl:col-span-5">
          <section className="flex flex-col gap-4 border border-accent/40 p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Fulfilment</h2>
            {NEXT[order.status].length > 0 ? (
              <>
                {NEXT[order.status].includes('shipped') && (
                  <Input label="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder={order.tracking_number ?? ''} />
                )}
                <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Visible in the order history" />
                <div className="flex flex-wrap gap-2">
                  {NEXT[order.status].map((s) => (
                    <Button key={s} loading={busy} disabled={s === 'confirmed' && order.payment.status === 'pending'} onClick={() => move(s)}>
                      Mark as {ORDER_STATUS_LABEL[s].toLowerCase()}
                    </Button>
                  ))}
                </div>
                {order.status === 'pending' && order.payment.status === 'pending' && <p className="text-sm text-fog">Waiting for the customer to pay.</p>}
              </>
            ) : <p className="text-smoke">No further fulfilment steps.</p>}
            {order.tracking_number && <p className="text-sm text-smoke">Tracking: <span className="tabular-nums text-ink">{order.tracking_number}</span></p>}
            {(canCancel || canRefund) && (
              <div className="flex flex-wrap gap-2 border-t border-rule pt-4">
                {canCancel && <Button variant="danger" size="sm" onClick={() => setDialog('cancel')}>Cancel order</Button>}
                {canRefund && <Button variant="outline" size="sm" onClick={() => setDialog('refund')}>Process refund</Button>}
              </div>
            )}
          </section>

          <section className="border border-rule p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">Customer</h2>
            <p>{customer ? <Link to={`/admin/customers/${customer.user_id}`} className="hover:text-accent">{customer.name || customer.email}</Link> : a.full_name}</p>
            <p className="text-sm text-smoke">{order.email}<br />{a.phone}</p>
            <h3 className="mb-2 mt-5 text-sm text-fog">Ship to</h3>
            <p className="leading-relaxed">{a.full_name}<br />{a.line1}{a.line2 && `, ${a.line2}`}<br />{a.city}, {a.state} {a.postal_code}<br />{a.country}</p>
            <p className="mt-3 text-sm capitalize text-smoke">{order.shipping_method} delivery</p>
            {order.notes && <p className="mt-3 border-l-2 border-accent pl-3 text-sm">{order.notes}</p>}
          </section>

          <section className="border border-rule p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">Payment</h2>
            <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
              <dt className="text-fog">Method</dt><dd>{order.payment.provider}</dd>
              <dt className="text-fog">Status</dt><dd>{PAYMENT_STATUS_LABEL[order.payment.status]}</dd>
              <dt className="text-fog">Amount</dt><dd className="tabular-nums">{money(order.payment.amount)}</dd>
              {order.payment.reference && <><dt className="text-fog">Reference</dt><dd className="break-all">{order.payment.reference}</dd></>}
              {order.payment.transaction_id && <><dt className="text-fog">Transaction</dt><dd className="break-all">{order.payment.transaction_id}</dd></>}
              {order.payment.paid_at && <><dt className="text-fog">Paid</dt><dd>{dateTime(order.payment.paid_at)}</dd></>}
              {order.payment.refund_reference && <><dt className="text-fog">Refund ref.</dt><dd className="break-all">{order.payment.refund_reference}</dd></>}
            </dl>
          </section>
        </div>
      </div>

      <Modal open={dialog === 'cancel'} onClose={() => setDialog(null)} title={`Cancel ${order.number}?`}>
        <p className="text-smoke">Stock is returned to inventory. {order.payment.status === 'paid' ? 'The payment will be marked as awaiting refund.' : 'Nothing was collected, so there is nothing to refund.'}</p>
        <Input className="mt-4" label="Reason (shown in history)" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="mt-6 flex gap-3">
          <Button variant="danger" loading={busy} onClick={() => act(() => api<Order>(`/admin/orders/${id}/cancel`, { body: { status: 'cancelled', note: note || null } }), 'Order cancelled')}>Cancel order</Button>
          <Button variant="ghost" onClick={() => setDialog(null)}>Keep order</Button>
        </div>
      </Modal>
      <Modal open={dialog === 'refund'} onClose={() => setDialog(null)} title={`Refund ${money(order.total)}?`}>
        <p className="text-smoke">
          {order.payment.provider === 'cod' ? 'This was a cash-on-delivery order. Transfer the refund manually, then mark it refunded here.'
            : 'The refund is sent through the payment provider to the original payment method.'}
        </p>
        <Input className="mt-4" label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="mt-6 flex flex-wrap gap-3">
          <Button loading={busy} onClick={() => act(() => api<Order>(`/admin/orders/${id}/refund`, { body: { status: 'refunded', note: note || null } }), 'Refund processed')}>
            {order.payment.provider === 'cod' ? 'Mark as refunded' : 'Refund now'}
          </Button>
          {order.payment.status !== 'refund_pending' && (
            <Button variant="outline" loading={busy} onClick={() => act(() => api<Order>(`/admin/orders/${id}/refund`, { body: { status: 'refund_pending', note: note || null } }), 'Marked as refund pending')}>Mark refund pending</Button>
          )}
        </div>
      </Modal>
    </div>
  )
}
