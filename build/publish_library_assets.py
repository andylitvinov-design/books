#!/usr/bin/env python3
"""Publish reader-safe assets without exposing source-tree paths in the website."""

from __future__ import annotations

import re
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "library"
MAYA = ROOT / "source-books" / "book-3-maya-tradition"
MAYA_READERS = {
    "maya-egregor-gods": "Maya_Aztec_Egregor_Gods.html",
    "maya-calendar": "Maya_Calendar_Energies.html",
    "maya-exorcism": "Maya_Exorcism_Settings_Energies.html",
    "maya-mysteries": "Maya_Mysteries.html",
}
MAYA_PDFS = {
    "maya-egregor-gods": "Maya_Aztec_Egregor_Gods.pdf",
    "maya-calendar": "Maya_Calendar_Energies.pdf",
    "maya-exorcism": "Maya_Exorcism_Settings_Energies.pdf",
    "maya-mysteries": "Maya_Mysteries.pdf",
}
# The Next.js catalog predates the unified-library identifiers for the Alchemy
# series. Keep those established public card ids while publishing their real
# source covers under both names.
CATALOG_COVER_ALIASES = {
    "alchemy-homeopathy-foundations": "soul-homeopathy-foundations",
    "alchemy-homeopathy-remedies": "soul-homeopathy-remedies",
    "alchemy-naturopathy-hormones": "soul-naturopathy-hormones",
    "alchemy-naturopathy-oils": "soul-naturopathy-oils",
    "alchemy-bach-foundations": "soul-bach-foundations",
    "alchemy-bach-cards": "soul-bach-cards",
    "alchemy-brain-theory": "soul-brain-theory",
    "alchemy-brain-protocols": "soul-brain-protocols",
}
CATALOG_COVER_SOURCES = {
    "alchemy-services-workflow": ROOT / "source-books" / "book-1-alchemy-soul" / "media" / "post_185_01.jpg",
}


def copy_file(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def publish_maya_reader(reader_id: str, reader: Path) -> None:
    html = reader.read_text(encoding="utf-8")
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
        destination = PUBLIC / reader_id / "media" / source.name
        copy_file(source, destination)
        html = html.replace(ref, f"/library/{reader_id}/media/{source.name}")

    pdf = MAYA / "outputs" / MAYA_PDFS[reader_id]
    if not pdf.is_file():
        raise FileNotFoundError(f"Maya reader PDF missing: {pdf}")
    copy_file(pdf, PUBLIC / reader_id / "book.pdf")
    html = html.replace(
        "</header>",
        f'</header><p class="download-pdf"><a href="/library/{reader_id}/book.pdf" download>Скачать PDF</a></p>',
        1,
    )
    html = html.replace(
        "</style>",
        ".download-pdf{margin:0 0 20px;text-align:right}.download-pdf a{display:inline-block;padding:10px 15px;border:1px solid #caa37b;border-radius:10px;background:#fffdf9;color:#6b2f1a;font:700 16px/1 Arial,sans-serif;text-decoration:none}</style>",
        1,
    )

    destination = PUBLIC / reader_id / "index.html"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(html, encoding="utf-8")


def publish_maya_readers() -> None:
    for reader_id, filename in MAYA_READERS.items():
        publish_maya_reader(reader_id, MAYA / "outputs" / filename)


def publish_covers() -> None:
    source = (ROOT / "build" / "build_unified_library.py").read_text(encoding="utf-8")
    # Read direct source-path declarations rather than importing the builder.
    for entry in re.finditer(r'"id":\s*"([^"]+)".*?"cover_image":\s*"([^"]+)"', source, flags=re.S):
        book_id, raw_path = entry.groups()
        source_path = (ROOT / raw_path.removeprefix("../")).resolve()
        if source_path.is_file():
            copy_file(source_path, PUBLIC / "covers" / f"{book_id}{source_path.suffix.lower()}")
    for catalog_id, source_id in CATALOG_COVER_ALIASES.items():
        source = PUBLIC / "covers" / f"{source_id}.jpg"
        if not source.is_file():
            raise FileNotFoundError(f"Published cover alias source missing: {source}")
        copy_file(source, PUBLIC / "covers" / f"{catalog_id}.jpg")
    for catalog_id, source in CATALOG_COVER_SOURCES.items():
        if not source.is_file():
            raise FileNotFoundError(f"Catalog cover source missing: {source}")
        copy_file(source, PUBLIC / "covers" / f"{catalog_id}{source.suffix.lower()}")


def main() -> None:
    publish_maya_readers()
    publish_covers()


if __name__ == "__main__":
    main()
