import { mockAdapter } from './mock'
import { razorpayAdapter } from './razorpay'
import type { PaymentAdapter } from './types'

export { PaymentCancelled } from './types'
export type { PaymentAdapter } from './types'

// Register new providers here (and in backend/app/services/payments).
const adapters: PaymentAdapter<any>[] = [mockAdapter, razorpayAdapter]

export const getAdapter = (id: string) => adapters.find((a) => a.id === id)
