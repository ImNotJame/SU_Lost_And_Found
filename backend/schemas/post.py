from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PostCreate(BaseModel):
    kind: Literal["lost", "found"]
    item_name: str = Field(min_length=1, max_length=150)
    description: str = Field(min_length=1, max_length=4000)
    location: str = Field(min_length=1, max_length=255)
    event_date: datetime | None = None

    @field_validator("item_name", "description", "location")
    @classmethod
    def strip_text(cls, value: str) -> str:
        stripped_value = value.strip()
        if not stripped_value:
            raise ValueError("This field must not be empty.")
        return stripped_value


class PostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    kind: Literal["lost", "found"]
    item_name: str
    description: str
    location: str
    event_date: datetime | None
    image_path: str | None = None
    status: Literal["open", "claimed", "returned"]
    created_at: datetime
    updated_at: datetime
