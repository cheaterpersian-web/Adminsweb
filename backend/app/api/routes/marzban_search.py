"""
Marzban search API routes for discovering and managing Marzban panels
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import httpx
import asyncio
from urllib.parse import urlparse, urljoin
import re

from app.db.session import get_db
from app.models.user import User
from app.core.auth import require_roles, get_current_user
from app.models.panel import Panel
from pydantic import BaseModel, AnyHttpUrl

router = APIRouter()


class MarzbanPanelInfo(BaseModel):
    """Information about a discovered Marzban panel"""
    url: str
    title: Optional[str] = None
    version: Optional[str] = None
    is_accessible: bool = False
    has_api: bool = False
    api_endpoint: Optional[str] = None
    error_message: Optional[str] = None


class MarzbanSearchRequest(BaseModel):
    """Request model for Marzban panel search"""
    base_urls: List[str]
    timeout: int = 10
    check_api: bool = True


class MarzbanSearchResponse(BaseModel):
    """Response model for Marzban panel search"""
    found_panels: List[MarzbanPanelInfo]
    total_checked: int
    total_found: int


async def check_marzban_panel(url: str, timeout: int = 10, check_api: bool = True) -> MarzbanPanelInfo:
    """
    Check if a URL hosts a Marzban panel and gather information about it
    """
    panel_info = MarzbanPanelInfo(url=url)
    
    try:
        # Normalize URL
        if not url.startswith(('http://', 'https://')):
            url = f"https://{url}"
        
        panel_info.url = url
        
        async with httpx.AsyncClient(timeout=timeout, verify=False, follow_redirects=True) as client:
            # Check if the main page is accessible
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    panel_info.is_accessible = True
                    
                    # Try to extract title from HTML
                    content = response.text.lower()
                    if 'marzban' in content:
                        # Extract title from HTML
                        title_match = re.search(r'<title[^>]*>([^<]+)</title>', response.text, re.IGNORECASE)
                        if title_match:
                            panel_info.title = title_match.group(1).strip()
                    
                    # Check for Marzban-specific indicators
                    if any(indicator in content for indicator in ['marzban', 'v2ray', 'xray', 'proxy']):
                        panel_info.has_api = True
                        panel_info.api_endpoint = urljoin(url, '/api')
                        
                        # If requested, test the API endpoint
                        if check_api:
                            try:
                                api_response = await client.get(panel_info.api_endpoint)
                                if api_response.status_code in [200, 401, 403]:  # API exists but may require auth
                                    panel_info.has_api = True
                                else:
                                    panel_info.has_api = False
                            except:
                                panel_info.has_api = False
                
            except httpx.TimeoutException:
                panel_info.error_message = "Connection timeout"
            except httpx.ConnectError:
                panel_info.error_message = "Connection failed"
            except Exception as e:
                panel_info.error_message = f"Error: {str(e)}"
                
    except Exception as e:
        panel_info.error_message = f"Unexpected error: {str(e)}"
    
    return panel_info


@router.post("/marzban/search", response_model=MarzbanSearchResponse)
async def search_marzban_panels(
    request: MarzbanSearchRequest,
    current_user: User = Depends(require_roles(["admin", "operator"]))
):
    """
    Search for Marzban panels at the given URLs
    """
    if not request.base_urls:
        raise HTTPException(status_code=400, detail="حداقل یک URL باید ارائه شود")
    
    if len(request.base_urls) > 50:
        raise HTTPException(status_code=400, detail="حداکثر 50 URL قابل بررسی است")
    
    # Check all URLs concurrently
    tasks = [
        check_marzban_panel(url, request.timeout, request.check_api)
        for url in request.base_urls
    ]
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Process results
    found_panels = []
    for result in results:
        if isinstance(result, MarzbanPanelInfo):
            found_panels.append(result)
        else:
            # Handle exceptions
            found_panels.append(MarzbanPanelInfo(
                url="unknown",
                error_message=f"Error: {str(result)}"
            ))
    
    return MarzbanSearchResponse(
        found_panels=found_panels,
        total_checked=len(request.base_urls),
        total_found=len([p for p in found_panels if p.is_accessible])
    )


@router.get("/marzban/check/{panel_id}", response_model=MarzbanPanelInfo)
async def check_existing_panel(
    panel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "operator"]))
):
    """
    Check the status of an existing panel in the database
    """
    panel = db.query(Panel).filter(Panel.id == panel_id).first()
    if not panel:
        raise HTTPException(status_code=404, detail="پنل یافت نشد")
    
    # Check if current user has access to this panel
    if current_user.role == "operator":
        from app.models.user_panel_credentials import UserPanelCredential
        has_access = db.query(UserPanelCredential).filter(
            UserPanelCredential.user_id == current_user.id,
            UserPanelCredential.panel_id == panel_id
        ).first() is not None
        
        if not has_access:
            raise HTTPException(status_code=403, detail="شما دسترسی به این پنل ندارید")
    
    # Check the panel
    panel_info = await check_marzban_panel(panel.base_url, check_api=True)
    
    # Test login if credentials are available
    if panel_info.has_api and panel_info.is_accessible:
        try:
            async with httpx.AsyncClient(timeout=10, verify=False) as client:
                login_url = urljoin(panel.base_url, '/api/admin/token')
                login_data = {
                    "username": panel.username,
                    "password": panel.password
                }
                
                response = await client.post(login_url, json=login_data)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("access_token"):
                        panel_info.error_message = None
                    else:
                        panel_info.error_message = "ورود ناموفق - توکن دریافت نشد"
                else:
                    panel_info.error_message = f"ورود ناموفق - کد خطا: {response.status_code}"
        except Exception as e:
            panel_info.error_message = f"خطا در تست ورود: {str(e)}"
    
    return panel_info


@router.get("/marzban/discover", response_model=List[MarzbanPanelInfo])
async def discover_marzban_panels(
    domain: str = Query(..., description="Domain to search for Marzban panels"),
    current_user: User = Depends(require_roles(["admin"]))
):
    """
    Discover potential Marzban panels on a domain by checking common paths
    """
    if not domain:
        raise HTTPException(status_code=400, detail="دامنه باید ارائه شود")
    
    # Common Marzban panel paths
    common_paths = [
        "",
        "/",
        "/admin",
        "/panel",
        "/marzban",
        "/v2ray",
        "/xray",
        "/proxy",
        "/dashboard",
        "/web",
        "/ui"
    ]
    
    # Common ports for Marzban
    common_ports = [80, 443, 8080, 8443, 3000, 5000, 8000, 9000]
    
    urls_to_check = []
    
    # Add HTTP and HTTPS versions
    for port in common_ports:
        for path in common_paths:
            if port in [80, 443]:
                if port == 80:
                    urls_to_check.append(f"http://{domain}{path}")
                else:
                    urls_to_check.append(f"https://{domain}{path}")
            else:
                urls_to_check.append(f"http://{domain}:{port}{path}")
                urls_to_check.append(f"https://{domain}:{port}{path}")
    
    # Limit to reasonable number of URLs
    urls_to_check = urls_to_check[:20]
    
    # Check all URLs concurrently
    tasks = [check_marzban_panel(url, timeout=5, check_api=False) for url in urls_to_check]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Filter only accessible panels
    found_panels = []
    for result in results:
        if isinstance(result, MarzbanPanelInfo) and result.is_accessible:
            found_panels.append(result)
    
    return found_panels


@router.post("/marzban/import", response_model=Dict[str, Any])
async def import_marzban_panel(
    panel_info: MarzbanPanelInfo,
    username: str,
    password: str,
    panel_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    """
    Import a discovered Marzban panel into the system
    """
    if not panel_info.is_accessible or not panel_info.has_api:
        raise HTTPException(status_code=400, detail="پنل قابل دسترسی نیست یا API ندارد")
    
    # Generate panel name if not provided
    if not panel_name:
        parsed_url = urlparse(panel_info.url)
        panel_name = f"{parsed_url.hostname}_{parsed_url.port or 443}"
    
    # Check if panel already exists
    existing_panel = db.query(Panel).filter(Panel.name == panel_name).first()
    if existing_panel:
        raise HTTPException(status_code=400, detail="پنل با این نام قبلاً وجود دارد")
    
    # Test login with provided credentials
    try:
        async with httpx.AsyncClient(timeout=10, verify=False) as client:
            login_url = urljoin(panel_info.url, '/api/admin/token')
            login_data = {"username": username, "password": password}
            
            response = await client.post(login_url, json=login_data)
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="ورود با این اطلاعات ناموفق است")
            
            data = response.json()
            if not data.get("access_token"):
                raise HTTPException(status_code=400, detail="توکن دسترسی دریافت نشد")
    
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"خطا در اتصال به پنل: {str(e)}")
    
    # Create the panel
    panel = Panel(
        name=panel_name,
        base_url=panel_info.url,
        username=username,
        password=password
    )
    
    db.add(panel)
    db.commit()
    db.refresh(panel)
    
    return {
        "message": "پنل با موفقیت اضافه شد",
        "panel_id": panel.id,
        "panel_name": panel.name,
        "panel_url": panel.base_url
    }