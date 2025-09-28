import asyncio
import os
import tempfile
import tarfile
from datetime import datetime, timezone
from typing import Optional

import httpx

from app.db.session import SessionLocal
from app.models.backup_setting import BackupSetting


def _sqlalchemy_url_to_pg(url: str) -> str:
    # Convert postgresql+psycopg://... to postgresql://... for pg_dump
    return url.replace("postgresql+psycopg://", "postgresql://")


def _run_pg_dump_to(path: str, db_url: str) -> None:
    import subprocess
    pg_url = _sqlalchemy_url_to_pg(db_url)
    subprocess.check_call(["pg_dump", "--format=custom", f"--file={path}", pg_url])


def _build_archive(db_url: str) -> str:
    tmp_dir = tempfile.mkdtemp(prefix="backup_")
    db_dump_path = os.path.join(tmp_dir, "db.dump")
    _run_pg_dump_to(db_dump_path, db_url)

    # Optional: include configs directory
    configs_dir = "/data/configs"
    archive_path = os.path.join(tempfile.gettempdir(), f"backup_{int(datetime.now(tz=timezone.utc).timestamp())}.tar.gz")
    with tarfile.open(archive_path, "w:gz") as tar:
        tar.add(db_dump_path, arcname="db.dump")
        if os.path.isdir(configs_dir):
            tar.add(configs_dir, arcname="configs")
        # meta
        meta_path = os.path.join(tmp_dir, "meta.txt")
        with open(meta_path, "w", encoding="utf-8") as f:
            f.write(f"created_at={datetime.now(tz=timezone.utc).isoformat()}\n")
        tar.add(meta_path, arcname="meta.txt")
    return archive_path


async def _telegram_send_document(bot_token: str, chat_id: str, file_path: str, caption: Optional[str] = None) -> bool:
    url = f"https://api.telegram.org/bot{bot_token}/sendDocument"
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            with open(file_path, "rb") as f:
                files = {"document": (os.path.basename(file_path), f, "application/gzip")}
                data = {"chat_id": chat_id}
                if caption:
                    data["caption"] = caption
                res = await client.post(url, data=data, files=files)
                return 200 <= res.status_code < 300
    except Exception:
        return False


async def _telegram_send_text(bot_token: str, chat_id: str, text: str) -> bool:
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(url, json={"chat_id": chat_id, "text": text})
            return 200 <= res.status_code < 300
    except Exception:
        return False


async def send_settings_confirmation_if_possible(settings: BackupSetting) -> None:
    if settings.telegram_bot_token and settings.telegram_admin_chat_id:
        await _telegram_send_text(settings.telegram_bot_token, settings.telegram_admin_chat_id, "Backup bot configured successfully.")


async def run_backup_and_maybe_send(settings_row: BackupSetting) -> bool:
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        return False
    archive = _build_archive(db_url)
    try:
        ok = True
        if settings_row.enabled and settings_row.telegram_bot_token and settings_row.telegram_admin_chat_id:
            ok = await _telegram_send_document(
                settings_row.telegram_bot_token,
                settings_row.telegram_admin_chat_id,
                archive,
                caption=f"Backup {datetime.now(tz=timezone.utc).isoformat()}",
            )
        return ok
    finally:
        try:
            os.remove(archive)
        except Exception:
            pass


_scheduler_started = False


def schedule_backup_task() -> None:
    global _scheduler_started
    if _scheduler_started:
        return
    _scheduler_started = True
    asyncio.create_task(_backup_loop())


async def _backup_loop() -> None:
    while True:
        try:
            async_sleep = asyncio.sleep
            with SessionLocal() as db:
                row = db.query(BackupSetting).first()
                if not row or not row.enabled:
                    await async_sleep(60)
                    continue
                # run if due (last_success_at older than frequency)
                now = datetime.now(tz=timezone.utc)
                due = True
                if row.last_success_at:
                    delta = now - row.last_success_at
                    due = delta.total_seconds() >= max(300, int(row.frequency_minutes or 60) * 60)
                if due:
                    ok = await run_backup_and_maybe_send(row)
                    if ok:
                        row.last_success_at = now
                        db.add(row)
                        db.commit()
                await async_sleep(60)
        except Exception:
            try:
                await asyncio.sleep(60)
            except Exception:
                pass

