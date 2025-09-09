from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.auth import require_roles
from app.models.user import User
from app.services.redis_client import get_redis

router = APIRouter()


class CommandRequest(BaseModel):
    node: str
    command: str
    params: dict | None = None


@router.post("/control/send")
async def send_command(payload: CommandRequest, _: User = Depends(require_roles(["admin", "operator"]))):
    redis = get_redis()
    channel = f"control:{payload.node}"
    await redis.publish(channel, payload.model_dump_json())
    await redis.aclose()
    return {"status": "queued"}