from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from models.user import User
from repositories.database import get_db
from routes.dependencies import get_current_user
from schemas.claim import ClaimCreate, ClaimDecision, ClaimResponse
from services.claim_service import (
    ClaimConflictError,
    ClaimForbiddenError,
    ClaimNotFoundError,
    get_claims_for_post,
    get_claims_for_user,
    request_claim,
    review_claim,
)

router = APIRouter(tags=["claims"])


@router.post(
    "/posts/{post_id}/claims",
    response_model=ClaimResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_claim(
    post_id: int,
    payload: ClaimCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClaimResponse:
    try:
        claim = request_claim(
            db,
            post_id=post_id,
            requester_id=current_user.id,
            message=payload.message,
        )
    except ClaimNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except ClaimConflictError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    return ClaimResponse.model_validate(claim)


@router.get("/posts/{post_id}/claims", response_model=list[ClaimResponse])
def list_claims_for_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ClaimResponse]:
    try:
        claims = get_claims_for_post(db, post_id=post_id, user_id=current_user.id)
    except ClaimNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except ClaimForbiddenError as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error)) from error
    return [
        ClaimResponse.model_validate(claim).model_copy(
            update={"requester_email": claim.requester.email}
        )
        for claim in claims
    ]


@router.get("/claims/me", response_model=list[ClaimResponse])
def list_my_claims(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ClaimResponse]:
    claims = get_claims_for_user(db, user_id=current_user.id)
    return [
        ClaimResponse.model_validate(claim).model_copy(
            update={
                "owner_email": (
                    claim.post.owner.email if claim.status == "approved" else None
                )
            }
        )
        for claim in claims
    ]


@router.patch(
    "/posts/{post_id}/claims/{claim_id}",
    response_model=ClaimResponse,
)
def decide_post_claim(
    post_id: int,
    claim_id: int,
    payload: ClaimDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClaimResponse:
    try:
        claim = review_claim(
            db,
            post_id=post_id,
            claim_id=claim_id,
            reviewer_id=current_user.id,
            decision=payload.status,
        )
    except ClaimNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except ClaimForbiddenError as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error)) from error
    except ClaimConflictError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    return ClaimResponse.model_validate(claim)
