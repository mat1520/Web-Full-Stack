from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator

from app.core.security import sanitize_text
from app.schemas.base import BaseSchema


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = sanitize_text(v)
        if len(v) < 3 or len(v) > 50:
            raise ValueError("El username debe tener entre 3 y 50 caracteres")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("La contraseña debe tener al menos 6 caracteres")
        return v


class UserLogin(BaseModel):
    username: str
    password: str


class UserRead(BaseSchema):
    id: int
    username: str
    email: str
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
