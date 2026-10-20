/**
 * Shipping rates, shown only until /config loads. The backend owns the real values
 * (backend/app/core/constants.py) and serves them in /config; keep these in step.
 */
export const SHIPPING = {
  freeOver: 1499,
  standardFee: 199,
  expressFee: 249,
}
