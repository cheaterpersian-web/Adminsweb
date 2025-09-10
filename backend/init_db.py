#!/usr/bin/env python3
"""
Initialize the database with tables and admin user
"""
import os
import sys
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))

# Set environment variables for development
os.environ.setdefault("DATABASE_URL", "sqlite:///./dev.db")
os.environ.setdefault("SECRET_KEY", "dev-secret-key-change-in-production")
os.environ.setdefault("ADMIN_EMAIL", "admin@example.com")
os.environ.setdefault("ADMIN_PASSWORD", "admin123")

from app.db.base import Base
from app.db.session import engine, get_db
from app.models.user import User
from app.core.security import hash_password
from sqlalchemy.orm import Session

def init_db():
    """Initialize database tables and create admin user"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    print("Creating admin user...")
    db = next(get_db())
    
    # Check if admin user already exists
    admin_user = db.query(User).filter(User.email == "admin@example.com").first()
    if not admin_user:
        admin_user = User(
            name="Admin User",
            email="admin@example.com",
            hashed_password=hash_password("admin123"),
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        print("Admin user created successfully!")
        print("Email: admin@example.com")
        print("Password: admin123")
    else:
        print("Admin user already exists!")
    
    db.close()

if __name__ == "__main__":
    init_db()