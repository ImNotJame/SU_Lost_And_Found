from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from models.claim import Claim
from models.post import Post


def get_post(db: Session, post_id: int, *, for_update: bool = False) -> Post | None:
    statement = select(Post).where(Post.id == post_id)
    if for_update:
        statement = statement.with_for_update()
    return db.scalar(statement)


def get_claim(db: Session, post_id: int, claim_id: int) -> Claim | None:
    return db.scalar(
        select(Claim).where(Claim.id == claim_id, Claim.post_id == post_id)
    )


def get_existing_claim(
    db: Session, post_id: int, requester_id: int
) -> Claim | None:
    return db.scalar(
        select(Claim).where(
            Claim.post_id == post_id,
            Claim.requester_id == requester_id,
            Claim.status.in_(("pending", "approved")),
        )
    )


def create_claim(
    db: Session, post_id: int, requester_id: int, message: str | None
) -> Claim:
    claim = Claim(
        post_id=post_id,
        requester_id=requester_id,
        message=message,
        status="pending",
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim


def list_post_claims(db: Session, post_id: int) -> list[Claim]:
    statement = (
        select(Claim)
        .where(Claim.post_id == post_id)
        .order_by(Claim.created_at.desc(), Claim.id.desc())
    )
    return list(db.scalars(statement).all())


def list_user_claims(db: Session, requester_id: int) -> list[Claim]:
    statement = (
        select(Claim)
        .where(Claim.requester_id == requester_id)
        .order_by(Claim.created_at.desc(), Claim.id.desc())
    )
    return list(db.scalars(statement).all())


def decide_claim(
    db: Session,
    *,
    post: Post,
    claim: Claim,
    reviewer_id: int,
    decision: str,
) -> Claim:
    now = datetime.now(timezone.utc)
    claim.status = decision
    claim.reviewer_id = reviewer_id
    claim.reviewed_at = now

    if decision == "approved":
        post.status = "claimed"
        db.execute(
            update(Claim)
            .where(
                Claim.post_id == post.id,
                Claim.id != claim.id,
                Claim.status == "pending",
            )
            .values(
                status="rejected",
                reviewer_id=reviewer_id,
                reviewed_at=now,
            )
        )

    db.commit()
    db.refresh(claim)
    return claim
