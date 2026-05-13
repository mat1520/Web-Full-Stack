from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.core.security import sanitize_text


class CommentCreate(BaseModel):
    video_id: int
    content: str

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        v = sanitize_text(v)
        if len(v) < 1 or len(v) > 1000:
            raise ValueError("content must be between 1 and 1000 characters")
        return v


class CommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    video_id: int
    author: str
    content: str
    created_at: datetime
    updated_at: datetime
