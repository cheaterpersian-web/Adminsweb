from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.middleware import SlowAPIMiddleware
from fastapi.responses import ORJSONResponse
from fastapi.responses import JSONResponse
import logging
import uuid

from app.core.config import get_settings
from app.core.limiter import limiter
from app.core.logging import configure_logging

settings = get_settings()
configure_logging()

app = FastAPI(
    title=settings.project_name,
    default_response_class=ORJSONResponse,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiter
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# Routers
from app.api.routes import auth, users, configs, audit, control, monitoring, ws, notifications, panels, plans, wallet  # noqa: E402

app.include_router(auth.router, prefix=settings.api_prefix, tags=["auth"])
app.include_router(users.router, prefix=settings.api_prefix, tags=["users"])
app.include_router(configs.router, prefix=settings.api_prefix, tags=["configs"])
app.include_router(audit.router, prefix=settings.api_prefix, tags=["audit"])
app.include_router(control.router, prefix=settings.api_prefix, tags=["control"])
app.include_router(monitoring.router, prefix=settings.api_prefix, tags=["monitoring"])
app.include_router(panels.router, prefix=settings.api_prefix, tags=["panels"])
app.include_router(plans.router, prefix=settings.api_prefix, tags=["plans"])
app.include_router(wallet.router, prefix=settings.api_prefix, tags=["wallet"])
app.include_router(notifications.router, prefix=settings.api_prefix, tags=["notifications"])
app.include_router(ws.router, tags=["ws"])  # path defined inside router


@app.get("/")
async def root():
    return {"message": "Marzban Admin Panel API"}


@app.middleware("http")
async def add_trace_and_log_exceptions(request: Request, call_next):
    """Attach a per-request trace_id and log unhandled exceptions with it.

    In non-production envs, include error detail in response; otherwise a generic message.
    """
    trace_id = uuid.uuid4().hex[:12]
    request.state.trace_id = trace_id
    logger = logging.getLogger("app")
    try:
        response = await call_next(request)
        # Add trace id header for easier correlation
        response.headers["X-Trace-Id"] = trace_id
        return response
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unhandled error (trace_id=%s) path=%s", trace_id, request.url.path)
        is_prod = settings.env.lower() in {"prod", "production"}
        payload = {
            "detail": "Internal Server Error",
            "trace_id": trace_id,
        }
        if (not is_prod) or settings.expose_errors_public:
            payload["error"] = str(exc)
        return JSONResponse(status_code=500, content=payload)