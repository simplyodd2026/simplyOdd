import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import account, catalog, orders, reviews
from app.api.routes.admin import router as admin_router
from app.core.config import Settings, get_settings
from app.core.container import LOCAL_MEDIA_ROOT, build_services
from app.repositories.store import DocumentStore

logging.basicConfig(level=logging.INFO)


def create_app(settings: Settings | None = None, store: DocumentStore | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        svc = build_services(settings, store)
        app.state.services = svc
        if settings.data_backend == "memory" and settings.seed_demo_data:
            from app.seed import seed_if_empty
            await seed_if_empty(svc)
        yield

    app = FastAPI(title="Simply Odd API", version="1.0.0", lifespan=lifespan,
                  docs_url="/api/docs", openapi_url="/api/openapi.json")
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True,
                       allow_methods=["*"], allow_headers=["*"])
    app.add_middleware(GZipMiddleware, minimum_size=1024)

    api = APIRouter(prefix="/api")

    @api.get("/health", tags=["meta"])
    async def health():
        return {"status": "ok", "backend": settings.data_backend}

    for r in (catalog.router, account.router, orders.router, reviews.router, admin_router):
        api.include_router(r)
    app.include_router(api)

    if settings.resolved_media_backend == "local":
        LOCAL_MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
        app.mount("/media", StaticFiles(directory=LOCAL_MEDIA_ROOT), name="media")
    return app


app = create_app()
