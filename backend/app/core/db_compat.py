"""
Database compatibility layer for different database backends
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
import json

def get_json_column():
    """Get appropriate JSON column type based on database"""
    try:
        from app.db.session import engine
        if 'postgresql' in str(engine.url):
            return JSONB
        else:
            # For SQLite and other databases, use Text with JSON serialization
            return Text
    except:
        # Default to Text for compatibility
        return Text

def json_serialize(value):
    """Serialize value to JSON string"""
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return json.dumps(value)

def json_deserialize(value):
    """Deserialize JSON string to Python object"""
    if value is None:
        return None
    if isinstance(value, str):
        try:
            return json.loads(value)
        except:
            return value
    return value