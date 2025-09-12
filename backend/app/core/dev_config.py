"""
Development configuration with SQLite fallback
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException
from app.core.config import get_settings

def get_dev_database_url():
    """Get database URL with SQLite fallback for development"""
    settings = get_settings()
    
    # Try PostgreSQL first
    try:
        # Test PostgreSQL connection
        test_engine = create_engine(settings.database_url, pool_pre_ping=True)
        with test_engine.connect() as conn:
            conn.execute("SELECT 1")
        return settings.database_url
    except Exception:
        # Fallback to SQLite
        sqlite_url = "sqlite:///./dev_marzban.db"
        print(f"PostgreSQL not available, using SQLite: {sqlite_url}")
        return sqlite_url

def get_dev_engine():
    """Get database engine with fallback"""
    database_url = get_dev_database_url()
    return create_engine(
        database_url, 
        pool_pre_ping=True,
        connect_args={"check_same_thread": False} if "sqlite" in database_url else {}
    )

def get_dev_session():
    """Get database session with fallback"""
    engine = get_dev_engine()
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create development session
DevSessionLocal = get_dev_session()

def get_dev_db():
    """Development database dependency with better error handling"""
    from sqlalchemy.orm import Session
    from sqlalchemy.exc import OperationalError
    
    db: Session = DevSessionLocal()
    try:
        # Test the connection
        db.execute("SELECT 1")
        yield db
    except OperationalError as e:
        db.close()
        raise HTTPException(
            status_code=503, 
            detail="خطا در اتصال به پایگاه داده. لطفاً سرویس‌های پایگاه داده را بررسی کنید."
        )
    except Exception as e:
        db.close()
        raise HTTPException(
            status_code=500, 
            detail="خطای داخلی سرور در اتصال به پایگاه داده"
        )
    finally:
        db.close()