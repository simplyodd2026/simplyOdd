"""Oddly Assistant endpoints. Each request proves it owns its conversation with the
X-Chat-Token header issued by POST /chat/sessions; signed-in conversations also
need the same account's bearer token."""
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, status

from app.core.container import Services, services
from app.core.security import optional_user
from app.models.chat import (
    ChatReply, EnquiryIn, EnquiryOut, FeedbackIn, HistoryOut, MessageIn, SessionCreate, SessionOut, SessionId,
)
from app.models.user import AuthUser

log = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

ChatToken = Header(default=None, alias="X-Chat-Token", max_length=100)


@router.post("/sessions", response_model=SessionOut, status_code=201)
async def create_session(body: SessionCreate, user: AuthUser | None = Depends(optional_user),
                         svc: Services = Depends(services)):
    return await svc.chat.create_session(body.visitor_id, user)


@router.post("/message", response_model=ChatReply)
async def message(body: MessageIn, bg: BackgroundTasks, token: str | None = ChatToken,
                  user: AuthUser | None = Depends(optional_user), svc: Services = Depends(services)):
    session = await svc.chat.authorize(body.session_id, token, user)
    try:
        reply, events = await svc.chat.handle_message(session, user, body.message)
    except HTTPException:
        raise
    except Exception:
        # A store failure or a bug: never leak details, and never take the shop down with it.
        log.exception("Assistant failed to answer in session %s", body.session_id)
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,
                            "The assistant is having trouble right now. You can still browse and search the shop.")
    bg.add_task(svc.chat.record, events)
    return reply


@router.get("/history/{session_id}", response_model=HistoryOut)
async def history(session_id: SessionId, token: str | None = ChatToken,
                  user: AuthUser | None = Depends(optional_user), svc: Services = Depends(services)):
    session = await svc.chat.authorize(session_id, token, user)
    return await svc.chat.history(session)


@router.post("/enquiries", response_model=EnquiryOut, status_code=201)
async def enquiry(body: EnquiryIn, bg: BackgroundTasks, token: str | None = ChatToken,
                  user: AuthUser | None = Depends(optional_user), svc: Services = Depends(services)):
    session = await svc.chat.authorize(body.session_id, token, user)
    out, events = await svc.chat.submit_enquiry(session, user, body)
    bg.add_task(svc.chat.record, events)
    return out


@router.post("/feedback")
async def feedback(body: FeedbackIn, bg: BackgroundTasks, token: str | None = ChatToken,
                   user: AuthUser | None = Depends(optional_user), svc: Services = Depends(services)):
    session = await svc.chat.authorize(body.session_id, token, user)
    bg.add_task(svc.chat.record, await svc.chat.feedback(session, body))
    return {"ok": True}
