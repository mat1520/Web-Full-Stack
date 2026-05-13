from datetime import datetime, timezone

from sqlmodel import SQLModel, Field, Relationship


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(max_length=50, unique=True, index=True)
    email: str = Field(max_length=100, unique=True, index=True)
    hashed_password: str = Field(max_length=255)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    videos: list["Video"] = Relationship(back_populates="owner")
    comments: list["Comment"] = Relationship(back_populates="user")


from app.models.video import Video  # noqa: E402
from app.models.comment import Comment  # noqa: E402
