#!/usr/bin/env python3
"""Copy the supplied Telegram export and derive a conservative source index."""

import csv
import hashlib
import json
import re
import shutil
from pathlib import Path

from bs4 import BeautifulSoup


HERE = Path(__file__).resolve().parent
SOURCE = Path("/Users/andriilitvinov/Downloads/Telegram Desktop/ChatExport_2026-08-26 (1)")
RAW = HERE / "raw"
CHANNEL = "mayaismagic"
FIELDS = [
    "post_id", "date", "url", "title_first_line", "topic", "subtopic",
    "deity_archetype", "place", "ritual_practice", "initiation_stage",
    "cosmology", "calendar_time", "historical_material", "mythology",
    "author_interpretation", "therapeutic_archetypal_interpretation",
    "knowledge_level", "duplicate_of", "series_id", "included_in_chapter",
]
FIELD_DESCRIPTIONS = {
    "post_id": "Numeric Telegram export message ID.", "date": "Export timestamp.", "url": "Canonical Telegram post URL.",
    "title_first_line": "First non-empty line of extracted post text.", "topic": "Explicit high-level keyword topic.", "subtopic": "Explicit narrower keyword topic.",
    "deity_archetype": "Named deity or archetype terms present in the post.", "place": "Explicit place or culture terms present in the post.",
    "ritual_practice": "Explicit ritual or practice terminology.", "initiation_stage": "Explicit initiation terminology.",
    "cosmology": "Explicit cosmology terminology.", "calendar_time": "Explicit calendar terminology.", "historical_material": "Explicit historical terminology.",
    "mythology": "Explicit mythology terminology.", "author_interpretation": "Explicit first-person interpretive framing.",
    "therapeutic_archetypal_interpretation": "Explicit therapeutic or archetypal terminology.", "knowledge_level": "Explicit introductory/beginner label.",
    "duplicate_of": "Reserved; blank unless an exact duplicate is established.", "series_id": "Reserved; blank unless an explicit series is established.",
    "included_in_chapter": "Reserved; blank because no manuscript classification was performed.",
}


def text_of(node):
    return node.get_text("\n", strip=True) if node else ""


def first_line(text):
    return next((line.strip() for line in text.splitlines() if line.strip()), "")


def labels(text):
    """Return only labels directly supported by explicit words in the post."""
    lower = text.casefold()
    def marked(name, patterns):
        return name if any(re.search(pattern, lower) for pattern in patterns) else ""
    deity_terms = []
    for term in ("кетцалькоатль", "кукулькан", "итцамна", "чак", "шипе тотек", "великий змей"):
        if term in lower:
            deity_terms.append(term)
    place_terms = []
    for term in ("майя", "ацтек", "инки", "мезоамерик"):
        if term in lower:
            place_terms.append(term)
    return {
        "topic": marked("Maya tradition", [r"\bмайя\b", r"майя/"]),
        "subtopic": marked("shamanism", [r"шаман"]),
        "deity_archetype": "; ".join(deity_terms),
        "place": "; ".join(place_terms),
        "ritual_practice": marked("ritual/practice", [r"ритуал", r"церемон", r"практик", r"алтар"]),
        "initiation_stage": marked("initiation", [r"инициац"]),
        "cosmology": marked("cosmology", [r"космолог", r"мироздан", r"эгрегор"]),
        "calendar_time": marked("calendar", [r"календар", r"цолькин", r"хааб"]),
        "historical_material": marked("historical", [r"историческ", r"история"]),
        "mythology": marked("mythology", [r"миф", r"легенд", r"демиург"]),
        "author_interpretation": marked("explicit author interpretation", [r"мое восприят", r"я считаю", r"на мой взгляд"]),
        "therapeutic_archetypal_interpretation": marked("therapeutic/archetypal", [r"терап", r"архетип"]),
        "knowledge_level": marked("introductory", [r"для начинающ", r"введени"]),
    }


def referenced_media(message):
    refs = []
    for tag in message.find_all(["a", "img", "video", "audio"]):
        candidate = tag.get("href") or tag.get("src")
        if candidate and candidate.startswith(("photos/", "images/")) and candidate not in refs:
            refs.append(candidate)
    return refs


def copy_export():
    RAW.mkdir(parents=True, exist_ok=True)
    for relative in ("messages.html", "css", "js", "photos", "images"):
        source = SOURCE / relative
        destination = RAW / relative
        if source.is_dir():
            shutil.copytree(source, destination, dirs_exist_ok=True, copy_function=shutil.copy2)
        else:
            shutil.copy2(source, destination)


def parse_posts():
    soup = BeautifulSoup((RAW / "messages.html").read_bytes(), "html.parser")
    posts = []
    for message in soup.select("div.message.default"):
        match = re.fullmatch(r"message(\d+)", message.get("id", ""))
        if not match:
            continue
        post_id = int(match.group(1))
        date_node = message.select_one(".body > .date.details") or message.select_one(".date.details")
        text_node = message.select_one(".text")
        raw_text = text_of(text_node)
        posts.append({
            "channel": CHANNEL,
            "post_id": post_id,
            "url": f"https://t.me/{CHANNEL}/{post_id}",
            "date": date_node.get("title", "") if date_node else "",
            "raw_text": raw_text,
            "media_references": referenced_media(message),
            "media_caption": raw_text if referenced_media(message) else "",
        })
    for index, post in enumerate(posts):
        post["previous_post_id"] = posts[index - 1]["post_id"] if index else None
        post["next_post_id"] = posts[index + 1]["post_id"] if index + 1 < len(posts) else None
    return posts


def write_media_manifest():
    manifest = []
    for directory in ("photos", "images"):
        for path in sorted((RAW / directory).rglob("*")):
            if path.is_file():
                manifest.append({
                    "path": path.relative_to(RAW).as_posix(),
                    "bytes": path.stat().st_size,
                    "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                })
    (RAW / "media-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def write_index(posts):
    rows = []
    for post in posts:
        row = {field: "" for field in FIELDS}
        row.update({
            "post_id": post["post_id"], "date": post["date"], "url": post["url"],
            "title_first_line": first_line(post["raw_text"]),
        })
        row.update(labels(post["raw_text"]))
        rows.append(row)
    with (HERE / "SOURCE_INDEX.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    lines = ["# Maya Telegram Export Source Index", "", "Conservative keyword index derived solely from `raw/messages.html`. Blank fields mean the export does not provide an explicit conservative tag; no factual classification was inferred.", "", "## Schema", "", "| Field | Meaning |", "|---|---|"]
    lines.extend(f"| `{field}` | {FIELD_DESCRIPTIONS[field]} |" for field in FIELDS)
    lines.extend(["", f"Posts indexed: {len(rows)}", "", "## Posts", "", "| Post | Date | First line | Topic |", "|---:|---|---|---|"])
    for row in rows:
        title = row["title_first_line"].replace("|", "\\|")
        lines.append(f"| {row['post_id']} | {row['date']} | {title} | {row['topic']} |")
    (HERE / "SOURCE_INDEX.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    copy_export()
    posts = parse_posts()
    with (RAW / "posts.jsonl").open("w", encoding="utf-8") as handle:
        for post in posts:
            handle.write(json.dumps(post, ensure_ascii=False) + "\n")
    media = write_media_manifest()
    write_index(posts)
    print(f"Archived {len(posts)} posts and {len(media)} media files.")


if __name__ == "__main__":
    main()
