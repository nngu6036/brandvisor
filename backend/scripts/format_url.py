import argparse
import re
from urllib.parse import urlparse, parse_qs

def gdrive_share_to_direct(url: str) -> str:
    """
    Convert a Google Drive share URL like:
      https://drive.google.com/file/d/<FILE_ID>/view?usp=sharing
    or:
      https://drive.google.com/open?id=<FILE_ID>
      https://drive.google.com/uc?id=<FILE_ID>&export=download
    into:
      https://drive.google.com/uc?export=view&id=<FILE_ID>
    """
    # Common pattern: /file/d/<id>/
    m = re.search(r"/file/d/([^/]+)", url)
    if m:
        file_id = m.group(1)
        return f"https://drive.google.com/uc?export=view&id={file_id}"

    # Fallback: try to get ?id=<id>
    parsed = urlparse(url)
    qs = parse_qs(parsed.query)
    if "id" in qs and qs["id"]:
        file_id = qs["id"][0]
        return f"https://drive.google.com/uc?export=view&id={file_id}"

    raise ValueError("Could not extract Google Drive file id from the provided URL.")

def main():
    parser = argparse.ArgumentParser(
        description="Convert a Google Drive share URL into a direct view URL."
    )
    parser.add_argument("url", help="Google Drive share URL to convert")
    args = parser.parse_args()

    try:
        converted = gdrive_share_to_direct(args.url)
        print(converted)
    except ValueError as e:
        print(f"Error: {e}")
        raise SystemExit(1)

if __name__ == "__main__":
    main()