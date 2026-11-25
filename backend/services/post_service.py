from datetime import datetime
from typing import Literal

from sqlalchemy.orm import Session

from models.post import Post
from repositories.post_repository import (
    create_post,
    delete_post,
    get_post,
    list_posts,
    list_user_posts,
    set_post_image,
)


class PostNotFoundError(Exception):
    pass


class PostForbiddenError(Exception):
    pass


def create_user_post(
    db: Session,
    *,
    owner_id: int,
    kind: Literal["lost", "found"],
    item_name: str,
    description: str,
    location: str,
    event_date: datetime | None,
) -> Post:
    return create_post(
        db,
        owner_id=owner_id,
        kind=kind,
        item_name=item_name,
        description=description,
        location=location,
        event_date=event_date,
    )


def get_posts(
    db: Session,
    *,
    kind: Literal["lost", "found"] | None,
    skip: int,
    limit: int,
) -> list[Post]:
    return list_posts(db, kind=kind, skip=skip, limit=limit)


def get_user_posts(db: Session, *, owner_id: int) -> list[Post]:
    return list_user_posts(db, owner_id=owner_id)


def update_user_post_status(
    db: Session,
    *,
    post_id: int,
    owner_id: int,
    status_value: Literal["open", "claimed", "returned"],
) -> Post:
    post = get_post(db, post_id)
    if post is None:
        raise PostNotFoundError("Post not found.")
    if post.owner_id != owner_id:
        raise PostForbiddenError("Only the post owner can update this post.")
    post.status = status_value
    db.commit()
    db.refresh(post)
    return post


def delete_user_post(db: Session, *, post_id: int, owner_id: int) -> None:
    post = get_post(db, post_id)
    if post is None:
        raise PostNotFoundError("Post not found.")
    if post.owner_id != owner_id:
        raise PostForbiddenError("Only the post owner can delete this post.")
    delete_post(db, post)


def update_user_post_image(
    db: Session,
    *,
    post_id: int,
    owner_id: int,
    image_path: str,
) -> Post:
    post = get_post(db, post_id)
    if post is None:
        raise PostNotFoundError("Post not found.")
    if post.owner_id != owner_id:
        raise PostForbiddenError("Only the post owner can update this post.")
    return set_post_image(db, post, image_path)
