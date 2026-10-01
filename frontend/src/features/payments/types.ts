import type { ComponentType } from 'react'

/**
 * Frontend half of the payment provider contract. The backend's `start()`
 * returns an opaque payload; the matching adapter turns it into whatever the
 * provider's SDK needs and resolves with the payload for /payment/confirm.
 * React never decides whether a payment succeeded; the backend verifies it.
 */
export interface PaymentAdapter<PanelState = unknown> {
  id: string
  /** Optional UI shown while this method is selected. */
  Panel?: ComponentType<{ value: PanelState; onChange: (v: PanelState) => void }>
  initialState?: PanelState
  /** Short label for the pay button. */
  cta?: (amount: string) => string
  collect(payment: Record<string, unknown>, state: PanelState): Promise<Record<string, unknown>>
}

export class PaymentCancelled extends Error {
  constructor() { super('Payment was cancelled. Your order is saved; you can try again.') }
}
