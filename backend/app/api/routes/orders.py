from fastapi import APIRouter, Depends

from app.core.container import Services, services
from app.core.security import current_user
from app.models.order import CheckoutRequest, CheckoutResponse, Order, PaymentConfirm
from app.models.user import AuthUser

router = APIRouter(tags=["orders"])


@router.post("/checkout", response_model=CheckoutResponse, status_code=201)
async def checkout(body: CheckoutRequest, user: AuthUser = Depends(current_user), svc: Services = Depends(services)):
    order, payment = await svc.orders.checkout(user, body)
    # The bag has become an order; clear the saved bag.
    await svc.accounts.put_cart(user.uid, [])
    return CheckoutResponse(order=order, payment=payment)


@router.post("/orders/{order_id}/payment/confirm", response_model=Order)
async def confirm_payment(order_id: str, body: PaymentConfirm, user: AuthUser = Depends(current_user),
                          svc: Services = Depends(services)):
    return await svc.orders.confirm_payment(user, order_id, body.payload)


@router.post("/orders/{order_id}/payment/restart", response_model=CheckoutResponse)
async def restart_payment(order_id: str, user: AuthUser = Depends(current_user), svc: Services = Depends(services)):
    order, payment = await svc.orders.restart_payment(user, order_id)
    return CheckoutResponse(order=order, payment=payment)


@router.get("/me/orders", response_model=list[Order])
async def my_orders(user: AuthUser = Depends(current_user), svc: Services = Depends(services)):
    return await svc.orders.list_for_user(user.uid)


@router.get("/me/orders/{order_id}", response_model=Order)
async def my_order(order_id: str, user: AuthUser = Depends(current_user), svc: Services = Depends(services)):
    return await svc.orders.get_for_user(user, order_id)


@router.post("/me/orders/{order_id}/cancel", response_model=Order)
async def cancel_order(order_id: str, user: AuthUser = Depends(current_user), svc: Services = Depends(services)):
    return await svc.orders.cancel_by_customer(user, order_id)
