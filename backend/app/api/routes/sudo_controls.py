"""
Sudo admin controls for complete operator supervision
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import httpx

from app.db.session import get_db
from app.models.user import User
from app.models.panel import Panel
from app.models.user_panel_credentials import UserPanelCredential
from app.models.audit_log import AuditLog
from app.core.auth import require_root_admin, get_current_user
from pydantic import BaseModel

router = APIRouter()


class OperatorActivity(BaseModel):
    """Operator activity information"""
    user_id: int
    username: str
    name: str
    last_login: Optional[datetime]
    panel_count: int
    total_users_created: int
    last_activity: Optional[datetime]
    is_active: bool


class PanelActivity(BaseModel):
    """Panel activity information"""
    panel_id: int
    panel_name: str
    panel_url: str
    operator_count: int
    total_users: int
    last_user_created: Optional[datetime]
    is_accessible: bool


class SudoControlAction(BaseModel):
    """Sudo control action"""
    action: str  # "suspend", "activate", "reset_password", "revoke_access"
    target_user_id: int
    reason: Optional[str] = None
    new_password: Optional[str] = None


class SudoControlResponse(BaseModel):
    """Response for sudo control actions"""
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None


@router.get("/sudo/operators", response_model=List[OperatorActivity])
def get_operator_activities(
    db: Session = Depends(get_db),
    _: User = Depends(require_root_admin)
):
    """
    Get comprehensive information about all operators
    """
    operators = db.query(User).filter(User.role == "operator").all()
    
    activities = []
    for operator in operators:
        # Count panels accessible to this operator
        panel_count = db.query(UserPanelCredential).filter(
            UserPanelCredential.user_id == operator.id
        ).count()
        
        # Count total users created by this operator
        total_users_created = db.query(AuditLog).filter(
            AuditLog.user_id == operator.id,
            AuditLog.action == "create_user"
        ).count()
        
        # Get last activity
        last_activity = db.query(AuditLog).filter(
            AuditLog.user_id == operator.id
        ).order_by(AuditLog.created_at.desc()).first()
        
        activities.append(OperatorActivity(
            user_id=operator.id,
            username=operator.email,
            name=operator.name,
            last_login=operator.last_login,
            panel_count=panel_count,
            total_users_created=total_users_created,
            last_activity=last_activity.created_at if last_activity else None,
            is_active=operator.is_active
        ))
    
    return activities


@router.get("/sudo/panels", response_model=List[PanelActivity])
def get_panel_activities(
    db: Session = Depends(get_db),
    _: User = Depends(require_root_admin)
):
    """
    Get comprehensive information about all panels and their usage
    """
    panels = db.query(Panel).all()
    
    activities = []
    for panel in panels:
        # Count operators with access to this panel
        operator_count = db.query(UserPanelCredential).filter(
            UserPanelCredential.panel_id == panel.id
        ).count()
        
        # Count total users created on this panel
        total_users = db.query(AuditLog).filter(
            AuditLog.target == str(panel.id),
            AuditLog.action == "create_user"
        ).count()
        
        # Get last user created on this panel
        last_user_created = db.query(AuditLog).filter(
            AuditLog.target == str(panel.id),
            AuditLog.action == "create_user"
        ).order_by(AuditLog.created_at.desc()).first()
        
        # Check if panel is accessible (simplified check)
        is_accessible = True  # We could add actual connectivity check here
        
        activities.append(PanelActivity(
            panel_id=panel.id,
            panel_name=panel.name,
            panel_url=panel.base_url,
            operator_count=operator_count,
            total_users=total_users,
            last_user_created=last_user_created.created_at if last_user_created else None,
            is_accessible=is_accessible
        ))
    
    return activities


@router.get("/sudo/operator/{operator_id}/details", response_model=Dict[str, Any])
def get_operator_details(
    operator_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_root_admin)
):
    """
    Get detailed information about a specific operator
    """
    operator = db.query(User).filter(User.id == operator_id, User.role == "operator").first()
    if not operator:
        raise HTTPException(status_code=404, detail="اپراتور یافت نشد")
    
    # Get panels accessible to this operator
    panel_credentials = db.query(UserPanelCredential).filter(
        UserPanelCredential.user_id == operator_id
    ).all()
    
    accessible_panels = []
    for cred in panel_credentials:
        panel = db.query(Panel).filter(Panel.id == cred.panel_id).first()
        if panel:
            accessible_panels.append({
                "panel_id": panel.id,
                "panel_name": panel.name,
                "panel_url": panel.base_url,
                "operator_username": cred.username,
                "has_access": True
            })
    
    # Get recent activities
    recent_activities = db.query(AuditLog).filter(
        AuditLog.user_id == operator_id
    ).order_by(AuditLog.created_at.desc()).limit(20).all()
    
    activities = []
    for activity in recent_activities:
        activities.append({
            "action": activity.action,
            "target": activity.target,
            "meta": activity.meta,
            "created_at": activity.created_at
        })
    
    # Get user creation statistics
    user_creation_stats = db.query(AuditLog).filter(
        AuditLog.user_id == operator_id,
        AuditLog.action == "create_user"
    ).all()
    
    return {
        "operator": {
            "id": operator.id,
            "name": operator.name,
            "email": operator.email,
            "role": operator.role,
            "is_active": operator.is_active,
            "last_login": operator.last_login,
            "created_at": operator.created_at if hasattr(operator, 'created_at') else None
        },
        "accessible_panels": accessible_panels,
        "recent_activities": activities,
        "statistics": {
            "total_users_created": len(user_creation_stats),
            "total_activities": len(recent_activities),
            "panels_with_access": len(accessible_panels)
        }
    }


@router.post("/sudo/control", response_model=SudoControlResponse)
def execute_sudo_control(
    action: SudoControlAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_root_admin)
):
    """
    Execute sudo control actions on operators
    """
    target_user = db.query(User).filter(User.id == action.target_user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="کاربر یافت نشد")
    
    if target_user.role == "admin":
        raise HTTPException(status_code=403, detail="نمی‌توانید روی ادمین‌ها عملیات انجام دهید")
    
    try:
        if action.action == "suspend":
            target_user.is_active = False
            db.commit()
            
            # Log the action
            audit_log = AuditLog(
                user_id=current_user.id,
                action="sudo_suspend_user",
                target=str(target_user.id),
                meta={"reason": action.reason, "target_name": target_user.name}
            )
            db.add(audit_log)
            db.commit()
            
            return SudoControlResponse(
                success=True,
                message=f"کاربر {target_user.name} با موفقیت معلق شد",
                details={"action": "suspend", "target_user": target_user.name}
            )
        
        elif action.action == "activate":
            target_user.is_active = True
            db.commit()
            
            # Log the action
            audit_log = AuditLog(
                user_id=current_user.id,
                action="sudo_activate_user",
                target=str(target_user.id),
                meta={"reason": action.reason, "target_name": target_user.name}
            )
            db.add(audit_log)
            db.commit()
            
            return SudoControlResponse(
                success=True,
                message=f"کاربر {target_user.name} با موفقیت فعال شد",
                details={"action": "activate", "target_user": target_user.name}
            )
        
        elif action.action == "reset_password":
            if not action.new_password:
                raise HTTPException(status_code=400, detail="رمز عبور جدید باید ارائه شود")
            
            from app.core.security import hash_password
            target_user.hashed_password = hash_password(action.new_password)
            db.commit()
            
            # Log the action
            audit_log = AuditLog(
                user_id=current_user.id,
                action="sudo_reset_password",
                target=str(target_user.id),
                meta={"reason": action.reason, "target_name": target_user.name}
            )
            db.add(audit_log)
            db.commit()
            
            return SudoControlResponse(
                success=True,
                message=f"رمز عبور کاربر {target_user.name} با موفقیت تغییر کرد",
                details={"action": "reset_password", "target_user": target_user.name}
            )
        
        elif action.action == "revoke_access":
            # Remove all panel access for this operator
            db.query(UserPanelCredential).filter(
                UserPanelCredential.user_id == target_user.id
            ).delete()
            db.commit()
            
            # Log the action
            audit_log = AuditLog(
                user_id=current_user.id,
                action="sudo_revoke_access",
                target=str(target_user.id),
                meta={"reason": action.reason, "target_name": target_user.name}
            )
            db.add(audit_log)
            db.commit()
            
            return SudoControlResponse(
                success=True,
                message=f"دسترسی‌های پنل کاربر {target_user.name} با موفقیت لغو شد",
                details={"action": "revoke_access", "target_user": target_user.name}
            )
        
        else:
            raise HTTPException(status_code=400, detail="عملیات نامعتبر")
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"خطا در اجرای عملیات: {str(e)}")


@router.get("/sudo/audit", response_model=List[Dict[str, Any]])
def get_sudo_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    action_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_root_admin)
):
    """
    Get audit logs for sudo operations
    """
    query = db.query(AuditLog)
    
    if action_filter:
        query = query.filter(AuditLog.action.like(f"%{action_filter}%"))
    
    # Filter for sudo actions
    sudo_actions = ["sudo_suspend_user", "sudo_activate_user", "sudo_reset_password", "sudo_revoke_access"]
    query = query.filter(AuditLog.action.in_(sudo_actions))
    
    logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()
    
    result = []
    for log in logs:
        # Get user info
        user = db.query(User).filter(User.id == log.user_id).first()
        result.append({
            "id": log.id,
            "action": log.action,
            "target": log.target,
            "meta": log.meta,
            "created_at": log.created_at,
            "performed_by": {
                "id": user.id if user else None,
                "name": user.name if user else "Unknown",
                "email": user.email if user else "Unknown"
            }
        })
    
    return result


@router.get("/sudo/stats", response_model=Dict[str, Any])
def get_sudo_statistics(
    db: Session = Depends(get_db),
    _: User = Depends(require_root_admin)
):
    """
    Get comprehensive statistics for sudo dashboard
    """
    # User statistics
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    operators = db.query(User).filter(User.role == "operator").count()
    admins = db.query(User).filter(User.role == "admin").count()
    
    # Panel statistics
    total_panels = db.query(Panel).count()
    active_panels = db.query(Panel).filter(Panel.is_default == True).count()
    
    # Activity statistics
    total_activities = db.query(AuditLog).count()
    recent_activities = db.query(AuditLog).filter(
        AuditLog.created_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    ).count()
    
    # User creation statistics
    users_created_today = db.query(AuditLog).filter(
        AuditLog.action == "create_user",
        AuditLog.created_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    ).count()
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "operators": operators,
            "admins": admins
        },
        "panels": {
            "total": total_panels,
            "active": active_panels
        },
        "activities": {
            "total": total_activities,
            "today": recent_activities,
            "users_created_today": users_created_today
        }
    }