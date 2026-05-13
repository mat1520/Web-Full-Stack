from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.comment import CommentRead


class VideoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    category: str
    video_url: str
    thumbnail_url: str
    duration: str
    owner_id: int | None = None
    created_at: datetime
    updated_at: datetime


class VideoDetail(VideoRead):
    comments: list[CommentRead] = []
