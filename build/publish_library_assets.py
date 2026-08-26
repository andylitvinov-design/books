#!/usr/bin/env python3
"""Publish reader-safe assets without exposing source-tree paths in the website."""

from __future__ import annotations

import re
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "library"
MAYA = ROOT / "source-books" / "book-3-maya-tradition"
READER = MAYA / "outputs" / "Maya_Tradition_Methodology.html"


def copy_file(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def publish_maya_reader() -> None:
    html = READER.read_text(encoding="utf-8")
    # The archival edition labels its provenance for local editorial work. The
    # public reader keeps the same manuscript but uses reader-facing wording.
    html = html.replace(
        "Reading edition · local Telegram export",
        "Авторская читательская методичка",
    )
    asset_refs = sorted(set(re.findall(r'(?:\.\./raw/photos|\.\./media/templetherapy)/[^"\']+', html)))
    for ref in asset_refs:
        source = MAYA / ref.removeprefix("../")
        if not source.is_file():
            raise FileNotFoundError(f"Maya reader asset missing: {source}")
        destination = PUBLIC / "maya" / "media" / source.name
        copy_file(source, destination)
        html = html.replace(ref, f"/library/maya/media/{source.name}")

    destination = PUBLIC / "maya" / "index.html"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(html, encoding="utf-8")


def publish_covers() -> None:
    source = (ROOT / "build" / "build_unified_library.py").read_text(encoding="utf-8")
    # Read direct source-path declarations rather than importing the builder.
    for entry in re.finditer(r'"id":\s*"([^"]+)".*?"cover_image":\s*"([^"]+)"', source, flags=re.S):
        book_id, raw_path = entry.groups()
        source_path = (ROOT / raw_path.removeprefix("../")).resolve()
        if source_path.is_file():
            copy_file(source_path, PUBLIC / "covers" / f"{book_id}{source_path.suffix.lower()}")


def main() -> None:
    publish_maya_reader()
    publish_covers()


if __name__ == "__main__":
    main()
