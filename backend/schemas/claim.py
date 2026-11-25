from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ClaimCreate(BaseModel):
    message: str | None = Field(default=None, max_length=1000)

    @field_validator("message")
    @classmethod
    def strip_message(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped_value = value.strip()
        return stripped_value or None


class ClaimDecision(BaseModel):
    status: Literal["approved", "rejected"]


class ClaimResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    post_id: int
    requester_id: int
    reviewer_id: int | None
    message: str | None
    status: Literal["pending", "approved", "rejected"]
    created_at: datetime
    reviewed_at: datetime | None
    owner_email: EmailStr | None = None
    requester_email: EmailStr | None = None
