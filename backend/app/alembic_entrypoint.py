import os
import sys
import subprocess


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
        email = os.getenv("ADMIN_EMAIL")
        password = os.getenv("ADMIN_PASSWORD")
        if not email or not password:
            return
        user = session.query(User).filter(User.email == email).first()
        if not user:
            user = User(name="Admin", email=email, hashed_password=hash_password(password), role="admin", is_active=True)
            session.add(user)
            session.commit()
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