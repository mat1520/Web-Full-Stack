from typing import Dict, List
from urllib.parse import unquote
import logging
import time

logger = logging.getLogger(__name__)

from fastapi import HTTPException, status
from sqlmodel import Session, select, col, func

from app.models.video import Video
from app.models.category import Category
from app.services.s3_service import S3Service


_CATEGORY_CACHE = {"data": [], "timestamp": 0}
CACHE_TTL = 300


class VideoService:

    def __init__(self, session: Session):
        self.session = session

    def get_videos(self, category: str | None = None) -> List[Video]:
        statement = select(Video).join(Category, isouter=True).order_by(col(Video.created_at).desc())
        if category:
            statement = statement.where(func.lower(Category.name) == category.lower())
        return list(self.session.exec(statement).all())

    def get_video_detail(self, video_id: int) -> Video:
        video = self.session.get(Video, video_id)
        if not video:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Video con id {video_id} no encontrado",
            )
        return video

    def get_categories(self) -> List[Category]:
        global _CATEGORY_CACHE
        if time.time() - _CATEGORY_CACHE["timestamp"] < CACHE_TTL and _CATEGORY_CACHE["data"]:
            return _CATEGORY_CACHE["data"]

        categories = self.session.exec(select(Category)).all()
        _CATEGORY_CACHE["data"] = categories
        _CATEGORY_CACHE["timestamp"] = time.time()
        return categories

    def get_random_picks(self, per_category: int = 10) -> Dict[str, List[Video]]:
        categories = self.get_categories()
        picks: Dict[str, List[Video]] = {}
        for cat in categories:
            statement = (
                select(Video)
                .where(Video.category_id == cat.id)
                .order_by(func.random())
                .limit(per_category)
            )
            picks[cat.name] = list(self.session.exec(statement).all())
        return picks

    def _get_or_create_category(self, name: str) -> Category:
        cat_obj = self.session.exec(select(Category).where(func.lower(Category.name) == name.lower())).first()
        if not cat_obj:
            cat_obj = Category(name=name)
            self.session.add(cat_obj)
            self.session.commit()
            self.session.refresh(cat_obj)
        return cat_obj

    def _invalidate_category_cache(self) -> None:
        global _CATEGORY_CACHE
        _CATEGORY_CACHE["timestamp"] = 0

    def create_video(
        self,
        title: str,
        description: str,
        category: str,
        video_url: str,
        thumbnail_url: str,
        owner_id: int,
    ) -> Video:
        cat_obj = self._get_or_create_category(category)

        video = Video(
            title=title,
            description=description,
            category_id=cat_obj.id,
            video_url=video_url,
            thumbnail_url=thumbnail_url,
            owner_id=owner_id,
        )
        self.session.add(video)
        self.session.commit()
        self.session.refresh(video)
        
        self._invalidate_category_cache()
        return video

    def _delete_s3_files(self, s3: S3Service, video: Video) -> None:
        try:
            video_key = unquote(video.video_url.split(".amazonaws.com/")[-1])
            thumb_key = unquote(video.thumbnail_url.split(".amazonaws.com/")[-1])
            s3.delete_object(video_key)
            s3.delete_object(thumb_key)
        except Exception as exc:
            logger.warning("Failed to delete S3 files for video %s: %s", video.id, exc)

    def delete_video(self, s3: S3Service, video_id: int, user_id: int) -> None:
        video = self.get_video_detail(video_id)
        if video.owner_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para eliminar este video",
            )

        self._delete_s3_files(s3, video)

        self.session.delete(video)
        self.session.commit()
