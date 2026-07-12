"""File storage helper — saves uploads to S3 when configured, otherwise to a local folder.

Set these environment variables on the server to enable S3 (falls back to local
disk storage under uploads/ when S3_BUCKET_NAME is not set, e.g. for local dev):
  S3_BUCKET_NAME   - the S3 bucket to upload into
  AWS_REGION       - bucket region (default: us-east-1)
  AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY - or rely on an IAM role
"""
import os
from pathlib import Path

UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

S3_BUCKET = os.environ.get("S3_BUCKET_NAME")
S3_REGION = os.environ.get("AWS_REGION", "us-east-1")

_s3_client = None
if S3_BUCKET:
    import boto3
    _s3_client = boto3.client("s3", region_name=S3_REGION)


def save_file(contents: bytes, filename: str, content_type: str | None = None) -> str:
    """Saves file contents and returns the URL to serve it from."""
    if _s3_client:
        extra_args = {"ContentType": content_type} if content_type else {}
        _s3_client.put_object(Bucket=S3_BUCKET, Key=filename, Body=contents, **extra_args)
        return f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{filename}"
    (UPLOADS_DIR / filename).write_bytes(contents)
    return f"/uploads/{filename}"
