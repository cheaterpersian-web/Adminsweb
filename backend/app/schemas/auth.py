from pydantic import BaseModel


class LoginRequest(BaseModel):
    # Accept plain string to support legacy non-email usernames like "admin"
    email: str
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"