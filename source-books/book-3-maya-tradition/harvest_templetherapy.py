#!/usr/bin/env python3
"""Archive the public TempleTherapy feed without changing the source posts.

The resulting JSONL preserves each post's public URL, timestamp, text and
public media references.  It is intentionally separate from the curated Maya
reader: editorial inclusion happens only after the archive audit.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen


CHANNEL = "TempleTherapy"
HERE = Path(__file__).resolve().parent
RAW_DIR = HERE / "raw" / "templetherapy"
PAGES_DIR = RAW_DIR / "public-pages"
INDEX = RAW_DIR / "TEMPLETHERAPY_PUBLIC_ARCHIVE.jsonl"
VOID_TAGS = frozenset({"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"})
POST_ID = re.compile(r"^TempleTherapy/(\d+)$")
BEFORE = re.compile(r"[?&]before=(\d+)")
BACKGROUND_URL = re.compile(r"url\((?:['\"])?([^'\")]+)")


def normalize_text(parts: list[str]) -> str:
    """Retain intentional Telegram line breaks while removing HTML whitespace."""
    text = html.unescape("".join(parts)).replace("\r\n", "\n").replace("\r", "\n")
    text = "\n".join(line.strip() for line in text.split("\n"))
    return re.sub(r"\n{3,}", "\n\n", text).strip()


class PublicPageParser(HTMLParser):
    """Extract public Telegram post cards from one `/s/TempleTherapy` page."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.posts: list[dict[str, object]] = []
        self.older_before: int | None = None
        self.current: dict[str, object] | None = None
        self.message_depth = 0
        self.text_depth = 0
        self.text_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs_list: list[tuple[str, str | None]]) -> None:
        attrs = dict(attrs_list)
        classes = set((attrs.get("class") or "").split())
        href = attrs.get("href") or ""
        if self.current is None:
            match = POST_ID.fullmatch(attrs.get("data-post") or "")
            if match:
                post_id = int(match.group(1))
                self.current = {
                    "channel": CHANNEL,
                    "post_id": post_id,
                    "url": f"https://t.me/{CHANNEL}/{post_id}",
                    "date": "",
                    "raw_text": "",
                    "media_references": [],
                }
                self.message_depth = 1
                self.text_depth = 0
                self.text_parts = []
            elif ("tme_messages_more" in classes or attrs.get("rel") == "prev") and (match := BEFORE.search(href)):
                self.older_before = int(match.group(1))
            return

        if tag not in VOID_TAGS:
            self.message_depth += 1
        if "tgme_widget_message_text" in classes:
            self.text_depth = self.message_depth
        if tag == "br" and self.text_depth:
            self.text_parts.append("\n")
        if tag == "time" and attrs.get("datetime"):
            self.current["date"] = attrs["datetime"]
        is_post_media = bool({"tgme_widget_message_photo_wrap", "tgme_widget_message_video_thumb"} & classes)
        if is_post_media:
            media = self.current["media_references"]
            assert isinstance(media, list)
            style = attrs.get("style") or ""
            background = BACKGROUND_URL.search(style)
            candidate = background.group(1) if background else attrs.get("src")
            if candidate and candidate.startswith("http") and candidate not in media:
                media.append(candidate)

    def handle_endtag(self, tag: str) -> None:
        if self.current is None or tag in VOID_TAGS:
            return
        if self.text_depth == self.message_depth:
            self.text_depth = 0
        self.message_depth -= 1
        if self.message_depth == 0:
            self.current["raw_text"] = normalize_text(self.text_parts)
            if self.current["raw_text"]:
                self.posts.append(self.current)
            self.current = None
            self.text_parts = []

    def handle_data(self, data: str) -> None:
        if self.current is not None and self.text_depth:
            self.text_parts.append(data)


def parse_public_page(source: str) -> tuple[list[dict[str, object]], int | None]:
    parser = PublicPageParser()
    parser.feed(source)
    parser.close()
    return parser.posts, parser.older_before


def fetch_page(before: int | None) -> str:
    suffix = "" if before is None else f"?before={before}"
    request = Request(
        f"https://t.me/s/{CHANNEL}{suffix}",
        headers={"User-Agent": "Mozilla/5.0 (compatible; MayaSourceArchive/1.0)"},
    )
    with urlopen(request, timeout=45) as response:
        return response.read().decode("utf-8")


def archive_public_channel(delay_seconds: float = 0.25, max_pages: int | None = None) -> list[dict[str, object]]:
    """Fetch each older public feed page once and write reproducible raw files."""
    PAGES_DIR.mkdir(parents=True, exist_ok=True)
    before: int | None = None
    visited: set[int | None] = set()
    by_post_id: dict[int, dict[str, object]] = {}
    while before not in visited:
        if max_pages is not None and len(visited) >= max_pages:
            break
        visited.add(before)
        source = fetch_page(before)
        page_name = "latest.html" if before is None else f"before-{before}.html"
        (PAGES_DIR / page_name).write_text(source, encoding="utf-8")
        posts, next_before = parse_public_page(source)
        for post in posts:
            by_post_id[int(post["post_id"])] = post
        if next_before is None or next_before in visited:
            break
        before = next_before
        time.sleep(delay_seconds)
    records = [by_post_id[post_id] for post_id in sorted(by_post_id)]
    INDEX.write_text("".join(json.dumps(record, ensure_ascii=False) + "\n" for record in records), encoding="utf-8")
    return records


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max-pages", type=int, default=None, help="cap pages for a safe audit run")
    parser.add_argument("--delay", type=float, default=0.25, help="seconds to wait between public requests")
    args = parser.parse_args()
    records = archive_public_channel(delay_seconds=args.delay, max_pages=args.max_pages)
    print(f"Archived {len(records)} public {CHANNEL} posts to {INDEX}")


if __name__ == "__main__":
    main()
