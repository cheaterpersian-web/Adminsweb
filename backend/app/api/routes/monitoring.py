from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import psutil
from app.db.session import get_db
from sqlalchemy import text
from app.services.redis_client import get_redis

router = APIRouter()


@router.get("/monitoring/health")
async def health(db: Session = Depends(get_db)):
    cpu = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory()._asdict()
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
    redis_ok = True
    try:
        r = get_redis()
        await r.ping()
        await r.aclose()
    except Exception:
        redis_ok = False
    return {"cpu": cpu, "memory": mem, "database": db_ok, "redis": redis_ok}