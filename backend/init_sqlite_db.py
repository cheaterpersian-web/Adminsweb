#!/usr/bin/env python3
"""
Simple SQLite database initialization script
"""
import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from sqlalchemy import create_engine
from app.models.sqlite_models import Base, User
from app.core.security import hash_password

def init_sqlite_database():
    """Initialize the SQLite database"""
    try:
        # Create SQLite database
        database_url = "sqlite:///./dev_marzban.db"
        engine = create_engine(database_url, connect_args={"check_same_thread": False})
        
        # Create all tables
        print("Creating SQLite database tables...")
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully!")
        
        # Create a default admin user if none exists
        from sqlalchemy.orm import sessionmaker
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        db = SessionLocal()
        try:
            admin_user = db.query(User).filter(User.email == "admin@example.com").first()
            if not admin_user:
                admin_user = User(
                    name="مدیر سیستم",
                    email="admin@example.com",
                    hashed_password=hash_password("admin123"),
                    role="admin",
                    is_active=True
                )
                db.add(admin_user)
                db.commit()
                print("Default admin user created: admin@example.com / admin123")
            else:
                print("Admin user already exists")
        except Exception as e:
            print(f"Error creating admin user: {e}")
            db.rollback()
        finally:
            db.close()
            
    except Exception as e:
        print(f"Error initializing database: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("Initializing SQLite database...")
    if init_sqlite_database():
        print("Database initialization completed successfully!")
    else:
        print("Database initialization failed!")
        sys.exit(1)