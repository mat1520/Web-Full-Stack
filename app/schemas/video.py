from datetime import datetime

from app.schemas.base import BaseSchema
from app.schemas.comment import CommentRead


class CategoryRead(BaseSchema):
    id: int
    name: str


class VideoRead(BaseSchema):
    id: int
    title: str
    description: str
    category_id: int | None
    category: str
    video_url: str
    thumbnail_url: str
    duration: str
    owner_id: int | None = None
    created_at: datetime
    updated_at: datetime


class VideoDetail(VideoRead):
    comments: list[CommentRead] = []
