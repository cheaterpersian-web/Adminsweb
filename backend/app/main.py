from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.middleware import SlowAPIMiddleware
from fastapi.responses import ORJSONResponse

from app.core.config import get_settings
from app.core.limiter import limiter

settings = get_settings()

# Check if we're in development mode and need to use fallback database
try:
    from app.db.session import engine
    with engine.connect() as conn:
        conn.execute("SELECT 1")
    print("Using PostgreSQL database")
except Exception as e:
    print(f"PostgreSQL not available: {e}")
    print("Switching to development mode with SQLite fallback")
    # Import and use development configuration
    from app.core.dev_config import get_dev_engine, get_dev_session
    import app.db.session
    app.db.session.engine = get_dev_engine()
    app.db.session.SessionLocal = get_dev_session()

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
from app.api.routes import auth, users, configs, audit, control, monitoring, ws, notifications, panels, marzban_search, sudo_controls  # noqa: E402

app.include_router(auth.router, prefix=settings.api_prefix, tags=["auth"])
app.include_router(users.router, prefix=settings.api_prefix, tags=["users"])
app.include_router(configs.router, prefix=settings.api_prefix, tags=["configs"])
app.include_router(audit.router, prefix=settings.api_prefix, tags=["audit"])
app.include_router(control.router, prefix=settings.api_prefix, tags=["control"])
app.include_router(monitoring.router, prefix=settings.api_prefix, tags=["monitoring"])
app.include_router(panels.router, prefix=settings.api_prefix, tags=["panels"])
app.include_router(marzban_search.router, prefix=settings.api_prefix, tags=["marzban-search"])
app.include_router(sudo_controls.router, prefix=settings.api_prefix, tags=["sudo-controls"])
app.include_router(notifications.router, prefix=settings.api_prefix, tags=["notifications"])
app.include_router(ws.router, tags=["ws"])  # path defined inside router


@app.get("/")
async def root():
    return {"message": "Marzban Admin Panel API"}