from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware
from fastapi.responses import ORJSONResponse

from app.core.config import get_settings

settings = get_settings()

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
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# Routers
from app.api.routes import auth, users, configs, audit, control, monitoring, ws  # noqa: E402

app.include_router(auth.router, prefix=settings.api_prefix, tags=["auth"])
app.include_router(users.router, prefix=settings.api_prefix, tags=["users"])
app.include_router(configs.router, prefix=settings.api_prefix, tags=["configs"])
app.include_router(audit.router, prefix=settings.api_prefix, tags=["audit"])
app.include_router(control.router, prefix=settings.api_prefix, tags=["control"])
app.include_router(monitoring.router, prefix=settings.api_prefix, tags=["monitoring"])
app.include_router(ws.router, tags=["ws"])  # path defined inside router


@app.get("/")
async def root():
    return {"message": "Marzban Admin Panel API"}