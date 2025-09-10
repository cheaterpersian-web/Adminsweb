import os
import sys
import subprocess

# Ensure project root (containing the `app` package) is on sys.path when run as a script
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)


def run(cmd):
    import shlex
    return subprocess.check_call(shlex.split(cmd))


def seed_admin() -> None:
    from sqlalchemy.orm import Session
    from sqlalchemy import create_engine
    from app.core.config import get_settings
    from app.db.base import Base
    from app.models.user import User
    from app.core.security import hash_password

    settings = get_settings()
    engine = create_engine(settings.database_url)
    Base.metadata.create_all(engine)
    session = Session(bind=engine)
    try:
        # 1) Always ensure a core default admin exists (match README defaults)
        core_email = "admin@example.com"
        core_password = "admin123"
        core_name = "Administrator"
        force_reset = (os.getenv("ADMIN_FORCE_RESET", "false").lower() in {"1", "true", "yes"})

        user = session.query(User).filter(User.email == core_email).first()
        if not user:
            user = User(
                name=core_name,
                email=core_email,
                hashed_password=hash_password(core_password),
                role="admin",
                is_active=True,
            )
            session.add(user)
            session.commit()
            session.refresh(user)
        else:
            updated = False
            if user.role != "admin":
                user.role = "admin"
                updated = True
            if not user.is_active:
                user.is_active = True
                updated = True
            if user.name != core_name:
                user.name = core_name
                updated = True
            if force_reset:
                user.hashed_password = hash_password(core_password)
                updated = True
            if updated:
                session.add(user)
                session.commit()
                session.refresh(user)

        # 2) Optionally ensure env-provided admin as well (if different email)
        env_email = os.getenv("ADMIN_EMAIL")
        env_password = os.getenv("ADMIN_PASSWORD")
        env_name = os.getenv("ADMIN_NAME") or "Admin"
        if env_email and env_password and env_email != core_email:
            env_user = session.query(User).filter(User.email == env_email).first()
            if not env_user:
                env_user = User(
                    name=env_name,
                    email=env_email,
                    hashed_password=hash_password(env_password),
                    role="admin",
                    is_active=True,
                )
                session.add(env_user)
                session.commit()
                session.refresh(env_user)
            else:
                env_updated = False
                if env_user.role != "admin":
                    env_user.role = "admin"
                    env_updated = True
                if not env_user.is_active:
                    env_user.is_active = True
                    env_updated = True
                if env_name and env_user.name != env_name:
                    env_user.name = env_name
                    env_updated = True
                if force_reset:
                    env_user.hashed_password = hash_password(env_password)
                    env_updated = True
                if env_updated:
                    session.add(env_user)
                    session.commit()
                    session.refresh(env_user)
    finally:
        session.close()


def main() -> None:
    # Set database URL for Alembic if provided
    db_url = os.getenv("DATABASE_URL")
    ini_path = os.path.join(os.path.dirname(__file__), "..", "alembic.ini")
    if db_url:
        os.environ["DATABASE_URL"] = db_url
    # Run migrations
    run(f"python -m alembic -c {ini_path} upgrade head")
    # Seed admin
    seed_admin()
    # Exec uvicorn
    os.execvp("uvicorn", [
        "uvicorn",
        "app.main:app",
        "--host", "0.0.0.0",
        "--port", os.getenv("PORT", "8000"),
    ])


if __name__ == "__main__":
    main()