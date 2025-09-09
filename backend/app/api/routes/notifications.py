from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Any

from app.db.session import get_db
from app.core.auth import get_current_user, require_roles
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationRead
from app.services.redis_client import get_redis

router = APIRouter()


@router.get("/notifications", response_model=List[NotificationRead])
def my_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Notification).filter(Notification.to_user == current_user.id).order_by(Notification.id.desc()).limit(100).all()


@router.post("/notifications/send")
async def send_notification(to_user: int, payload: Any, db: Session = Depends(get_db), _: User = Depends(require_roles(["admin", "operator"]))):
    notif = Notification(to_user=to_user, payload=payload, status="new")
    db.add(notif)
    db.commit()
    db.refresh(notif)

    redis = get_redis()
    await redis.publish(f"notifications:{to_user}", str(payload))
    await redis.aclose()

    return {"status": "sent", "id": notif.id}