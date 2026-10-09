const formatters = new Map<string, Intl.NumberFormat>()

export function money(value: number, currency = 'INR') {
  const exact = Math.round(value * 100) % 100 !== 0
  const key = `${currency}-${exact}`
  if (!formatters.has(key)) {
    formatters.set(key, new Intl.NumberFormat('en-IN', {
      style: 'currency', currency, minimumFractionDigits: exact ? 2 : 0, maximumFractionDigits: exact ? 2 : 0,
    }))
  }
  return formatters.get(key)!.format(value)
}

export const date = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  new Date(iso).toLocaleDateString('en-IN', opts)

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Awaiting payment',
  confirmed: 'Confirmed',
  processing: 'Being made',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Awaiting payment',
  authorized: 'Authorised',
  paid: 'Paid',
  partially_paid: '50% paid',
  failed: 'Failed',
  refund_pending: 'Refund pending',
  refunded: 'Refunded',
  cod_due: 'Due on delivery',
  void: 'Not collected',
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
