from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.core.auth import require_roles
from app.models.audit_log import AuditLog
from app.schemas.audit import AuditLogRead

router = APIRouter()


@router.get("/audit", response_model=List[AuditLogRead])
def list_audit(limit: int = 50, offset: int = 0, db: Session = Depends(get_db), _=Depends(require_roles(["admin", "operator"]))):
    return db.query(AuditLog).order_by(AuditLog.id.desc()).offset(offset).limit(limit).all()