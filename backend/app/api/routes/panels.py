from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import httpx

from app.db.session import get_db
from app.models.user import User
from app.models.panel import Panel
from app.core.auth import require_roles, require_root_admin, get_current_user
from app.models.panel_inbound import PanelInbound
from app.models.panel_created_user import PanelCreatedUser
from app.models.user_panel_credentials import UserPanelCredential
from pydantic import BaseModel, AnyHttpUrl
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse, urlunparse


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
    is_default: bool = False

    class Config:
        from_attributes = True


@router.get("/panels", response_model=List[PanelRead])
def list_panels(db: Session = Depends(get_db), _: User = Depends(require_root_admin)):
    panels = db.query(Panel).order_by(Panel.id.desc()).all()
    return panels


@router.get("/panels/my", response_model=List[PanelRead])
def list_my_panels(db: Session = Depends(get_db), current_user: User = Depends(require_roles(["admin", "operator"]))):
    # Root admin: all panels
    try:
      from app.core.config import get_settings
      from app.models.root_admin import RootAdmin
      settings = get_settings()
      emails = {e.strip().lower() for e in settings.root_admin_emails.split(",") if e.strip()}
      is_env_root = current_user.email.lower() in emails
      is_db_root = db.query(RootAdmin).filter(RootAdmin.user_id == current_user.id).first() is not None
      if current_user.role == "admin" and (is_env_root or is_db_root):
          return db.query(Panel).order_by(Panel.id.desc()).all()
    except Exception:
      pass
    # Operator: panels with stored credentials
    if current_user.role == "operator":
        panels = (
            db.query(Panel)
            .join(UserPanelCredential, UserPanelCredential.panel_id == Panel.id)
            .filter(UserPanelCredential.user_id == current_user.id)
            .order_by(Panel.id.desc())
            .all()
        )
        return panels
    # Others: none
    return []


@router.get("/panels/default", response_model=PanelRead)
def get_default_panel(db: Session = Depends(get_db), _: User = Depends(require_roles(["admin", "operator"]))):
    panel = db.query(Panel).filter(Panel.is_default == True).order_by(Panel.id.desc()).first()  # noqa: E712
    if not panel:
        raise HTTPException(status_code=404, detail="No default panel set")
    return panel


@router.post("/panels/{panel_id}/default", response_model=PanelRead)
def set_default_panel(panel_id: int, db: Session = Depends(get_db), _: User = Depends(require_root_admin)):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    # unset others, set this one
    db.query(Panel).update({Panel.is_default: False})
    panel.is_default = True
    db.add(panel)
    db.commit()
    db.refresh(panel)
    return panel


@router.post("/panels", response_model=PanelRead)
def create_panel(payload: PanelCreate, db: Session = Depends(get_db), _: User = Depends(require_root_admin)):
    if db.query(Panel).filter(Panel.name == payload.name).first():
        raise HTTPException(status_code=400, detail="Panel name already exists")
    panel = Panel(name=payload.name, base_url=str(payload.base_url), username=payload.username, password=payload.password)
    db.add(panel)
    db.commit()
    db.refresh(panel)
    return panel


@router.put("/panels/{panel_id}", response_model=PanelRead)
def update_panel(panel_id: int, payload: PanelUpdate, db: Session = Depends(get_db), _: User = Depends(require_root_admin)):
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
async def test_panel(payload: PanelTestRequest, _: User = Depends(require_root_admin)):
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
async def list_inbounds(panel_id: int, db: Session = Depends(get_db), _: User = Depends(require_root_admin)):
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
async def list_hosts(panel_id: int, db: Session = Depends(get_db), _: User = Depends(require_root_admin)):
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
    inbound_ids: list[str]


@router.post("/panels/{panel_id}/inbound", response_model=PanelRead)
def set_inbound(panel_id: int, payload: PanelInboundSelectRequest, db: Session = Depends(get_db), _: User = Depends(require_root_admin)):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    # Clear previous selections
    db.query(PanelInbound).filter(PanelInbound.panel_id == panel_id).delete()
    # Insert selected inbounds
    for iid in payload.inbound_ids:
        pi = PanelInbound(panel_id=panel_id, inbound_id=iid, inbound_tag=None)
        db.add(pi)
    db.commit()
    db.refresh(panel)
    return panel


class PanelSelectedInboundsResponse(BaseModel):
    inbound_ids: list[str]


@router.get("/panels/{panel_id}/inbound", response_model=PanelSelectedInboundsResponse)
def get_selected_inbounds(panel_id: int, db: Session = Depends(get_db), _: User = Depends(require_root_admin)):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    rows = db.query(PanelInbound).filter(PanelInbound.panel_id == panel_id).order_by(PanelInbound.id.asc()).all()
    return PanelSelectedInboundsResponse(inbound_ids=[r.inbound_id for r in rows])


class CreatedUserItem(BaseModel):
    id: int
    panel_id: int
    username: str
    subscription_url: Optional[str] = None
    created_at: datetime


class CreatedUsersResponse(BaseModel):
    items: list[CreatedUserItem]


@router.get("/panels/created", response_model=CreatedUsersResponse)
def list_created_users(db: Session = Depends(get_db), _: User = Depends(require_root_admin)):
    rows = db.query(PanelCreatedUser).order_by(PanelCreatedUser.id.desc()).all()
    items = [CreatedUserItem(id=r.id, panel_id=r.panel_id, username=r.username, subscription_url=r.subscription_url, created_at=r.created_at) for r in rows]
    return CreatedUsersResponse(items=items)


class PanelUserInfoResponse(BaseModel):
    username: str
    data_limit: Optional[int] = None
    used: Optional[int] = None
    remaining: Optional[int] = None
    expire: Optional[int] = None
    expires_in: Optional[int] = None
    status: Optional[str] = None
    subscription_url: Optional[str] = None


@router.get("/panels/{panel_id}/user/{username}/info", response_model=PanelUserInfoResponse)
async def get_panel_user_info(panel_id: int, username: str, db: Session = Depends(get_db), _: User = Depends(require_roles(["admin", "operator", "viewer"]))):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    token = await _login_get_token(panel.base_url, panel.username, panel.password)
    if not token:
        raise HTTPException(status_code=502, detail="Login to panel failed")
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
        data_limit: Optional[int] = None
        expire_ts: Optional[int] = None
        status: Optional[str] = None
        used: Optional[int] = None
        subscription_url: Optional[str] = None
        # Fetch user core info
        try:
            ures = await client.get(panel.base_url.rstrip("/") + f"/api/user/{username}", headers=headers)
            if ures.headers.get("content-type", "").startswith("application/json"):
                u = ures.json()
                if isinstance(u, dict):
                    if isinstance(u.get("data_limit"), int):
                        data_limit = int(u.get("data_limit"))
                    if isinstance(u.get("expire"), int):
                        expire_ts = int(u.get("expire"))
                    if isinstance(u.get("status"), str):
                        status = u.get("status")
                    # Prefer exact subscription_url if provided
                    if isinstance(u.get("subscription_url"), str):
                        subscription_url = u.get("subscription_url")
                    elif isinstance(u.get("subscription"), str):
                        subscription_url = u.get("subscription")
        except Exception:
            pass
        # Fetch usage if not embedded
        try:
            r = await client.get(panel.base_url.rstrip("/") + f"/api/user/{username}/usage", headers=headers)
            if r.headers.get("content-type", "").startswith("application/json"):
                j = r.json()
                if isinstance(j, dict):
                    if isinstance(j.get("total"), int):
                        used = int(j.get("total"))
                    elif isinstance(j.get("download"), int) or isinstance(j.get("upload"), int):
                        d = int(j.get("download") or 0)
                        up = int(j.get("upload") or 0)
                        used = d + up
        except Exception:
            pass

        remaining: Optional[int] = None
        if data_limit is not None and data_limit > 0 and used is not None:
            remaining = max(0, data_limit - used)
        expires_in: Optional[int] = None
        if expire_ts is not None and expire_ts > 0:
            now = int(datetime.now(tz=timezone.utc).timestamp())
            expires_in = max(0, expire_ts - now)

        # Canonicalize subscription to panel base URL if present
        subscription_url = _canonicalize_subscription_url(panel.base_url, subscription_url)
        return PanelUserInfoResponse(
            username=username,
            data_limit=data_limit,
            used=used,
            remaining=remaining,
            expire=expire_ts,
            expires_in=expires_in,
            status=status,
            subscription_url=subscription_url,
        )


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


def _canonicalize_subscription_url(base_url: str, subscription_url: Optional[str]) -> Optional[str]:
    if not subscription_url:
        return None
    try:
        b = urlparse(base_url)
        s = urlparse(subscription_url)
        # Try to extract token from path if contains '/sub/'
        token = None
        if "/sub/" in s.path:
            token = s.path.split("/sub/", 1)[1].split("/", 1)[0]
        # Build canonical path
        if token:
            path = f"/sub/{token}"
            return urlunparse((b.scheme, b.netloc, path, "", s.query, ""))
        # Otherwise, just swap scheme/host to base_url
        return urlunparse((b.scheme, b.netloc, s.path or "/sub", "", s.query, ""))
    except Exception:
        return subscription_url


@router.post("/panels/{panel_id}/create_user", response_model=PanelUserCreateResponse)
async def create_user_on_panel(panel_id: int, payload: PanelUserCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    # Require inbound selection to avoid invalid subscription links
    sel_exists = db.query(PanelInbound).filter(PanelInbound.panel_id == panel_id).first()
    # Choose credentials: operator's own if available; otherwise panel's default admin
    cred_username = panel.username
    cred_password = panel.password
    if current_user.role == "operator":
        rec = db.query(UserPanelCredential).filter(UserPanelCredential.user_id == current_user.id, UserPanelCredential.panel_id == panel_id).first()
        if not rec:
            raise HTTPException(status_code=403, detail="Operator panel credentials not found. Ask admin to provision your panel access.")
        cred_username = rec.username
        cred_password = rec.password
    token = await _login_get_token(panel.base_url, cred_username, cred_password)
    if not token:
        return PanelUserCreateResponse(ok=False, error="Login to panel failed")

    # Build body according to Marzban Add User spec: use inbounds as { protocol: [tags] }
    bytes_limit = int(max(0, payload.volume_gb) * (1024 ** 3))
    expire_at = datetime.now(tz=timezone.utc) + timedelta(days=max(1, payload.duration_days))
    expire_ts = int(expire_at.timestamp())

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=20.0, verify=False) as client:
        # Fetch panel inbounds to determine protocol for selected tags
        try:
            resp_inb = await client.get(panel.base_url.rstrip("/") + "/api/inbounds", headers=headers)
            resp_inb.raise_for_status()
            inb_data = resp_inb.json()
        except Exception as e:
            return PanelUserCreateResponse(ok=False, error=f"Failed to fetch inbounds: {e}")

        normalized: list[dict] = []
        if isinstance(inb_data, list):
            normalized = [x for x in inb_data if isinstance(x, dict)]
        elif isinstance(inb_data, dict):
            if isinstance(inb_data.get("items"), list):
                normalized = [x for x in inb_data["items"] if isinstance(x, dict)]
            else:
                for v in inb_data.values():
                    if isinstance(v, list):
                        normalized.extend([x for x in v if isinstance(x, dict)])

        selected_rows = db.query(PanelInbound).filter(PanelInbound.panel_id == panel_id).all()
        selected_tags = {r.inbound_id for r in selected_rows}
        proto_to_tags: dict[str, list[str]] = {}
        for it in normalized:
            tag = str(it.get("tag") or "").strip()
            proto = str(it.get("protocol") or "").strip()
            if tag and proto and tag in selected_tags:
                proto_to_tags.setdefault(proto, []).append(tag)

        # Proxies object based on selected protocols
        proxies_obj = {proto: {} for proto in proto_to_tags.keys()}

        body = {
            "username": payload.name,
            "status": "active",
            "expire": expire_ts,
            "data_limit": bytes_limit,
            "data_limit_reset_strategy": "no_reset",
            "proxies": proxies_obj,
            "inbounds": proto_to_tags,
        }

        url = panel.base_url.rstrip("/") + "/api/user"
        try:
            res = await client.post(url, json=body, headers=headers)
        except Exception as e:
            return PanelUserCreateResponse(ok=False, error=str(e))

        if res.headers.get("content-type", "").startswith("application/json"):
            try:
                data = res.json()
            except Exception:
                data = {}
        else:
            data = {"raw_text": await res.aread()}

        if 200 <= res.status_code < 300:
            sub_url = await _extract_subscription_url(panel.base_url, data)
            if not sub_url:
                try:
                    info = await client.get(panel.base_url.rstrip("/") + f"/api/user/{payload.name}", headers=headers)
                    if info.headers.get("content-type", "").startswith("application/json"):
                        udata = info.json()
                        # Prefer exact field
                        if isinstance(udata, dict) and isinstance(udata.get("subscription_url"), str):
                            sub_url = udata.get("subscription_url")
                        elif isinstance(udata, dict) and isinstance(udata.get("subscription"), str):
                            sub_url = udata.get("subscription")
                        if not sub_url:
                            sub_url = await _extract_subscription_url(panel.base_url, udata)
                except Exception:
                    pass
            # Canonicalize to base_url domain
            sub_url = _canonicalize_subscription_url(panel.base_url, sub_url)
            # persist created user record
            try:
                rec = PanelCreatedUser(panel_id=panel_id, username=payload.name, subscription_url=sub_url)
                db.add(rec)
                db.commit()
            except Exception:
                db.rollback()
            return PanelUserCreateResponse(ok=True, username=payload.name, subscription_url=sub_url, raw=data)
        else:
            return PanelUserCreateResponse(ok=False, error=f"{res.status_code} {res.text[:400]}")


class PanelUserDeleteRequest(BaseModel):
    username: str


class PanelUserDeleteResponse(BaseModel):
    ok: bool
    status: Optional[int] = None
    error: Optional[str] = None


@router.post("/panels/{panel_id}/delete_user", response_model=PanelUserDeleteResponse)
async def delete_user_on_panel(panel_id: int, payload: PanelUserDeleteRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    cred_username = panel.username
    cred_password = panel.password
    if current_user.role == "operator":
        rec = db.query(UserPanelCredential).filter(UserPanelCredential.user_id == current_user.id, UserPanelCredential.panel_id == panel_id).first()
        if not rec:
            raise HTTPException(status_code=403, detail="Operator panel credentials not found. Ask admin to provision your panel access.")
        cred_username = rec.username
        cred_password = rec.password
    token = await _login_get_token(panel.base_url, cred_username, cred_password)
    if not token:
        return PanelUserDeleteResponse(ok=False, error="Login to panel failed")
    headers = {"Authorization": f"Bearer {token}"}
    url = panel.base_url.rstrip("/") + f"/api/user/{payload.username}"
    async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
        try:
            res = await client.delete(url, headers=headers)
            if 200 <= res.status_code < 300:
                # best-effort delete from local records
                try:
                    db.query(PanelCreatedUser).filter(PanelCreatedUser.panel_id == panel_id, PanelCreatedUser.username == payload.username).delete()
                    db.commit()
                except Exception:
                    db.rollback()
                return PanelUserDeleteResponse(ok=True, status=res.status_code)
            return PanelUserDeleteResponse(ok=False, status=res.status_code, error=res.text[:200])
        except Exception as e:
            return PanelUserDeleteResponse(ok=False, error=str(e))


