/**
 * Shipping rates, shown only until /config loads. The backend owns the real values
 * (backend/app/core/constants.py) and serves them in /config; keep these in step.
 */
/** Most of one piece a bag can hold, across all its colours. Mirrors MAX_PER_PRODUCT in the backend. */
export const MAX_PER_PRODUCT = 10

export const SHIPPING = {
  freeOver: 1499,
  standardFee: 199,
  expressFee: 249,
}
