from __future__ import annotations

import argparse
import sys

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User
from app.models.root_admin import RootAdmin


def ensure_admin(email: str, password: str, name: str, phone: str | None) -> User:
    db: Session = SessionLocal()
    try:
        user: User | None = db.query(User).filter(User.email == email).first()
        if user is None:
            user = User(
                name=name or "Administrator",
                email=email,
                phone=phone,
                role="admin",
                is_active=True,
                hashed_password=hash_password(password),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Created admin user id={user.id} email={user.email}")
        else:
            # Update password and promote to admin if needed
            user.hashed_password = hash_password(password)
            user.role = "admin"
            user.is_active = True
            if name:
                user.name = name
            if phone is not None:
                user.phone = phone
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Updated existing user to admin id={user.id} email={user.email}")
        return user
    finally:
        db.close()


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Create or update an admin user")
    parser.add_argument("--email", required=True, help="Email address of the admin user")
    parser.add_argument("--password", required=True, help="Plain password to set for the admin user")
    parser.add_argument("--name", default="Administrator", help="Display name")
    parser.add_argument("--phone", default=None, help="Phone number (optional)")
    args = parser.parse_args(argv)

    user = ensure_admin(email=args.email, password=args.password, name=args.name, phone=args.phone)
    # Mark as root admin
    db: Session = SessionLocal()
    try:
        ra = db.query(RootAdmin).filter(RootAdmin.user_id == user.id).first()
        if not ra:
            ra = RootAdmin(user_id=user.id)
            db.add(ra)
            db.commit()
            print(f"Granted root admin privileges to user id={user.id}")
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

