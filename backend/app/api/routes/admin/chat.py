from fastapi import APIRouter, Depends, Query

from app.core.container import Services, services

router = APIRouter(prefix="/chat")


@router.get("/analytics")
async def chat_analytics(days: int = Query(30, ge=1, le=365), svc: Services = Depends(services)):
    """Numbers for an assistant dashboard: conversations, intents, failures, tokens, latency, top products."""
    return await svc.chat.analytics(days)


@router.post("/cleanup")
async def chat_cleanup(svc: Services = Depends(services)):
    """Delete expired conversations. Safe to call from Cloud Scheduler as an admin."""
    return await svc.chat.cleanup_expired()
