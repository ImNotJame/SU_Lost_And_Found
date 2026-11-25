import os
from datetime import datetime, timedelta, timezone

import jwt

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))


class JWTConfigurationError(Exception):
    pass


class InvalidAccessTokenError(Exception):
    pass


def _get_secret_key() -> str:
    secret_key = os.getenv("JWT_SECRET_KEY")
    if not secret_key or len(secret_key.encode("utf-8")) < 32:
        raise JWTConfigurationError(
            "Set JWT_SECRET_KEY to a random secret of at least 32 characters."
        )
    return secret_key


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, _get_secret_key(), algorithm=ALGORITHM)


def decode_access_token(token: str) -> int:
    try:
        payload = jwt.decode(
            token,
            _get_secret_key(),
            algorithms=[ALGORITHM],
            options={"require": ["exp", "iat", "sub"]},
        )
        return int(payload["sub"])
    except JWTConfigurationError:
        raise
    except (jwt.InvalidTokenError, TypeError, ValueError, KeyError) as error:
        raise InvalidAccessTokenError from error
