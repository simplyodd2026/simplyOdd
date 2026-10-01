"""Grant or revoke the `admin` custom claim on a Firebase user.

    python -m scripts.set_admin someone@example.com [--revoke]

The user must sign out and in again (or refresh their ID token) to pick it up.
"""
import sys

from firebase_admin import auth

from app.core.firebase import get_app


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    user = auth.get_user_by_email(sys.argv[1], app=get_app())
    claims = dict(user.custom_claims or {})
    claims["admin"] = "--revoke" not in sys.argv
    auth.set_custom_user_claims(user.uid, claims, app=get_app())
    print(f"{user.email}: admin={claims['admin']}")


if __name__ == "__main__":
    main()
