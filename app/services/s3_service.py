import logging
from pathlib import Path
from urllib.parse import quote

import boto3
from botocore.exceptions import ClientError

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)


class S3Service:
    def __init__(self, settings: Settings) -> None:
        self._bucket = settings.AWS_BUCKET_NAME
        self._region = settings.AWS_REGION
        self._client = boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )

    def build_public_url(self, key: str) -> str:
        encoded_key = quote(key, safe="/")
        return (
            f"https://{self._bucket}.s3.{self._region}.amazonaws.com/{encoded_key}"
        )

    def upload_file(
        self,
        file_path: str | Path,
        key: str,
        *,
        content_type: str = "application/octet-stream",
        cleanup: bool = True,
    ) -> str:
        file_path = Path(file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"Local file not found: {file_path}")

        try:
            self._client.upload_file(
                str(file_path),
                self._bucket,
                key,
                ExtraArgs={"ContentType": content_type},
            )
            logger.info(
                "Uploaded %s -> s3://%s/%s", file_path.name, self._bucket, key
            )
        except ClientError as exc:
            logger.error("S3 upload failed for %s: %s", key, exc)
            raise

        public_url = self.build_public_url(key)

        if cleanup:
            try:
                file_path.unlink()
                logger.info("Cleaned up local file: %s", file_path)
            except OSError as exc:
                logger.warning(
                    "Failed to delete local file %s: %s", file_path, exc
                )

        return public_url

    def delete_object(self, key: str) -> None:
        try:
            self._client.delete_object(Bucket=self._bucket, Key=key)
            logger.info("Deleted s3://%s/%s", self._bucket, key)
        except ClientError as exc:
            logger.error("Failed to delete s3://%s/%s: %s", self._bucket, key, exc)
            raise

    def extract_key_from_url(self, url: str) -> str:
        from urllib.parse import unquote
        return unquote(url.split(".amazonaws.com/")[-1])


def get_s3_service() -> S3Service:
    return S3Service(get_settings())

