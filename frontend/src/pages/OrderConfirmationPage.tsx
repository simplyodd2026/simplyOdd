import { useParams } from 'react-router-dom'
import { useMyOrder } from '@/lib/queries'
import { useDocumentTitle } from '@/lib/hooks'
import { PAYMENT_STATUS_LABEL } from '@/lib/format'
import { Container } from '@/components/layout/Container'
import { ButtonLink } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { OrderItems } from '@/features/account/OrderItems'
import { OrderProgress } from '@/features/account/OrderTimeline'
import NotFoundPage from './NotFoundPage'

export default function OrderConfirmationPage() {
  const { id = '' } = useParams()
  const { data: order, isLoading } = useMyOrder(id)
  useDocumentTitle(order ? `Order ${order.number}` : 'Order')
  if (isLoading) return <PageSpinner />
  if (!order) return <NotFoundPage />
  const a = order.address

  return (
    <Container className="pt-10 sm:pt-16">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="text-smoke">Order {order.number}</p>
          <h1 className="mt-3 text-[length:var(--text-title)] font-display leading-[0.95] text-balance">
            {order.status === 'pending' ? 'Your order is waiting for payment.' : 'Thank you. Your order is in.'}
          </h1>
          <p className="mt-6 max-w-lg text-lg text-smoke">
            {order.status === 'pending'
              ? 'We’ve saved your order but haven’t received payment yet. You can finish paying from your account.'
              : `We'll start printing shortly. Updates go to ${order.email}, and you can follow the order from your account.`}
          </p>
          <div className="mt-10"><OrderProgress order={order} /></div>
          <dl className="mt-10 grid gap-8 border-t border-rule pt-8 sm:grid-cols-2">
            <div>
              <dt className="mb-2 text-sm text-fog">Delivering to</dt>
              <dd className="leading-relaxed">{a.full_name}<br />{a.line1}{a.line2 && `, ${a.line2}`}<br />{a.city}, {a.state} {a.postal_code}<br />{a.phone}</dd>
            </div>
            <div>
              <dt className="mb-2 text-sm text-fog">Payment</dt>
              <dd>{PAYMENT_STATUS_LABEL[order.payment.status]}</dd>
              <dt className="mb-2 mt-4 text-sm text-fog">Delivery</dt>
              <dd className="capitalize">{order.shipping_method}</dd>
            </div>
          </dl>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink to={`/account/orders/${order.id}`} variant="light">View order</ButtonLink>
            <ButtonLink to="/shop" variant="outline">Keep browsing</ButtonLink>
          </div>
        </div>
        <aside className="lg:col-span-5">
          <div className="border border-rule bg-paper-2 p-6">
            <h2 className="mb-6 text-2xl font-display">What you ordered</h2>
            <OrderItems order={order} />
          </div>
        </aside>
      </div>
    </Container>
  )
}
