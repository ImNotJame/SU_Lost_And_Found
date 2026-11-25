from datetime import datetime
from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session
from pathlib import Path

from models.post import Post


def create_post(
    db: Session,
    *,
    owner_id: int,
    kind: Literal["lost", "found"],
    item_name: str,
    description: str,
    location: str,
    event_date: datetime | None,
) -> Post:
    post = Post(
        owner_id=owner_id,
        kind=kind,
        item_name=item_name,
        description=description,
        location=location,
        event_date=event_date,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


def list_posts(
    db: Session,
    *,
    kind: Literal["lost", "found"] | None,
    skip: int,
    limit: int,
) -> list[Post]:
    statement = select(Post).order_by(Post.created_at.desc(), Post.id.desc())
    if kind is not None:
        statement = statement.where(Post.kind == kind)
    return list(db.scalars(statement.offset(skip).limit(limit)).all())


def get_post(db: Session, post_id: int) -> Post | None:
    return db.get(Post, post_id)


def list_user_posts(db: Session, *, owner_id: int) -> list[Post]:
    statement = (
        select(Post)
        .where(Post.owner_id == owner_id)
        .order_by(Post.created_at.desc(), Post.id.desc())
    )
    return list(db.scalars(statement).all())


def delete_post(db: Session, post: Post) -> None:
    if post.image_path:
        upload_directory = Path(__file__).resolve().parents[1] / "uploads"
        image_file = upload_directory / post.image_path.removeprefix("/uploads/")
        if image_file.exists() and image_file.is_file():
            image_file.unlink(missing_ok=True)
    db.delete(post)
    db.commit()


def set_post_image(db: Session, post: Post, image_path: str) -> Post:
    post.image_path = image_path
    db.commit()
    db.refresh(post)
    return post
