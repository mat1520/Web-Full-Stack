from typing import Dict, List
from urllib.parse import unquote
import time

from fastapi import HTTPException, status
from sqlmodel import Session, select, col, func

from app.models.video import Video
from app.services.s3_service import S3Service


_CATEGORY_CACHE = {"data": [], "timestamp": 0}
CACHE_TTL = 300  # 5 minutos


class VideoService:
    """Servicio de gestión de Videos aplicando Single Responsibility Principle."""

    def __init__(self, session: Session):
        self.session = session

    def get_videos(self, category: str | None = None) -> List[Video]:
        """Obtiene la lista de videos, opcionalmente filtrada por categoría."""
        statement = select(Video).order_by(col(Video.created_at).desc())
        if category:
            statement = statement.where(func.lower(Video.category) == category.lower())
        return list(self.session.exec(statement).all())

    def get_video_detail(self, video_id: int) -> Video:
        """Obtiene el detalle de un video específico."""
        video = self.session.get(Video, video_id)
        if not video:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Video con id {video_id} no encontrado",
            )
        return video

    def get_categories(self) -> List[str]:
        """Obtiene categorías distintas usando una estrategia simple de caché."""
        global _CATEGORY_CACHE
        if time.time() - _CATEGORY_CACHE["timestamp"] < CACHE_TTL and _CATEGORY_CACHE["data"]:
            return _CATEGORY_CACHE["data"]

        categories = self.session.exec(select(Video.category).distinct()).all()
        _CATEGORY_CACHE["data"] = categories
        _CATEGORY_CACHE["timestamp"] = time.time()
        return categories

    def get_random_picks(self, per_category: int = 10) -> Dict[str, List[Video]]:
        """Devuelve una selección aleatoria de videos agrupada por categoría."""
        categories = self.get_categories()
        picks: Dict[str, List[Video]] = {}
        for cat in categories:
            statement = (
                select(Video)
                .where(Video.category == cat)
                .order_by(func.random())
                .limit(per_category)
            )
            picks[cat] = list(self.session.exec(statement).all())
        return picks

    def create_video(
        self,
        title: str,
        description: str,
        category: str,
        video_url: str,
        thumbnail_url: str,
        owner_id: int,
    ) -> Video:
        """Crea un registro de video en la base de datos."""
        video = Video(
            title=title,
            description=description,
            category=category,
            video_url=video_url,
            thumbnail_url=thumbnail_url,
            owner_id=owner_id,
        )
        self.session.add(video)
        self.session.commit()
        self.session.refresh(video)
        
        # Invalidar caché de categorías tras la creación
        global _CATEGORY_CACHE
        _CATEGORY_CACHE["timestamp"] = 0
        
        return video

    def delete_video(self, s3: S3Service, video_id: int, user_id: int) -> None:
        """Elimina un video físicamente de S3 y de la base de datos."""
        video = self.get_video_detail(video_id)
        
        if video.owner_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para eliminar este video",
            )

        try:
            video_key = unquote(video.video_url.split(".amazonaws.com/")[-1])
            thumb_key = unquote(video.thumbnail_url.split(".amazonaws.com/")[-1])
            s3.delete_object(video_key)
            s3.delete_object(thumb_key)
        except Exception:
            pass  # Fail gracefully on S3 errors to ensure DB consistency

        self.session.delete(video)
        self.session.commit()


def get_video_service(session: Session) -> VideoService:
    return VideoService(session)
