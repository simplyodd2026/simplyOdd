import logging
import re
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import account, catalog, chat, orders, reviews, seo
from app.api.routes.admin import router as admin_router
from app.core.config import Settings, get_settings
from app.core.container import LOCAL_MEDIA_ROOT, build_services
from app.core.middleware import BodySizeLimitMiddleware, ChatBodyLimit, RateLimitMiddleware, SecurityHeadersMiddleware
from app.repositories.store import DocumentStore

logging.basicConfig(level=logging.INFO)

UPLOAD_PATHS = re.compile(r"^/api/(me/avatar|admin/uploads|admin/products/[^/]+/images)$")
# (method, path, max requests, window seconds) per client IP. Every matching rule applies.
RATE_LIMITS = [
    ("*", r"^/api/", 600, 60),
    ("POST", r"^/api/cart/quote$", 60, 60),  # also where coupon codes are tried
    ("POST", r"^/api/cart/quote$", 600, 3600),
    ("POST", r"^/api/checkout", 20, 60),
    ("POST", r"^/api/(custom-requests|newsletter)$", 5, 60),
    ("POST", r"^/api/(custom-requests|newsletter)$", 30, 3600),
    ("POST", r"^/api/products/[^/]+/reviews$", 10, 60),
    ("POST", UPLOAD_PATHS.pattern, 30, 60),
    # Oddly Assistant. ChatService also limits each visitor/customer (CHAT_MESSAGES_PER_MINUTE/_PER_DAY).
    ("POST", r"^/api/chat/sessions$", 10, 60),
    ("POST", r"^/api/chat/message$", 20, 60),
    ("POST", r"^/api/chat/message$", 300, 3600),
    ("POST", r"^/api/chat/(enquiries|feedback)$", 10, 60),
]
# Chat requests are small; refuse anything bigger before it's parsed.
CHAT_BODY_LIMIT = 16 * 1024


def create_app(settings: Settings | None = None, store: DocumentStore | None = None, llm=None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        svc = build_services(settings, store, llm)
        app.state.services = svc
        if settings.data_backend == "memory" and settings.seed_demo_data:
            from app.seed import seed_if_empty
            await seed_if_empty(svc)
        yield

    # The interactive docs map every endpoint, so they're only served outside production.
    docs = not settings.is_production
    app = FastAPI(title="Simply Odd API", version="1.0.0", lifespan=lifespan,
                  docs_url="/api/docs" if docs else None, openapi_url="/api/openapi.json" if docs else None,
                  redoc_url=None)
    # Added innermost first: CORS is outermost so even 413/429 replies carry CORS headers.
    if settings.rate_limit:
        app.add_middleware(RateLimitMiddleware, rules=RATE_LIMITS, exempt=("/api/health",))
    app.add_middleware(BodySizeLimitMiddleware, default=1024 * 1024, uploads=32 * 1024 * 1024,
                       upload_paths=UPLOAD_PATHS)
    app.add_middleware(ChatBodyLimit, limit=CHAT_BODY_LIMIT)
    app.add_middleware(SecurityHeadersMiddleware, hsts=settings.is_production,
                       docs_paths=("/api/docs", "/api/docs/oauth2-redirect") if docs else ())
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    # Auth is a bearer token, never a cookie, so credentialed CORS isn't needed.
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=False,
                       allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
                       allow_headers=["Authorization", "Content-Type", "X-Chat-Token"])

    api = APIRouter(prefix="/api")

    @api.get("/health", tags=["meta"])
    async def health():
        return {"status": "ok", "backend": settings.data_backend}

    for r in (catalog.router, account.router, orders.router, reviews.router, chat.router, seo.router, admin_router):
        api.include_router(r)
    app.include_router(api)

    if settings.resolved_media_backend == "local":
        LOCAL_MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
        app.mount("/media", StaticFiles(directory=LOCAL_MEDIA_ROOT), name="media")
    return app


app = create_app()
