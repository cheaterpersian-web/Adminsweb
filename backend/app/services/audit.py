from sqlalchemy.orm import Session
from typing import Any, Optional
from app.models.audit_log import AuditLog


def record_audit_event(db: Session, user_id: Optional[int], action: str, target: Optional[str] = None, meta: Optional[Any] = None) -> AuditLog:
    log = AuditLog(user_id=user_id, action=action, target=target, meta=meta)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log