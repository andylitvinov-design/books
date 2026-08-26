#!/usr/bin/env python3
"""Verify structural integrity of the Maya Telegram archive and source index."""

import csv
import html
import hashlib
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path


REQUIRED = {"channel", "post_id", "url", "date", "raw_text", "media_references", "media_caption", "previous_post_id", "next_post_id"}
EXPECTED_CHANNEL = "mayaismagic"
EXPECTED_POST_COUNT = 236
SUPPLEMENTAL_INDEX = Path("raw/templetherapy/TEMPLETHERAPY_MAYA_AZTEC_INDEX.jsonl")
SUPPLEMENTAL_MEDIA = Path("media/templetherapy")
EXPECTED_SUPPLEMENTAL_COUNT = 29
INDEX_FIELDS = [
    "post_id", "date", "url", "title_first_line", "topic", "subtopic",
    "deity_archetype", "place", "ritual_practice", "initiation_stage",
    "cosmology", "calendar_time", "historical_material", "mythology",
    "author_interpretation", "therapeutic_archetypal_interpretation",
    "knowledge_level", "duplicate_of", "series_id", "included_in_chapter",
]


def verify_mobile_reading_order(root):
    """Check the source-backed manuscript's reader-first chapter sequence."""
    manuscript_path = root / "manuscript" / "MAYA_TRADITION.md"
    if not manuscript_path.exists():
        return []
    text = manuscript_path.read_text(encoding="utf-8")
    required = [
        "# Описание традиции", "# Содержание", "# II. Боги и божественные силы",
        "# III. Календарь, время и космология", "# IV. Места, предметы и материальная культура",
        "# V. Ритуал, предки и Шибальба", "# VI. Терапевтические и авторские модели",
        "# VII. Смежные традиции Мезоамерики и сравнения",
    ]
    errors = []
    positions = [text.find(marker) for marker in required]
    if -1 in positions or positions != sorted(positions):
        errors.append("manuscript does not follow the required mobile reading order")
    description_end = text.find("# Содержание")
    description = text[:description_end] if description_end >= 0 else ""
    if "Источник: пост [2]" not in description or description.count("Источник: пост [") != 1:
        errors.append("front description must contain only the cited framing post")
    author_marker = "## Авторская рамка, практики и программы"
    if text.find(author_marker) <= text.find("# VI. Терапевтические и авторские модели"):
        errors.append("author framework must follow therapeutic material in chapter VI")
    return errors


def html_post_ids(html_path):
    """Extract the numeric IDs from Telegram's ordinary (non-service) messages."""
    class MessageIdParser(HTMLParser):
        def __init__(self):
            super().__init__()
            self.ids = []

        def handle_starttag(self, tag, attrs):
            if tag != "div":
                return
            attributes = dict(attrs)
            classes = set(attributes.get("class", "").split())
            match = re.fullmatch(r"message(\d+)", attributes.get("id", ""))
            if {"message", "default"} <= classes and match:
                self.ids.append(int(match.group(1)))

    parser = MessageIdParser()
    parser.feed(html_path.read_text(encoding="utf-8"))
    return parser.ids


def verify_supplemental(root):
    """Validate the separately-labelled public TempleTherapy appendix."""
    errors = []
    index_path = root / SUPPLEMENTAL_INDEX
    manuscript_path = root / "manuscript" / "MAYA_TRADITION.md"
    if not index_path.exists():
        return [f"missing {index_path}"]
    rows = []
    for line_number, line in enumerate(index_path.read_text(encoding="utf-8").splitlines(), 1):
        try:
            row = json.loads(line)
        except json.JSONDecodeError as exc:
            errors.append(f"TempleTherapy line {line_number}: invalid JSON: {exc.msg}")
            continue
        required = {"channel", "post_id", "url", "date", "raw_text", "media_references", "media_caption"}
        missing = required - row.keys()
        if missing:
            errors.append(f"TempleTherapy line {line_number}: missing fields: {', '.join(sorted(missing))}")
        elif row["channel"] != "TempleTherapy" or row["url"] != f"https://t.me/TempleTherapy/{row['post_id']}":
            errors.append(f"TempleTherapy line {line_number}: invalid source identity")
        elif not isinstance(row["raw_text"], str) or not row["raw_text"].strip():
            errors.append(f"TempleTherapy line {line_number}: non-substantive included text")
        rows.append(row)
    ids = [row.get("post_id") for row in rows]
    if len(rows) != EXPECTED_SUPPLEMENTAL_COUNT:
        errors.append(f"TempleTherapy index count {len(rows)} does not equal expected {EXPECTED_SUPPLEMENTAL_COUNT}")
    if len(ids) != len(set(ids)):
        errors.append("TempleTherapy index contains duplicate post IDs")
    if not manuscript_path.exists():
        return errors + [f"missing {manuscript_path}"]
    manuscript = manuscript_path.read_text(encoding="utf-8")
    chapter = "# VIII. Приложение: TempleTherapy — дополнительные публичные материалы"
    if manuscript.count(chapter) != 1 or manuscript.find(chapter) <= manuscript.find("# VII. "):
        errors.append("TempleTherapy appendix is missing or not placed after main chapters")
    if manuscript.count("## TempleTherapy · пост ") != len(rows):
        errors.append("TempleTherapy appendix heading count does not match index")
    for row in rows:
        marker = f"*Дополнительный публичный источник: TempleTherapy; пост [{row['post_id']}]({row['url']}); {row['date']}.*"
        if marker not in manuscript:
            errors.append(f"TempleTherapy post {row['post_id']}: missing source marker in appendix")
        if html.unescape(row["raw_text"]) not in manuscript:
            errors.append(f"TempleTherapy post {row['post_id']}: raw text is not preserved in appendix")
    media_root = root / SUPPLEMENTAL_MEDIA
    expected = {f"post-{row['post_id']}-{index}.jpg" for row in rows for index, _ in enumerate(row["media_references"], 1)}
    actual = {path.name for path in media_root.glob("*.jpg")} if media_root.exists() else set()
    unexpected = sorted(actual - expected)
    if unexpected:
        errors.append("TempleTherapy media contains unreferenced files: " + ", ".join(unexpected))
    if any((media_root / name).stat().st_size == 0 for name in actual):
        errors.append("TempleTherapy media contains an empty downloaded file")
    return errors


def verify(root):
    errors = []
    errors.extend(verify_mobile_reading_order(root))
    errors.extend(verify_supplemental(root))
    posts_path = root / "raw" / "posts.jsonl"
    html_path = root / "raw" / "messages.html"
    if not html_path.exists():
        errors.append(f"missing {html_path}")
        html_ids = []
    else:
        html_ids = html_post_ids(html_path)
        if len(html_ids) != EXPECTED_POST_COUNT:
            errors.append(f"raw HTML post count {len(html_ids)} does not equal expected {EXPECTED_POST_COUNT}")
    if not posts_path.exists():
        return errors + [f"missing {posts_path}"]
    posts = []
    for line_number, line in enumerate(posts_path.read_text(encoding="utf-8").splitlines(), 1):
        try:
            post = json.loads(line)
        except json.JSONDecodeError as exc:
            errors.append(f"line {line_number}: invalid JSON: {exc.msg}")
            continue
        if not isinstance(post, dict):
            errors.append(f"line {line_number}: JSON record must be an object")
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
    if len(posts) != EXPECTED_POST_COUNT:
        errors.append(f"JSONL post count {len(posts)} does not equal expected {EXPECTED_POST_COUNT}")
    if [post.get("post_id") for post in posts] != html_ids:
        errors.append("raw HTML source IDs do not exactly match JSONL posts")
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
        reader = csv.DictReader(index_path.open(encoding="utf-8", newline=""))
        if reader.fieldnames != INDEX_FIELDS:
            errors.append("SOURCE_INDEX.csv headers do not exactly match the required schema")
        rows = list(reader)
        indexed_ids = {int(row["post_id"]) for row in rows if row.get("post_id", "").isdigit()}
        if len(rows) != len(posts):
            errors.append(f"index row count {len(rows)} does not match raw post count {len(posts)}")
        if indexed_ids != ids or [row.get("post_id") for row in rows] != [str(post.get("post_id")) for post in posts]:
            errors.append("index source IDs do not match raw posts")
    markdown_path = root / "SOURCE_INDEX.md"
    if not markdown_path.exists():
        errors.append("missing SOURCE_INDEX.md")
    else:
        markdown = markdown_path.read_text(encoding="utf-8")
        undocumented = [field for field in INDEX_FIELDS if f"| `{field}` |" not in markdown]
        if undocumented:
            errors.append("SOURCE_INDEX.md does not document schema headings: " + ", ".join(undocumented))
    manifest_path = root / "raw" / "media-manifest.json"
    if not manifest_path.exists():
        errors.append("missing raw/media-manifest.json")
    else:
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            errors.append(f"invalid raw/media-manifest.json: {exc.msg}")
            manifest = []
        if not isinstance(manifest, list):
            errors.append("raw/media-manifest.json must contain a list")
            manifest = []
        manifest_paths = set()
        for entry in manifest:
            if not isinstance(entry, dict) or set(("path", "bytes", "sha256")) - entry.keys():
                errors.append("media manifest entry missing path, bytes, or sha256")
                continue
            path_value = entry["path"]
            bytes_value = entry["bytes"]
            digest = entry["sha256"]
            invalid = False
            if not isinstance(path_value, str) or not path_value.strip():
                errors.append("media manifest path must be a non-empty relative string")
                invalid = True
            if isinstance(bytes_value, bool) or not isinstance(bytes_value, int) or bytes_value < 0:
                errors.append("media manifest bytes must be a non-negative integer")
                invalid = True
            if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-fA-F]{64}", digest):
                errors.append("media manifest sha256 must be a 64-character hexadecimal digest")
                invalid = True
            if invalid:
                continue
            relative = Path(path_value)
            asset = root / "raw" / relative
            if relative.is_absolute() or ".." in relative.parts or not asset.is_file():
                errors.append(f"media manifest path missing from copied archive: {path_value}")
                continue
            manifest_paths.add(path_value)
            if asset.stat().st_size != bytes_value:
                errors.append(f"media manifest byte count mismatch: {path_value}")
            if hashlib.sha256(asset.read_bytes()).hexdigest() != digest:
                errors.append(f"media manifest digest mismatch: {path_value}")
        for post in posts:
            for reference in post.get("media_references", []):
                if reference not in manifest_paths:
                    errors.append(f"post {post.get('post_id')}: media reference missing from manifest: {reference}")
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
