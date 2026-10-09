"""Payment provider contract.

Checkout never branches on a provider name: it asks the registry for a
provider and calls `start` / `verify` / `refund`. The client receives the
opaque `client_payload` from `start` and hands it to a matching frontend
adapter (src/features/checkout/payments/*). Adding Stripe means one class
here and one adapter there.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from app.models.order import Order


@dataclass
class StartResult:
    reference: str | None
    # The client completes payment with this, then calls /confirm.
    client_payload: dict = field(default_factory=dict)


@dataclass
class VerifyResult:
    ok: bool
    transaction_id: str | None = None
    message: str | None = None


class PaymentProvider(ABC):
    id: str
    label: str
    description: str = ""

    @abstractmethod
    async def start(self, order: Order) -> StartResult: ...

    @abstractmethod
    async def verify(self, order: Order, payload: dict) -> VerifyResult: ...

    async def refund(self, order: Order) -> str | None:
        """Issue a refund with the provider. Returns a provider refund id."""
        return None

    def public_info(self) -> dict:
        return {"id": self.id, "label": self.label, "description": self.description}


class PaymentRegistry:
    def __init__(self, providers: list[PaymentProvider]):
        self._providers = {p.id: p for p in providers}

    def get(self, provider_id: str) -> PaymentProvider | None:
        return self._providers.get(provider_id)

    def public(self) -> list[dict]:
        return [p.public_info() for p in self._providers.values()]
