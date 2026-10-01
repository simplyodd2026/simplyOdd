from fastapi import APIRouter, Depends

from app.core.security import admin_user

from . import catalog, customers, marketing, orders

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(admin_user)])
router.include_router(catalog.router)
router.include_router(orders.router)
router.include_router(customers.router)
router.include_router(marketing.router)
