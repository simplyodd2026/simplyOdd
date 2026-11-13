from datetime import datetime

from pydantic import EmailStr, Field

from app.models.common import Schema


class AddressIn(Schema):
    label: str = Field(default="Home", max_length=40)
    full_name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=6, max_length=20)
    line1: str = Field(min_length=1, max_length=200)
    line2: str = Field(default="", max_length=200)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    postal_code: str = Field(min_length=3, max_length=12)
    country: str = Field(default="India", max_length=100)
    is_default: bool = False


class Address(AddressIn):
    id: str


class UserProfile(Schema):
    user_id: str
    name: str = ""
    email: str = ""
    phone: str = ""
    profile_image: str | None = None
    addresses: list[Address] = []
    is_admin: bool = False
    created_at: datetime
    updated_at: datetime


class ProfileIn(Schema):
    """What a customer may change on their own profile. The photo is set only by uploading one."""
    name: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=20)


class ProfileUpdate(ProfileIn):
    profile_image: str | None = None


class AuthUser(Schema):
    uid: str
    email: EmailStr | str | None = None
    name: str | None = None
    picture: str | None = None
    email_verified: bool = False
    is_admin: bool = False
