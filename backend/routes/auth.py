from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from models.user import User
from repositories.database import get_db
from routes.dependencies import get_current_user
from schemas.auth import TokenResponse, UserLogin, UserRegister, UserResponse
from services.auth_service import (
    EmailAlreadyRegisteredError,
    authenticate_user,
    register_user,
)
from services.token_service import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    JWTConfigurationError,
    create_access_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(payload: UserRegister, db: Session = Depends(get_db)) -> UserResponse:
    try:
        user = register_user(db, payload.email, payload.password)
    except EmailAlreadyRegisteredError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        ) from error

    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> TokenResponse:
    user = authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        access_token = create_access_token(user.id)
    except JWTConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error

    return TokenResponse(
        access_token=access_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)
