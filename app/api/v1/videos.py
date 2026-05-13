import re
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, Form, Query, UploadFile, File, HTTPException
from sqlmodel import Session

from app.core.auth import get_current_user
from app.core.database import get_session
from app.models.user import User
from app.schemas.video import VideoRead, VideoDetail, CategoryRead
from app.services.video_service import VideoService
from app.services.s3_service import get_s3_service, S3Service

router = APIRouter(prefix="/videos", tags=["Videos"])

ALLOWED_VIDEO = {"video/mp4", "video/webm", "video/quicktime"}
ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/webp"}

MAGIC_SIGNATURES = {
    b"\x00\x00\x00": "video/mp4",
    b"\x1a\x45\xdf\xa3": "video/webm",
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG": "image/png",
    b"RIFF": "image/webp",
}


def _validate_file_signature(file: UploadFile, allowed: set[str]) -> None:
    header = file.file.read(12)
    file.file.seek(0)
    for magic, mime in MAGIC_SIGNATURES.items():
        if header.startswith(magic) and mime in allowed:
            return
    raise HTTPException(400, "El archivo no coincide con un formato permitido")


def _safe_key(name: str) -> str:
    clean = re.sub(r'[<>:"/\\|?*\']', "", name)
    clean = re.sub(r"\s+", "_", clean).strip("_")
    return clean[:80]


def _process_and_upload(
    file: UploadFile, s3_key: str, content_type: str, s3: S3Service
) -> str:
    suffix = Path(s3_key).suffix or ".bin"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file.file.read())
        tmp_path = Path(tmp.name)
    return s3.upload_file(tmp_path, s3_key, content_type=content_type, cleanup=True)


def get_video_service_dep(session: Session = Depends(get_session)) -> VideoService:
    return VideoService(session)


@router.get("", response_model=list[VideoRead])
def list_videos(
    category: str | None = Query(default=None, max_length=50),
    service: VideoService = Depends(get_video_service_dep),
):
    return service.get_videos(category=category)


@router.get("/random-picks", response_model=dict[str, list[VideoRead]])
def random_picks(service: VideoService = Depends(get_video_service_dep)):
    return service.get_random_picks()


@router.get("/categories", response_model=list[CategoryRead])
def get_categories(service: VideoService = Depends(get_video_service_dep)):
    return service.get_categories()


@router.get("/{video_id}", response_model=VideoDetail)
def get_video(video_id: int, service: VideoService = Depends(get_video_service_dep)):
    return service.get_video_detail(video_id)


@router.post("/upload", response_model=VideoRead, status_code=201)
def upload_video(
    title: str = Form(..., max_length=200),
    description: str = Form("", max_length=2000),
    category: str = Form(..., max_length=50),
    video_file: UploadFile = File(...),
    thumbnail_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    service: VideoService = Depends(get_video_service_dep),
    s3: S3Service = Depends(get_s3_service),
):
    if video_file.content_type not in ALLOWED_VIDEO:
        raise HTTPException(400, "Formato de video no soportado (mp4, webm)")

    if thumbnail_file.content_type not in ALLOWED_IMAGE:
        raise HTTPException(400, "Formato de imagen no soportado (jpg, png, webp)")

    _validate_file_signature(video_file, ALLOWED_VIDEO)
    _validate_file_signature(thumbnail_file, ALLOWED_IMAGE)

    safe_name = _safe_key(title)
    video_ext = video_file.filename.rsplit(".", 1)[-1] if "." in video_file.filename else "mp4"

    video_url = _process_and_upload(
        video_file, f"videos/{safe_name}.{video_ext}", video_file.content_type, s3
    )
    thumbnail_url = _process_and_upload(
        thumbnail_file, f"thumbnails/{safe_name}.jpg", "image/jpeg", s3
    )

    return service.create_video(
        title=title,
        description=description,
        category=category,
        video_url=video_url,
        thumbnail_url=thumbnail_url,
        owner_id=current_user.id,
    )


@router.delete("/{video_id}", status_code=204)
def delete_video(
    video_id: int,
    current_user: User = Depends(get_current_user),
    service: VideoService = Depends(get_video_service_dep),
    s3: S3Service = Depends(get_s3_service),
):
    service.delete_video(s3, video_id, current_user.id)
