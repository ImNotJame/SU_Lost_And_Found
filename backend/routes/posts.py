from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from pathlib import Path
import secrets
from sqlalchemy.orm import Session

from models.user import User
from models.post import Post
from repositories.database import get_db
from routes.dependencies import get_current_user
from schemas.post import PostCreate, PostResponse
from services.post_service import (
    PostForbiddenError,
    PostNotFoundError,
    create_user_post,
    delete_user_post,
    get_posts,
    get_user_posts,
    update_user_post_status,
    update_user_post_image,
)

router = APIRouter(prefix="/posts", tags=["posts"])

UPLOAD_DIRECTORY = Path(__file__).resolve().parents[1] / "uploads"
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 1_500_000


@router.post(
    "",
    response_model=PostResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_post(
    payload: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PostResponse:
    post = create_user_post(
        db,
        owner_id=current_user.id,
        kind=payload.kind,
        item_name=payload.item_name,
        description=payload.description,
        location=payload.location,
        event_date=payload.event_date,
    )
    return PostResponse.model_validate(post)


@router.get("", response_model=list[PostResponse])
def browse_posts(
    kind: Literal["lost", "found"] | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[PostResponse]:
    posts = get_posts(db, kind=kind, skip=skip, limit=limit)
    return [PostResponse.model_validate(post) for post in posts]


@router.get("/me", response_model=list[PostResponse])
def browse_my_posts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PostResponse]:
    posts = get_user_posts(db, owner_id=current_user.id)
    return [PostResponse.model_validate(post) for post in posts]


@router.patch("/{post_id}/status", response_model=PostResponse)
def set_post_status(
    post_id: int,
    status_value: Literal["open", "claimed", "returned"],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PostResponse:
    try:
        post = update_user_post_status(
            db,
            post_id=post_id,
            owner_id=current_user.id,
            status_value=status_value,
        )
    except PostNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except PostForbiddenError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    return PostResponse.model_validate(post)


@router.post("/{post_id}/image", response_model=PostResponse)
async def upload_post_image(
    post_id: int,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PostResponse:
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="กรุณาอัปโหลดไฟล์ JPG, PNG หรือ WEBP",
        )

    contents = await image.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="รูปภาพต้องมีขนาดไม่เกิน 1.5 MB",
        )

    extension = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }[image.content_type]
    UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
    filename = f"post-{post_id}-{secrets.token_hex(8)}{extension}"
    file_path = UPLOAD_DIRECTORY / filename
    file_path.write_bytes(contents)

    existing_post = db.get(Post, post_id)
    old_image_path = existing_post.image_path if existing_post else None
    try:
        post = update_user_post_image(
            db,
            post_id=post_id,
            owner_id=current_user.id,
            image_path=f"/uploads/{filename}",
        )
    except PostNotFoundError as error:
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=404, detail=str(error)) from error
    except PostForbiddenError as error:
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=403, detail=str(error)) from error

    if old_image_path and old_image_path != f"/uploads/{filename}":
        old_path = UPLOAD_DIRECTORY / old_image_path.removeprefix("/uploads/")
        if old_path.exists() and old_path.is_file():
            old_path.unlink(missing_ok=True)
    return PostResponse.model_validate(post)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    try:
        delete_user_post(db, post_id=post_id, owner_id=current_user.id)
    except PostNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except PostForbiddenError as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
