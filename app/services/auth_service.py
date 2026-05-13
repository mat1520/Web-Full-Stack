from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.core.auth import hash_password, verify_password, create_access_token
from app.models.user import User
from app.schemas.user import UserRegister


def register_user(session: Session, payload: UserRegister) -> User:
    existing = session.exec(
        select(User).where(
            (User.username == payload.username) | (User.email == payload.email)
        )
    ).first()

    if existing:
        field = "username" if existing.username == payload.username else "email"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El {field} ya está registrado",
        )

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def authenticate_user(session: Session, username: str, password: str) -> User:
    user = session.exec(
        select(User).where(User.username == username)
    ).first()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )
    return user


def generate_token(user: User) -> str:
    return create_access_token({"sub": str(user.id), "username": user.username})
