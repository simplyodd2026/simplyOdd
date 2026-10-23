"""Razorpay Standard Checkout.

Flow: start() creates a Razorpay order server-side → the client opens
checkout.js with the returned payload → on success the client posts
{razorpay_order_id, razorpay_payment_id, razorpay_signature} to
/checkout/confirm → verify() checks the HMAC signature and that the Razorpay
order was for this shopper and this amount.
"""
import hashlib
import hmac
import time

import httpx

from app.models.order import Order
from app.services.payments.base import PaymentProvider, StartResult, VerifyResult

API = "https://api.razorpay.com/v1"
MIN_AMOUNT = 100  # Razorpay rejects orders under ₹1 (100 paise)
# Coupons valid when payment started are honoured at confirm, so don't accept stale payment sessions.
MAX_SESSION_AGE = 24 * 3600


class RazorpayError(RuntimeError):
    pass


class RazorpayProvider(PaymentProvider):
    id = "razorpay"
    label = "Card, UPI or netbanking"
    description = "Secure payment via Razorpay."

    def __init__(self, key_id: str, key_secret: str, brand_name: str = "Simply Odd"):
        self.key_id = key_id
        self.key_secret = key_secret
        self.brand_name = brand_name

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(base_url=API, auth=(self.key_id, self.key_secret), timeout=15)

    async def start(self, order: Order) -> StartResult:
        amount = round(order.payment.amount * 100)  # due now, in the smallest currency unit
        if amount < MIN_AMOUNT:
            raise RazorpayError(f"Checkout {order.id} is below Razorpay's minimum of {MIN_AMOUNT} paise")
        async with self._client() as c:
            r = await c.post("/orders", json={"amount": amount, "currency": order.currency, "receipt": order.id,
                                              "notes": {"user_id": order.user_id}})
        if r.status_code == 401:
            raise RazorpayError("Razorpay rejected the API keys; check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET")
        if r.is_error:
            raise RazorpayError(f"Razorpay order creation failed ({r.status_code}): {r.text}")
        rp_order = r.json()
        return StartResult(reference=rp_order["id"], client_payload={
            "key": self.key_id, "order_id": rp_order["id"], "amount": amount, "currency": order.currency,
            "name": self.brand_name, "description": f"{self.brand_name} order",
            "prefill": {"name": order.address.full_name, "email": order.email, "contact": order.address.phone},
        })

    async def verify(self, order: Order, payload: dict) -> VerifyResult:
        order_id = payload.get("razorpay_order_id")
        payment_id = payload.get("razorpay_payment_id")
        signature = payload.get("razorpay_signature", "")
        if not order_id or not payment_id or order_id != order.payment.reference:
            return VerifyResult(ok=False, message="Payment details don't match this order")
        expected = hmac.new(self.key_secret.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            return VerifyResult(ok=False, message="Payment signature could not be verified")
        # The signature proves Razorpay took a payment for this Razorpay order; check it was for this bag.
        async with self._client() as c:
            r = await c.get(f"/orders/{order_id}")
        if r.is_error:
            return VerifyResult(ok=False, message="We couldn't check your payment with Razorpay. Try again in a moment.")
        rp_order = r.json()
        if (rp_order.get("amount") != round(order.payment.amount * 100) or rp_order.get("currency") != order.currency
                or (rp_order.get("notes") or {}).get("user_id") != order.user_id):
            return VerifyResult(ok=False, message="This payment doesn't match your bag. Contact us and we'll sort it out.")
        if time.time() - rp_order.get("created_at", 0) > MAX_SESSION_AGE:
            return VerifyResult(ok=False, message="This payment session has expired. Contact us and we'll sort it out.")
        return VerifyResult(ok=True, transaction_id=payment_id)

    async def refund(self, order: Order) -> str | None:
        if not order.payment.transaction_id:
            return None
        async with self._client() as c:
            r = await c.post(f"/payments/{order.payment.transaction_id}/refund",
                             json={"amount": round(order.payment.amount * 100)})
            r.raise_for_status()
            return r.json().get("id")
