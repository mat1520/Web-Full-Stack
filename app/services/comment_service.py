from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.comment import Comment
from app.models.video import Video
from app.schemas.comment import CommentCreate


def create_comment(session: Session, payload: CommentCreate, user_id: int) -> Comment:
    video = session.get(Video, payload.video_id)
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Video with id {payload.video_id} not found",
        )

    comment = Comment(
        video_id=payload.video_id,
        user_id=user_id,
        content=payload.content,
    )
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return comment
