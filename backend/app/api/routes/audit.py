from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.core.auth import require_roles
from app.models.audit_log import AuditLog
from app.schemas.audit import AuditLogRead

router = APIRouter()


@router.get("/audit", response_model=List[AuditLogRead])
def list_audit(limit: int = 50, offset: int = 0, action: Optional[str] = None, user_id: Optional[int] = None, db: Session = Depends(get_db), _=Depends(require_roles(["admin", "operator"]))):
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action)
    if user_id is not None:
        q = q.filter(AuditLog.user_id == user_id)
    return q.order_by(AuditLog.id.desc()).offset(offset).limit(limit).all()