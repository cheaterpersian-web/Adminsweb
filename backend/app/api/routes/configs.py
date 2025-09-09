from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from fastapi.responses import FileResponse

from app.db.session import get_db
from app.models.user import User
from app.models.config import Config
from app.schemas.config import ConfigCreate, ConfigRead, SignedURL
from app.core.auth import require_roles
from app.storage.local import save_file, sign_path, verify_signature, delete_file
from app.core.limiter import limiter
from app.services.audit import record_audit_event

router = APIRouter()


@router.get("/configs", response_model=List[ConfigRead])
def list_configs(db: Session = Depends(get_db), _: User = Depends(require_roles(["admin", "operator", "viewer"]))):
    return db.query(Config).order_by(Config.id.desc()).all()


@router.post("/configs", response_model=SignedURL)
@limiter.limit("10/minute")
async def upload_config(title: str, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin", "operator"]))):
    content = await file.read()
    file_path = save_file(file.filename, content)
    cfg = Config(title=title, file_path=file_path, uploaded_by=current_user.id)
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    record_audit_event(db, current_user.id, "upload_config", target=str(cfg.id), meta={"title": title})
    sig, exp = sign_path(file_path)
    url = f"/api/configs/{cfg.id}/download?sig={sig}&exp={exp}"
    return SignedURL(url=url, expires_in=exp)


@router.put("/configs/{config_id}", response_model=ConfigRead)
async def update_config(config_id: int, title: str, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin", "operator"]))):
    cfg = db.query(Config).filter(Config.id == config_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Config not found")
    cfg.title = title
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    record_audit_event(db, current_user.id, "update_config", target=str(cfg.id))
    return cfg


@router.delete("/configs/{config_id}")
async def delete_config(config_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin"]))):
    cfg = db.query(Config).filter(Config.id == config_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Config not found")
    delete_file(cfg.file_path)
    db.delete(cfg)
    db.commit()
    record_audit_event(db, current_user.id, "delete_config", target=str(config_id))
    return {"status": "deleted"}


@router.get("/configs/{config_id}/download")
async def download_config(config_id: int, sig: str = Query(...), exp: int = Query(...), db: Session = Depends(get_db), _: User = Depends(require_roles(["admin", "operator", "viewer"]))):
    cfg = db.query(Config).filter(Config.id == config_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Config not found")
    if not verify_signature(cfg.file_path, sig, exp):
        raise HTTPException(status_code=403, detail="Invalid or expired signature")
    return FileResponse(cfg.file_path, filename=cfg.title)