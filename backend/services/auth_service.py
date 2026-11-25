from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from pwdlib import PasswordHash

from repositories.user_repository import create_user, get_user_by_email
from models.user import User

password_hash = PasswordHash.recommended()


class EmailAlreadyRegisteredError(Exception):
    pass


def register_user(db: Session, email: str, password: str) -> User:
    if get_user_by_email(db, email) is not None:
        raise EmailAlreadyRegisteredError

    hashed_password = password_hash.hash(password)
    try:
        return create_user(db, email, hashed_password)
    except IntegrityError as error:
        db.rollback()
        raise EmailAlreadyRegisteredError from error


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if user is None or not password_hash.verify(password, user.password_hash):
        return None
    return user
