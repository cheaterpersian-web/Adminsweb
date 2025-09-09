import hmac
import hashlib
import os
import time
from typing import Tuple
from app.core.config import get_settings

settings = get_settings()


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def save_file(filename: str, content: bytes) -> str:
    ensure_dir(settings.local_storage_path)
    safe_name = f"{int(time.time())}_{filename}"
    full_path = os.path.join(settings.local_storage_path, safe_name)
    with open(full_path, "wb") as f:
        f.write(content)
    return full_path


def sign_path(file_path: str, expires_in: int = 3600) -> Tuple[str, int]:
    expires_at = int(time.time()) + expires_in
    payload = f"{file_path}:{expires_at}"
    signature = hmac.new(settings.secret_key.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return signature, expires_at


def verify_signature(file_path: str, signature: str, expires_at: int) -> bool:
    if expires_at < int(time.time()):
        return False
    payload = f"{file_path}:{expires_at}"
    expected = hmac.new(settings.secret_key.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)