from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import jwt, JWTError
from app.core.config import get_settings
from app.services.redis_client import get_redis

router = APIRouter()
settings = get_settings()


@router.websocket("/ws/notifications")
async def websocket_notifications(ws: WebSocket):
    await ws.accept()
    token = ws.query_params.get("token")
    if not token:
        await ws.close(code=4401)
        return
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "access":
            await ws.close(code=4401)
            return
        user_id = payload.get("sub")
    except JWTError:
        await ws.close(code=4401)
        return
    redis = get_redis()
    pubsub = redis.pubsub()
    channel = f"notifications:{user_id}"
    await pubsub.subscribe(channel)
    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=10.0)
            if message and message.get("type") == "message":
                data = message.get("data")
                await ws.send_text(data)
    except WebSocketDisconnect:
        pass
    finally:
        try:
            await pubsub.unsubscribe(channel)
            await pubsub.aclose()
        finally:
            await redis.aclose()