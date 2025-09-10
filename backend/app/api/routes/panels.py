from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import httpx

from app.db.session import get_db
from app.models.user import User
from app.models.panel import Panel
from app.core.auth import require_roles
from pydantic import BaseModel, AnyHttpUrl


router = APIRouter()


class PanelCreate(BaseModel):
    name: str
    base_url: AnyHttpUrl
    username: str
    password: str


class PanelUpdate(BaseModel):
    name: Optional[str] = None
    base_url: Optional[AnyHttpUrl] = None
    username: Optional[str] = None
    password: Optional[str] = None


class PanelRead(BaseModel):
    id: int
    name: str
    base_url: AnyHttpUrl
    username: str

    class Config:
        from_attributes = True


@router.get("/panels", response_model=List[PanelRead])
def list_panels(db: Session = Depends(get_db), _: User = Depends(require_roles(["admin", "operator", "viewer"]))):
    panels = db.query(Panel).order_by(Panel.id.desc()).all()
    return panels


@router.post("/panels", response_model=PanelRead)
def create_panel(payload: PanelCreate, db: Session = Depends(get_db), _: User = Depends(require_roles(["admin", "operator"]))):
    if db.query(Panel).filter(Panel.name == payload.name).first():
        raise HTTPException(status_code=400, detail="Panel name already exists")
    panel = Panel(name=payload.name, base_url=str(payload.base_url), username=payload.username, password=payload.password)
    db.add(panel)
    db.commit()
    db.refresh(panel)
    return panel


@router.put("/panels/{panel_id}", response_model=PanelRead)
def update_panel(panel_id: int, payload: PanelUpdate, db: Session = Depends(get_db), _: User = Depends(require_roles(["admin", "operator"]))):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    if payload.name is not None:
        panel.name = payload.name
    if payload.base_url is not None:
        panel.base_url = str(payload.base_url)
    if payload.username is not None:
        panel.username = payload.username
    if payload.password is not None:
        panel.password = payload.password
    db.add(panel)
    db.commit()
    db.refresh(panel)
    return panel


class PanelTestRequest(BaseModel):
    base_url: AnyHttpUrl
    username: str
    password: str


class PanelTestResponse(BaseModel):
    ok: bool
    endpoint: Optional[str] = None
    token_preview: Optional[str] = None
    status: Optional[int] = None
    error: Optional[str] = None


async def _try_login(base_url: str, username: str, password: str) -> tuple[bool, Optional[str], Optional[int], Optional[str]]:
    # Try common Marzban admin login endpoints
    candidates = [
        {"path": "/api/admin/token", "method": "form"},
        {"path": "/api/admin/login", "method": "json"},
        {"path": "/api/login", "method": "json"},
        {"path": "/api/auth/login", "method": "json"},
    ]
    async with httpx.AsyncClient(timeout=10.0, verify=False) as client:  # verify=False to allow self-signed during tests
        for c in candidates:
            url = base_url.rstrip("/") + c["path"]
            try:
                if c["method"] == "form":
                    res = await client.post(url, data={"username": username, "password": password})
                else:
                    res = await client.post(url, json={"username": username, "password": password})
            except Exception as e:
                last_error = str(e)
                continue
            if res.status_code < 500 and res.headers.get("content-type", "").startswith("application/json"):
                try:
                    data = res.json()
                except Exception:
                    data = {}
                token = data.get("access_token") or data.get("token") or data.get("jwt")
                if token:
                    return True, c["path"], res.status_code, token[:12] + "..."
                # if 401/403 but JSON, consider auth failure but endpoint exists
                if res.status_code in (401, 403):
                    return False, c["path"], res.status_code, "Unauthorized"
            # try reachability via docs if login not matched
        # fallback: reachability
        try:
            res = await client.get(base_url.rstrip("/") + "/docs")
            if res.status_code == 200:
                return False, "/docs", 200, "Reachable, but login failed"
        except Exception as e:
            last_error = str(e)
    return False, None, None, locals().get("last_error", None)


@router.post("/panels/test", response_model=PanelTestResponse)
async def test_panel(payload: PanelTestRequest, _: User = Depends(require_roles(["admin", "operator"]))):
    ok, endpoint, status, info = await _try_login(str(payload.base_url), payload.username, payload.password)
    if ok:
        return PanelTestResponse(ok=True, endpoint=endpoint, status=status, token_preview=info)
    return PanelTestResponse(ok=False, endpoint=endpoint, status=status, error=info)

