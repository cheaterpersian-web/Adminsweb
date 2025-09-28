import os
import tempfile
import subprocess
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import require_root_admin
from app.db.session import get_db
from app.models.backup_setting import BackupSetting


router = APIRouter()


def _get_or_create(db: Session) -> BackupSetting:
    row = db.query(BackupSetting).first()
    if not row:
        row = BackupSetting(enabled=False, frequency_minutes=60)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@router.get("/backup/settings")
def get_settings(db: Session = Depends(get_db), _: Depends = Depends(require_root_admin)):
    row = _get_or_create(db)
    return {
        "enabled": row.enabled,
        "frequency_minutes": row.frequency_minutes,
        "telegram_bot_token": bool(row.telegram_bot_token),
        "telegram_admin_chat_id": row.telegram_admin_chat_id,
        "last_success_at": row.last_success_at.isoformat() if row.last_success_at else None,
    }


@router.post("/backup/settings")
def set_settings(payload: dict, db: Session = Depends(get_db), _: Depends = Depends(require_root_admin)):
    row = _get_or_create(db)
    if "enabled" in payload:
        row.enabled = bool(payload["enabled"])
    if "frequency_minutes" in payload:
        try:
            row.frequency_minutes = max(5, int(payload["frequency_minutes"]))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid frequency")
    if "telegram_bot_token" in payload:
        row.telegram_bot_token = str(payload["telegram_bot_token"]) or None
    if "telegram_admin_chat_id" in payload:
        row.telegram_admin_chat_id = str(payload["telegram_admin_chat_id"]) or None
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True}


@router.post("/backup/run")
def run_backup(db: Session = Depends(get_db), _: Depends = Depends(require_root_admin)):
    # Dump Postgres using pg_dump; relies on environment variables in service
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise HTTPException(status_code=500, detail="DATABASE_URL not set")
    # Compose pg_dump command from envs used in docker compose
    # For simplicity, use service DNS and credentials baked in envs
    try:
        with tempfile.NamedTemporaryFile(suffix=".dump", delete=False) as tf:
            tmp_path = tf.name
        subprocess.check_call(["pg_dump", "-Fc", "-f", tmp_path, db_url])
        size = os.path.getsize(tmp_path)
        return {"ok": True, "file": tmp_path, "size": size}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"pg_dump failed: {e}")

