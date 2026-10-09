from app.core.utils import new_id
from app.models.order import Order
from app.services.payments.base import PaymentProvider, StartResult, VerifyResult


class MockProvider(PaymentProvider):
    """Test-mode card processor for development and demos. The client submits
    `{"outcome": "success" | "failure"}`. Never enable in production."""

    id = "mock"
    label = "Test card"
    description = "Development only. No money moves."

    async def start(self, order: Order) -> StartResult:
        return StartResult(reference=new_id("mock_"), client_payload={"amount": order.payment.amount, "currency": order.currency})

    async def verify(self, order: Order, payload: dict) -> VerifyResult:
        if payload.get("outcome") == "success":
            return VerifyResult(ok=True, transaction_id=new_id("mocktx_"))
        return VerifyResult(ok=False, message="The test card was declined")

    async def refund(self, order: Order) -> str | None:
        return new_id("mockrf_")

