import type { PaymentAdapter } from './types'

export const codAdapter: PaymentAdapter = {
  id: 'cod',
  cta: () => 'Place order',
  Panel: () => <p className="mt-3 text-sm text-smoke">Pay in cash or by UPI when your order arrives. Have the exact amount ready if paying in cash.</p>,
  // Nothing to collect online: the backend confirms COD orders immediately.
  collect: async () => ({}),
}
