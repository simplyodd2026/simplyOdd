from fastapi import APIRouter, Depends, Query

from app.core.container import Services, services

router = APIRouter(prefix="/chat")


@router.get("/searches")
async def chat_searches(limit: int = Query(25, ge=1, le=100), svc: Services = Depends(services)):
    """What shoppers ask the assistant for: top keywords and categories, searches with no match, and the
    pieces shown and asked about most."""
    return await svc.chat.search_insights(limit)


@router.post("/cleanup")
async def chat_cleanup(svc: Services = Depends(services)):
    """Delete expired conversations (the Firestore TTL policy normally does this)."""
    return await svc.chat.cleanup_expired()
