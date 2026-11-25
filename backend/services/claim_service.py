from sqlalchemy.orm import Session

from models.claim import Claim
from repositories.claim_repository import (
    create_claim,
    decide_claim,
    get_claim,
    get_existing_claim,
    get_post,
    list_post_claims,
    list_user_claims,
)


class ClaimNotFoundError(Exception):
    pass


class ClaimForbiddenError(Exception):
    pass


class ClaimConflictError(Exception):
    pass


def request_claim(
    db: Session, *, post_id: int, requester_id: int, message: str | None
) -> Claim:
    post = get_post(db, post_id, for_update=True)
    if post is None:
        raise ClaimNotFoundError("Post not found.")
    if post.owner_id == requester_id:
        raise ClaimConflictError("You cannot claim your own post.")
    if post.status != "open":
        raise ClaimConflictError("This post is no longer open for claims.")
    if get_existing_claim(db, post_id, requester_id) is not None:
        raise ClaimConflictError("You already have an active claim for this post.")
    return create_claim(db, post_id, requester_id, message)


def get_claims_for_post(
    db: Session, *, post_id: int, user_id: int
) -> list[Claim]:
    post = get_post(db, post_id)
    if post is None:
        raise ClaimNotFoundError("Post not found.")
    if post.owner_id != user_id:
        raise ClaimForbiddenError("Only the post owner can view its claims.")
    return list_post_claims(db, post_id)


def get_claims_for_user(db: Session, *, user_id: int) -> list[Claim]:
    return list_user_claims(db, user_id)


def review_claim(
    db: Session,
    *,
    post_id: int,
    claim_id: int,
    reviewer_id: int,
    decision: str,
) -> Claim:
    post = get_post(db, post_id, for_update=True)
    if post is None:
        raise ClaimNotFoundError("Post not found.")
    if post.owner_id != reviewer_id:
        raise ClaimForbiddenError("Only the post owner can review claims.")
    claim = get_claim(db, post_id, claim_id)
    if claim is None:
        raise ClaimNotFoundError("Claim not found.")
    if claim.status != "pending":
        raise ClaimConflictError("This claim has already been reviewed.")
    if decision == "approved" and post.status != "open":
        raise ClaimConflictError("This post is no longer open for claims.")
    return decide_claim(
        db,
        post=post,
        claim=claim,
        reviewer_id=reviewer_id,
        decision=decision,
    )
