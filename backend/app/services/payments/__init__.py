import logging

from app.core.config import Settings
from app.services.payments.base import PaymentProvider, PaymentRegistry
from app.services.payments.razorpay import RazorpayProvider
from app.services.payments.simple import MockProvider

log = logging.getLogger(__name__)


def build_registry(settings: Settings) -> PaymentRegistry:
    providers: list[PaymentProvider] = []
    for pid in settings.payment_providers:
        if pid == "mock":
            if settings.is_production:
                raise RuntimeError("The mock payment provider cannot be enabled in production")
            providers.append(MockProvider())
        elif pid == "cod":
            # Cash on delivery was removed; skip it so an old env var doesn't stop the app booting.
            log.warning("Ignoring the removed 'cod' payment provider; drop it from PAYMENT_PROVIDERS")
        elif pid == "razorpay":
            if not (settings.razorpay_key_id and settings.razorpay_key_secret):
                raise RuntimeError("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required for razorpay")
            providers.append(RazorpayProvider(settings.razorpay_key_id, settings.razorpay_key_secret))
        else:
            raise RuntimeError(f"Unknown payment provider '{pid}'")
    return PaymentRegistry(providers)
