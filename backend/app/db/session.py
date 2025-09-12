from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException
from app.core.config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    from sqlalchemy.orm import Session
    from sqlalchemy.exc import OperationalError
    db: Session = SessionLocal()
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