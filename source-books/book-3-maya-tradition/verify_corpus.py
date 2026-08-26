#!/usr/bin/env python3
"""Verify structural integrity of the Maya Telegram archive and source index."""

import csv
import json
import sys
from pathlib import Path


REQUIRED = {"channel", "post_id", "url", "date", "raw_text", "media_references", "media_caption", "previous_post_id", "next_post_id"}
EXPECTED_CHANNEL = "mayaismagic"


def verify(root):
    errors = []
    posts_path = root / "raw" / "posts.jsonl"
    if not posts_path.exists():
        return [f"missing {posts_path}"]
    posts = []
    for line_number, line in enumerate(posts_path.read_text(encoding="utf-8").splitlines(), 1):
        try:
            post = json.loads(line)
        except json.JSONDecodeError as exc:
            errors.append(f"line {line_number}: invalid JSON: {exc.msg}")
            continue
        missing = REQUIRED - post.keys()
        if missing:
            errors.append(f"line {line_number}: missing required fields: {', '.join(sorted(missing))}")
        elif not isinstance(post["post_id"], int) or post["post_id"] <= 0:
            errors.append(f"line {line_number}: post_id must be a positive integer")
        elif post["channel"] != EXPECTED_CHANNEL or post["url"] != f"https://t.me/{EXPECTED_CHANNEL}/{post['post_id']}":
            errors.append(f"line {line_number}: invalid source ID or URL")
        posts.append(post)
    ids = {post["post_id"] for post in posts if isinstance(post.get("post_id"), int)}
    if len(ids) != len(posts):
        errors.append("duplicate or invalid post IDs")
    for index, post in enumerate(posts):
        for field in ("previous_post_id", "next_post_id"):
            linked = post.get(field)
            if linked is not None and linked not in ids:
                errors.append(f"post {post.get('post_id')}: unknown {field} {linked}")
        expected_previous = posts[index - 1]["post_id"] if index else None
        expected_next = posts[index + 1]["post_id"] if index + 1 < len(posts) else None
        if post.get("previous_post_id") != expected_previous:
            errors.append(f"post {post.get('post_id')}: non-contiguous previous_post_id")
        if post.get("next_post_id") != expected_next:
            errors.append(f"post {post.get('post_id')}: non-contiguous next_post_id")
    index_path = root / "SOURCE_INDEX.csv"
    if not index_path.exists():
        errors.append(f"missing {index_path}")
    else:
        rows = list(csv.DictReader(index_path.open(encoding="utf-8", newline="")))
        indexed_ids = {int(row["post_id"]) for row in rows if row.get("post_id", "").isdigit()}
        if len(rows) != len(posts):
            errors.append(f"index row count {len(rows)} does not match raw post count {len(posts)}")
        if indexed_ids != ids:
            errors.append("index source IDs do not match raw posts")
    if not (root / "raw" / "media-manifest.json").exists():
        errors.append("missing raw/media-manifest.json")
    return errors


def main():
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parent
    errors = verify(root)
    if errors:
        print("Corpus verification failed:", file=sys.stderr)
        print(*errors, sep="\n", file=sys.stderr)
        return 1
    print("Corpus verification passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
