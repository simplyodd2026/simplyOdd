from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class Schema(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class Page(Schema, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


class Timestamped(Schema):
    created_at: datetime
    updated_at: datetime
