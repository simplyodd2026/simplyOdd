from fastapi import APIRouter, Depends

from app.core.container import Services, services
from app.core.security import admin_user
from app.models.common import Schema
from app.models.order import Order, OrderStatus, PaymentStatus, RefundRequest, StatusUpdate
from app.models.user import AuthUser, UserProfile

router = APIRouter()


@router.get("/dashboard")
async def dashboard(days: int = 30, svc: Services = Depends(services)):
    return await svc.insights.dashboard(max(7, min(days, 365)))


@router.get("/orders", response_model=list[Order])
async def list_orders(status: OrderStatus | None = None, payment_status: PaymentStatus | None = None,
                      q: str | None = None, svc: Services = Depends(services)):
    return await svc.orders.list_all(status=status, q=q, payment_status=payment_status)


class OrderDetail(Schema):
    order: Order
    customer: UserProfile | None


@router.get("/orders/{order_id}", response_model=OrderDetail)
async def get_order(order_id: str, svc: Services = Depends(services)):
    order = await svc.orders.get(order_id)
    try:
        customer = await svc.accounts.get_profile(order.user_id)
    except Exception:
        customer = None
    return OrderDetail(order=order, customer=customer)


@router.post("/orders/{order_id}/status", response_model=Order)
async def update_status(order_id: str, body: StatusUpdate, admin: AuthUser = Depends(admin_user),
                        svc: Services = Depends(services)):
    return await svc.orders.update_status(order_id, body.status, body.note, body.tracking_number, admin)


@router.post("/orders/{order_id}/cancel", response_model=Order)
async def cancel(order_id: str, body: StatusUpdate | None = None, admin: AuthUser = Depends(admin_user),
                 svc: Services = Depends(services)):
    return await svc.orders.update_status(order_id, "cancelled", body.note if body else None, None, admin)


@router.post("/orders/{order_id}/refund", response_model=Order)
async def refund(order_id: str, body: RefundRequest, admin: AuthUser = Depends(admin_user),
                 svc: Services = Depends(services)):
    return await svc.orders.refund(order_id, body.note, body.status, admin)
