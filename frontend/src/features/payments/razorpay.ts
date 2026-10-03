import { PaymentCancelled, type PaymentAdapter } from './types'

declare global {
  interface Window { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void } }
}

let loader: Promise<void> | null = null
const loadScript = () =>
  (loader ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve()
    s.onerror = () => { loader = null; reject(new Error("Couldn't load the payment window. Check your connection.")) }
    document.body.appendChild(s)
  }))

export const razorpayAdapter: PaymentAdapter = {
  id: 'razorpay',
  cta: (amount) => `Pay ${amount}`,
  collect: async (payment) => {
    await loadScript()
    return new Promise((resolve, reject) => {
      const rzp = new window.Razorpay!({
        key: payment.key,
        order_id: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        name: payment.name,
        description: payment.description,
        prefill: payment.prefill,
        theme: { color: '#9B2C2C' },
        handler: (res: Record<string, unknown>) => resolve(res),
        modal: { ondismiss: () => reject(new PaymentCancelled()) },
      })
      rzp.on('payment.failed', () => reject(new Error('The payment was declined. Try another method.')))
      rzp.open()
    })
  },
}
