from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import httpx

from app.db.session import get_db
from app.models.user import User
from app.models.panel import Panel
from app.core.auth import require_roles
from pydantic import BaseModel, AnyHttpUrl
from datetime import datetime, timedelta, timezone


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


class PanelUserCreateRequest(BaseModel):
    name: str
    volume_gb: float
    duration_days: int


class PanelUserCreateResponse(BaseModel):
    ok: bool
    username: Optional[str] = None
    subscription_url: Optional[str] = None
    raw: Optional[dict] = None
    error: Optional[str] = None


async def _login_get_token(base_url: str, username: str, password: str) -> Optional[str]:
    candidates = [
        {"path": "/api/admin/token", "method": "form"},
        {"path": "/api/admin/login", "method": "json"},
        {"path": "/api/login", "method": "json"},
        {"path": "/api/auth/login", "method": "json"},
    ]
    async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
        for c in candidates:
            url = base_url.rstrip("/") + c["path"]
            try:
                if c["method"] == "form":
                    res = await client.post(url, data={"username": username, "password": password})
                else:
                    res = await client.post(url, json={"username": username, "password": password})
            except Exception:
                continue
            if res.status_code < 500 and res.headers.get("content-type", "").startswith("application/json"):
                try:
                    data = res.json()
                except Exception:
                    data = {}
                token = data.get("access_token") or data.get("token") or data.get("jwt")
                if token:
                    return token
    return None


def _build_payload_variants(username: str, bytes_limit: int, expire_at: datetime) -> list[dict]:
    # Try multiple payload shapes commonly used
    expire_days = max(1, int((expire_at - datetime.now(tz=timezone.utc)).total_seconds() // 86400))
    iso = expire_at.isoformat()
    return [
        {"username": username, "data_limit": bytes_limit, "expire": expire_days},
        {"username": username, "data_limit": bytes_limit, "expire_in_days": expire_days},
        {"username": username, "data_limit": bytes_limit, "expire_at": iso},
        {"username": username, "limit": bytes_limit, "expire": expire_days},
        {"username": username, "quota": bytes_limit, "expire_days": expire_days},
        {"username": username, "data_limit": bytes_limit},
    ]


async def _extract_subscription_url(base_url: str, data: dict) -> Optional[str]:
    # Try common keys
    for key in [
        "subscription_url",
        "subscription",
        "sub_link",
        "link",
        "subscriptionLink",
        "subUrl",
    ]:
        if isinstance(data, dict) and data.get(key):
            return str(data[key])
    # Try nested
    user = data.get("user") if isinstance(data, dict) else None
    if isinstance(user, dict):
        for key in ["subscription_url", "subscription", "link"]:
            if user.get(key):
                return str(user[key])
    # Construct from token if provided
    token = data.get("subscription_token") or (user.get("subscription_token") if isinstance(user, dict) else None)
    if token:
        return base_url.rstrip("/") + "/sub/" + str(token)
    return None


@router.post("/panels/{panel_id}/create_user", response_model=PanelUserCreateResponse)
async def create_user_on_panel(panel_id: int, payload: PanelUserCreateRequest, db: Session = Depends(get_db), _: User = Depends(require_roles(["admin", "operator"]))):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    token = await _login_get_token(panel.base_url, panel.username, panel.password)
    if not token:
        return PanelUserCreateResponse(ok=False, error="Login to panel failed")

    bytes_limit = int(max(0, payload.volume_gb) * (1024 ** 3))
    expire_at = datetime.now(tz=timezone.utc) + timedelta(days=max(1, payload.duration_days))
    payloads = _build_payload_variants(payload.name, bytes_limit, expire_at)
    paths = [
        "/api/admin/users",
        "/api/admin/user",
        "/api/users",
        "/api/user",
    ]

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=20.0, verify=False) as client:
        last_err = None
        for path in paths:
            url = panel.base_url.rstrip("/") + path
            for body in payloads:
                try:
                    res = await client.post(url, json=body, headers=headers)
                except Exception as e:
                    last_err = str(e)
                    continue
                if res.headers.get("content-type", "").startswith("application/json"):
                    try:
                        data = res.json()
                    except Exception:
                        data = {}
                else:
                    data = {"raw_text": await res.aread()}
                if 200 <= res.status_code < 300:
                    sub_url = await _extract_subscription_url(panel.base_url, data)
                    return PanelUserCreateResponse(ok=True, username=payload.name, subscription_url=sub_url, raw=data)
                else:
                    last_err = f"{res.status_code} {res.text[:200]}"
        return PanelUserCreateResponse(ok=False, error=last_err)


