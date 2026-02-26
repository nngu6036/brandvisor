import json
import sys
from pathlib import Path
from typing import Any
import requests

def is_url_ok(url: str, timeout: float = 10.0) -> bool:
    """
    Returns True if the URL responds with HTTP 200.
    Tries HEAD first (faster), falls back to GET if HEAD is blocked.
    """
    headers = {"User-Agent": "Mozilla/5.0 (url-check/1.0)"}

    try:
        r = requests.head(url, allow_redirects=True, timeout=timeout, headers=headers)
        if r.status_code == 405 or (400 <= r.status_code < 600 and r.status_code != 200):
            # Some servers block/ignore HEAD; try GET as a fallback
            r = requests.get(url, allow_redirects=True, timeout=timeout, headers=headers, stream=True)
        return r.status_code == 200
    except requests.RequestException:
        return False


def read_json_windows(path: str | Path) -> Any:
    p = Path(path)

    for enc in ("utf-8-sig", "utf-8", "cp1252"):
        try:
            with p.open("r", encoding=enc) as f:
                return json.load(f)
        except UnicodeDecodeError:
            continue

    raise UnicodeDecodeError(
        "unknown", b"", 0, 0,
        f"Failed to decode {p} with utf-8-sig, utf-8, or cp1252."
    )


def main() -> None:
    if len(sys.argv) != 2:
        print(f"Usage: {Path(sys.argv[0]).name} <file.json>", file=sys.stderr)
        sys.exit(2)

    filename = sys.argv[1]
    try:
        data = read_json_windows(filename)
        visual_assets = data["assets"]
        for asset in visual_assets:
            url = asset['url']
            print("processing url ", url)
            if len(url) != 76:
                print("short url")
            if not is_url_ok(url):
                print("invalid target")
    except FileNotFoundError:
        print(f"Error: file not found: {filename}", file=sys.stderr)
        sys.exit(1)
    except UnicodeDecodeError as e:
        print(f"Error: cannot decode file {filename}: {e}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: JSON is invalid in {filename}: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
