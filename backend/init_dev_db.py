#!/usr/bin/env python3
"""
Development database initialization script
Creates tables if they don't exist
"""
import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.core.dev_config import get_dev_engine
from app.db.base import Base
from app.models import user, panel, root_admin, panel_inbound, panel_created_user, user_panel_credentials, config
from app.models.audit_log_compat import AuditLog
from app.models.notification_compat import Notification
from app.models.admins_nodes_compat import AdminsNode

def init_database():
    """Initialize the development database"""
    try:
        engine = get_dev_engine()
        
        # Create all tables
        print("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully!")
        
        # Create a default admin user if none exists
        from app.db.session import SessionLocal
        from app.models.user import User
        from app.core.security import hash_password
        
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
    print("Initializing development database...")
    if init_database():
        print("Database initialization completed successfully!")
    else:
        print("Database initialization failed!")
        sys.exit(1)