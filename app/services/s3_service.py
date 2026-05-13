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

    def list_objects(self, prefix: str = "") -> list[dict]:
        try:
            response = self._client.list_objects_v2(
                Bucket=self._bucket, Prefix=prefix
            )
            return [
                {
                    "key": obj["Key"],
                    "size": obj["Size"],
                    "last_modified": obj["LastModified"],
                }
                for obj in response.get("Contents", [])
            ]
        except ClientError as exc:
            logger.error(
                "Failed to list objects with prefix '%s': %s", prefix, exc
            )
            raise

    def delete_object(self, key: str) -> None:
        try:
            self._client.delete_object(Bucket=self._bucket, Key=key)
            logger.info("Deleted s3://%s/%s", self._bucket, key)
        except ClientError as exc:
            logger.error("Failed to delete s3://%s/%s: %s", self._bucket, key, exc)
            raise

    def purge_bucket(self) -> int:
        deleted = 0
        paginator = self._client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=self._bucket):
            objects = page.get("Contents", [])
            if not objects:
                continue
            batch = [{"Key": obj["Key"]} for obj in objects]
            self._client.delete_objects(
                Bucket=self._bucket,
                Delete={"Objects": batch, "Quiet": True},
            )
            deleted += len(batch)
            logger.info("Purged %d objects from s3://%s", len(batch), self._bucket)
        logger.info("Total purged: %d objects", deleted)
        return deleted


def get_s3_service() -> S3Service:
    return S3Service(get_settings())
