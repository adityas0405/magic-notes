from dotenv import load_dotenv
load_dotenv()

import os
from dataclasses import dataclass
from functools import lru_cache
from typing import List

import boto3


def _parse_origins(value: str | None) -> List[str]:
    if not value:
        return []
    return [origin.strip() for origin in value.split(",") if origin.strip()]


DATABASE_URL = os.environ.get("DATABASE_URL")
JWT_SECRET = os.environ.get("JWT_SECRET")
JWT_EXPIRES_SECONDS = int(os.environ.get("JWT_EXPIRES_SECONDS", "604800"))

if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL must be set for the API service.")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET must be set for the API service.")


STORAGE_BACKEND = os.environ.get("STORAGE_BACKEND", "local").lower()
STORAGE_DIR = os.environ.get(
    "STORAGE_DIR", os.path.join(os.path.dirname(__file__), "storage")
)
CORS_ORIGINS = _parse_origins(os.environ.get("CORS_ORIGINS"))
CORS_ORIGIN_REGEX = os.environ.get("CORS_ORIGIN_REGEX", r"https://.*\\.vercel\\.app")


@dataclass(frozen=True)
class S3Settings:
    bucket: str
    region: str
    endpoint_url: str | None
    access_key_id: str
    secret_access_key: str
    presigned_expires: int


def _get_s3_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"{name} must be set when STORAGE_BACKEND=s3.")
    return value


def _load_s3_settings() -> S3Settings:
    return S3Settings(
        bucket=_get_s3_env("S3_BUCKET"),
        region=_get_s3_env("S3_REGION"),
        endpoint_url=os.environ.get("S3_ENDPOINT_URL"),
        access_key_id=_get_s3_env("S3_ACCESS_KEY_ID"),
        secret_access_key=_get_s3_env("S3_SECRET_ACCESS_KEY"),
        presigned_expires=int(os.environ.get("S3_PRESIGNED_EXPIRES", "3600")),
    )


s3_settings = _load_s3_settings() if STORAGE_BACKEND == "s3" else None


@lru_cache(maxsize=1)
def get_s3_client():
    if STORAGE_BACKEND != "s3" or s3_settings is None:
        raise RuntimeError("S3 client requested but STORAGE_BACKEND is not 's3'.")
    return boto3.client(
        "s3",
        region_name=s3_settings.region,
        endpoint_url=s3_settings.endpoint_url,
        aws_access_key_id=s3_settings.access_key_id,
        aws_secret_access_key=s3_settings.secret_access_key,
    )
