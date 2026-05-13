from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.comment import Comment
    from app.models.user import User


class Video(SQLModel, table=True):
    __tablename__ = "videos"

    id: int | None = Field(default=None, primary_key=True)
    title: str = Field(max_length=200, index=True)
    description: str = Field(max_length=2000, default="")
    category: str = Field(max_length=50, index=True)
    video_url: str = Field(max_length=500)
    thumbnail_url: str = Field(max_length=500)
    duration: str = Field(max_length=10, default="00:00")
    owner_id: int | None = Field(default=None, foreign_key="users.id", index=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    comments: list["Comment"] = Relationship(back_populates="video")
    owner: Optional["User"] = Relationship(back_populates="videos")
