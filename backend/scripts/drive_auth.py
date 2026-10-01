"""One-time Google Drive sign-in for MEDIA_BACKEND=drive.

    python -m scripts.drive_auth path/to/oauth-client.json

Opens a browser to sign in with the Google account whose Drive will hold the
images, creates a "simplyOdd product images" folder in it, and writes the
client id/secret, refresh token and folder id into .env.

The OAuth client must be a "Desktop app" client, and its consent screen must be
published ("In production"), or Google expires the refresh token after 7 days.
"""
import json
import re
import sys
from pathlib import Path

from google.auth.transport.requests import AuthorizedSession
from google_auth_oauthlib.flow import InstalledAppFlow

from app.services.media import DRIVE_SCOPES

ENV_FILE = Path(".env")
FOLDER_NAME = "simplyOdd product images"


def set_env(values: dict[str, str]) -> None:
    text = ENV_FILE.read_text() if ENV_FILE.exists() else ""
    for key, value in values.items():
        line = f"{key}={value}"
        text, n = re.subn(rf"^{key}=.*$", line, text, flags=re.M)
        if not n:
            text = text.rstrip("\n") + f"\n{line}\n"
    ENV_FILE.write_text(text)


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    client = json.loads(Path(sys.argv[1]).read_text())["installed"]
    flow = InstalledAppFlow.from_client_secrets_file(sys.argv[1], DRIVE_SCOPES)
    # prompt=consent guarantees a refresh token even on a repeat sign-in.
    creds = flow.run_local_server(port=0, access_type="offline", prompt="consent")

    # drive.file only sees files this app created, so the app makes its own folder.
    r = AuthorizedSession(creds).post(
        "https://www.googleapis.com/drive/v3/files?fields=id,webViewLink",
        json={"name": FOLDER_NAME, "mimeType": "application/vnd.google-apps.folder"}, timeout=30)
    r.raise_for_status()
    folder = r.json()

    set_env({
        "MEDIA_BACKEND": "drive",
        "GOOGLE_OAUTH_CLIENT_ID": client["client_id"],
        "GOOGLE_OAUTH_CLIENT_SECRET": client["client_secret"],
        "GOOGLE_DRIVE_REFRESH_TOKEN": creds.refresh_token,
        "GOOGLE_DRIVE_FOLDER_ID": folder["id"],
    })
    print(f"Drive folder: {folder['webViewLink']}\nSaved credentials to {ENV_FILE.resolve()}")


if __name__ == "__main__":
    main()
