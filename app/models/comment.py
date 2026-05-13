from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.video import Video
    from app.models.user import User


class Comment(SQLModel, table=True):
    __tablename__ = "comments"

    id: int | None = Field(default=None, primary_key=True)
    video_id: int = Field(foreign_key="videos.id", index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    content: str = Field(max_length=1000)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    video: Optional["Video"] = Relationship(back_populates="comments")
    user: Optional["User"] = Relationship(back_populates="comments")

    @property
    def author(self) -> str:
        return self.user.username if self.user else "Desconocido"
