from fastapi import APIRouter, Depends

from app.core.container import Services, services
from app.models.marketing import Coupon, CouponCreate, CouponUpdate, CustomRequest, CustomRequestUpdate, Subscriber

router = APIRouter()


@router.get("/coupons", response_model=list[Coupon])
async def list_coupons(svc: Services = Depends(services)):
    return await svc.coupons.list()


@router.post("/coupons", response_model=Coupon, status_code=201)
async def create_coupon(body: CouponCreate, svc: Services = Depends(services)):
    return await svc.coupons.create(body)


@router.patch("/coupons/{cid}", response_model=Coupon)
async def update_coupon(cid: str, body: CouponUpdate, svc: Services = Depends(services)):
    return await svc.coupons.update(cid, body)


@router.delete("/coupons/{cid}", status_code=204)
async def delete_coupon(cid: str, svc: Services = Depends(services)):
    await svc.coupons.delete(cid)


@router.get("/newsletter", response_model=list[Subscriber])
async def subscribers(svc: Services = Depends(services)):
    return await svc.insights.subscribers()


@router.delete("/newsletter/{sid}", status_code=204)
async def unsubscribe(sid: str, svc: Services = Depends(services)):
    await svc.insights.unsubscribe(sid)


@router.get("/custom-requests", response_model=list[CustomRequest])
async def custom_requests(svc: Services = Depends(services)):
    return await svc.insights.custom_requests()


@router.patch("/custom-requests/{rid}", response_model=CustomRequest)
async def update_custom_request(rid: str, body: CustomRequestUpdate, svc: Services = Depends(services)):
    return await svc.insights.update_custom_request(rid, body)


@router.delete("/custom-requests/{rid}", status_code=204)
async def delete_custom_request(rid: str, svc: Services = Depends(services)):
    await svc.insights.delete_custom_request(rid)
