import type { PaymentAdapter } from './types'

export const codAdapter: PaymentAdapter = {
  id: 'cod',
  cta: () => 'Place order',
  // Nothing to collect online: the backend confirms cash-on-delivery orders straight away.
  collect: async () => ({}),
}
