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
    inbound_id: Optional[str] = None
    inbound_tag: Optional[str] = None

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
    # Use official Marzban endpoint first
    async with httpx.AsyncClient(timeout=10.0, verify=False) as client:  # verify=False to allow self-signed during tests
        url = base_url.rstrip("/") + "/api/admin/token"
        last_error = None
        for method in ("form", "json"):
            try:
                if method == "form":
                    res = await client.post(url, data={"username": username, "password": password})
                else:
                    res = await client.post(url, json={"username": username, "password": password})
            except Exception as e:
                last_error = str(e)
                continue
            if res.headers.get("content-type", "").startswith("application/json"):
                try:
                    data = res.json()
                except Exception:
                    data = {}
                token = data.get("access_token") or data.get("token")
                if token:
                    # Optionally verify the token by calling GET /api/admin
                    try:
                        chk = await client.get(base_url.rstrip("/") + "/api/admin", headers={"Authorization": f"Bearer {token}"})
                        if chk.status_code in (200, 204):
                            return True, "/api/admin/token", res.status_code, token[:12] + "..."
                    except Exception:
                        pass
                    return True, "/api/admin/token", res.status_code, token[:12] + "..."
                if res.status_code in (401, 403):
                    return False, "/api/admin/token", res.status_code, "Unauthorized"
        # fallback: reachability
        try:
            res = await client.get(base_url.rstrip("/") + "/docs")
            if res.status_code == 200:
                return False, "/docs", 200, "Reachable, but login failed"
        except Exception as e:
            last_error = str(e)
    return False, None, None, last_error


@router.post("/panels/test", response_model=PanelTestResponse)
async def test_panel(payload: PanelTestRequest, _: User = Depends(require_roles(["admin", "operator"]))):
    ok, endpoint, status, info = await _try_login(str(payload.base_url), payload.username, payload.password)
    if ok:
        return PanelTestResponse(ok=True, endpoint=endpoint, status=status, token_preview=info)
    return PanelTestResponse(ok=False, endpoint=endpoint, status=status, error=info)


class InboundItem(BaseModel):
    id: str
    tag: Optional[str] = None
    remark: Optional[str] = None


class PanelInboundsResponse(BaseModel):
    items: list[InboundItem]


@router.get("/panels/{panel_id}/inbounds", response_model=PanelInboundsResponse)
async def list_inbounds(panel_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles(["admin", "operator", "viewer"]))):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    token = await _login_get_token(panel.base_url, panel.username, panel.password)
    if not token:
        raise HTTPException(status_code=502, detail="Login to panel failed")
    headers = {"Authorization": f"Bearer {token}"}
    url = panel.base_url.rstrip("/") + "/api/inbounds"
    async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
        res = await client.get(url, headers=headers)
        if not res.headers.get("content-type", "").startswith("application/json"):
            raise HTTPException(status_code=502, detail="Unexpected response")
        data = res.json()
        items: list[InboundItem] = []
        # Case 1: API returns a list of inbounds
        if isinstance(data, list):
            for it in data:
                iid = str(it.get("tag") or it.get("id") or it.get("_id") or it.get("remark") or "")
                remark = it.get("remark") or ":".join([str(it.get("protocol")) if it.get("protocol") else "", str(it.get("port")) if it.get("port") else ""]).strip(":")
                items.append(InboundItem(id=iid, tag=it.get("tag"), remark=remark or None))
        # Case 2: { items: [...] }
        elif isinstance(data, dict) and isinstance(data.get("items"), list):
            for it in data["items"]:
                iid = str(it.get("tag") or it.get("id") or it.get("_id") or it.get("remark") or "")
                remark = it.get("remark") or ":".join([str(it.get("protocol")) if it.get("protocol") else "", str(it.get("port")) if it.get("port") else ""]).strip(":")
                items.append(InboundItem(id=iid, tag=it.get("tag"), remark=remark or None))
        # Case 3: dict of arrays (e.g., { group1: [ {...}, ... ], group2: [...] })
        elif isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, list):
                    for it in value:
                        if not isinstance(it, dict):
                            continue
                        iid = str(it.get("tag") or it.get("id") or it.get("_id") or it.get("remark") or key)
                        remark = it.get("remark") or ":".join([str(it.get("protocol")) if it.get("protocol") else "", str(it.get("port")) if it.get("port") else ""]).strip(":")
                        items.append(InboundItem(id=iid, tag=it.get("tag"), remark=remark or None))
        return PanelInboundsResponse(items=items)


class HostItem(BaseModel):
    host: str


class PanelHostsResponse(BaseModel):
    items: list[HostItem]


@router.get("/panels/{panel_id}/hosts", response_model=PanelHostsResponse)
async def list_hosts(panel_id: int, db: Session = Depends(get_db), _: User = Depends(require_roles(["admin", "operator", "viewer"]))):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    token = await _login_get_token(panel.base_url, panel.username, panel.password)
    if not token:
        raise HTTPException(status_code=502, detail="Login to panel failed")
    headers = {"Authorization": f"Bearer {token}"}
    url = panel.base_url.rstrip("/") + "/api/hosts"
    async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
        res = await client.get(url, headers=headers)
        if not res.headers.get("content-type", "").startswith("application/json"):
            raise HTTPException(status_code=502, detail="Unexpected response")
        data = res.json()
        items: list[HostItem] = []
        if isinstance(data, list):
            items = [HostItem(host=str(h)) for h in data]
        elif isinstance(data, dict):
            for key in ("hosts", "items", "domains"):
                if isinstance(data.get(key), list):
                    items = [HostItem(host=str(h)) for h in data[key]]
                    break
        return PanelHostsResponse(items=items)


class PanelInboundSelectRequest(BaseModel):
    inbound_id: str
    inbound_tag: Optional[str] = None


@router.post("/panels/{panel_id}/inbound", response_model=PanelRead)
def set_inbound(panel_id: int, payload: PanelInboundSelectRequest, db: Session = Depends(get_db), _: User = Depends(require_roles(["admin", "operator"]))):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    panel.inbound_id = payload.inbound_id
    panel.inbound_tag = payload.inbound_tag
    db.add(panel)
    db.commit()
    db.refresh(panel)
    return panel


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
    async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
        url = base_url.rstrip("/") + "/api/admin/token"
        for method in ("form", "json"):
            try:
                if method == "form":
                    res = await client.post(url, data={"username": username, "password": password})
                else:
                    res = await client.post(url, json={"username": username, "password": password})
            except Exception:
                continue
            if res.headers.get("content-type", "").startswith("application/json"):
                try:
                    data = res.json()
                except Exception:
                    data = {}
                token = data.get("access_token") or data.get("token")
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
    # Require inbound selection to avoid invalid subscription links
    if not (panel.inbound_id or panel.inbound_tag):
        raise HTTPException(status_code=400, detail="Panel inbound not set. Please select an inbound for this panel first.")
    token = await _login_get_token(panel.base_url, panel.username, panel.password)
    if not token:
        return PanelUserCreateResponse(ok=False, error="Login to panel failed")

    bytes_limit = int(max(0, payload.volume_gb) * (1024 ** 3))
    expire_at = datetime.now(tz=timezone.utc) + timedelta(days=max(1, payload.duration_days))
    payloads = _build_payload_variants(payload.name, bytes_limit, expire_at)
    # Use official endpoint first
    paths = [
        "/api/user",
        "/api/users",
    ]

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=20.0, verify=False) as client:
        last_err = None
        for path in paths:
            url = panel.base_url.rstrip("/") + path
            for body in payloads:
                # Attach inbound if available
                if panel.inbound_id:
                    body = {**body, "inbound_id": panel.inbound_id}
                if panel.inbound_tag and "inbound_tag" not in body:
                    body = {**body, "inbound_tag": panel.inbound_tag}
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
                    # Try to get sub URL from response
                    sub_url = await _extract_subscription_url(panel.base_url, data)
                    if not sub_url:
                        # Fetch user info to get subscription
                        try:
                            info = await client.get(panel.base_url.rstrip("/") + f"/api/user/{payload.name}", headers=headers)
                            if info.headers.get("content-type", "").startswith("application/json"):
                                udata = info.json()
                                sub_url = await _extract_subscription_url(panel.base_url, udata)
                        except Exception:
                            pass
                    return PanelUserCreateResponse(ok=True, username=payload.name, subscription_url=sub_url, raw=data)
                else:
                    last_err = f"{res.status_code} {res.text[:200]}"
        return PanelUserCreateResponse(ok=False, error=last_err)


class PanelUserDeleteRequest(BaseModel):
    username: str


class PanelUserDeleteResponse(BaseModel):
    ok: bool
    status: Optional[int] = None
    error: Optional[str] = None


@router.post("/panels/{panel_id}/delete_user", response_model=PanelUserDeleteResponse)
async def delete_user_on_panel(panel_id: int, payload: PanelUserDeleteRequest, db: Session = Depends(get_db), _: User = Depends(require_roles(["admin", "operator"]))):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    token = await _login_get_token(panel.base_url, panel.username, panel.password)
    if not token:
        return PanelUserDeleteResponse(ok=False, error="Login to panel failed")
    headers = {"Authorization": f"Bearer {token}"}
    url = panel.base_url.rstrip("/") + f"/api/user/{payload.username}"
    async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
        try:
            res = await client.delete(url, headers=headers)
            if 200 <= res.status_code < 300:
                return PanelUserDeleteResponse(ok=True, status=res.status_code)
            return PanelUserDeleteResponse(ok=False, status=res.status_code, error=res.text[:200])
        except Exception as e:
            return PanelUserDeleteResponse(ok=False, error=str(e))


