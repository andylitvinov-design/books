#!/usr/bin/env python3
"""Create an auditable Maya/Aztec selection from the public TempleTherapy archive."""

from __future__ import annotations

import json
import re
from pathlib import Path


HERE = Path(__file__).resolve().parent
RAW_ARCHIVE = HERE / "raw" / "templetherapy" / "TEMPLETHERAPY_PUBLIC_ARCHIVE.jsonl"
SELECTION_INDEX = HERE / "raw" / "templetherapy" / "TEMPLETHERAPY_MAYA_AZTEC_INDEX.jsonl"
SELECTION_AUDIT = HERE / "raw" / "templetherapy" / "SELECTION_AUDIT.md"

CHAPTERS = (
    "I. Описание традиции",
    "II. Боги и божественные силы",
    "III. Календарь, время и космология",
    "IV. Места, предметы и материальная культура",
    "V. Мифология, Шибальба, инициация и ритуал",
    "VI. Авторские, архетипические и терапевтические модели",
)

TARGET_TERMS = re.compile(
    r"\b(?:майя|майе|ацтек\w*|мезоамерик\w*|юкатан\w*|чичен\w*|паленк\w*|тикал\w*|ушмал\w*|я[шс]ч[ие]лан\w*|"
    r"пополь\w*|шибальб\w*|хун[ -]?ахпу\w*|шбаланк\w*|балам\w*|науаль\w*|цолькин\w*|хааб\w*|"
    r"кукуль\w*|кинич\w*|чаак\w*|тлалок\w*|эхек\w*|тонати\w*|тескат\w*|кетцаль\w*|шолотл\w*|"
    r"коатлику\w*|уицилопоч\w*|миктлан\w*|ицамн\w*|ишмукан\w*|иш\s*чель\w*|ишии?м\w*|"
    r"юм\s*кааш\w*|ик[’']\w*|к[’']?ух\w*)\b",
    re.IGNORECASE,
)
CALENDAR_TERMS = re.compile(r"\b(?:календар|цолькин|хааб|месяц|день\s+(?:майя|ацтек|восхода|луны|ягуара|орла|ножа|тростника)|кин\b|ламат|маник|акбаль|кан\b|имиш|кавак|ахау|эцнаб|чикчан)\w*", re.IGNORECASE)
PLACE_TERMS = re.compile(r"\b(?:паленк|бонaмпак|яшчилан|тулум|чичен|тикал|ушмал|теотиуакан|чалул|мерид|храм|пирамида|алтар[ья])\w*", re.IGNORECASE)
RITUAL_TERMS = re.compile(r"\b(?:мистери|шибальб|инициаци|ритуал|кровопуск|шаманизм|посвящен)\w*", re.IGNORECASE)
SETTING_TERMS = re.compile(r"\b(?:настройк|канал|эгрегор|поток)\w*", re.IGNORECASE)
GOD_TERMS = re.compile(r"\b(?:бог\w*|кинич|чаак|тлалок|эхек|тонати|тескат|кетцаль|кукуль|ицамн|ишмукан|иш\s*чель|ишии?м|юм\s*кааш|шолотл|коатлику|уицилопоч)\w*", re.IGNORECASE)

# These posts are retained in the source selection but do not form a standalone
# Maya/Aztec reading article: they are announcements, link-only pointers, or
# broad multi-tradition programme descriptions.
NON_READER_POST_IDS = frozenset({
    4, 6, 8, 16, 17, 99, 107, 112, 116, 118, 123, 153, 174, 188, 189, 226, 261,
    305, 400, 401, 427, 479, 543, 571, 623, 675, 733, 784, 853, 859, 874, 939,
    960, 1031, 1242, 1461, 1648, 2057, 2058, 2062, 2067, 2068, 2081, 2088,
    2100, 2198, 2210, 2212, 2223, 2226, 2245, 2251, 2253, 2264, 2269,
    2352, 2361, 2446,
})


def first_line(text: str) -> str:
    return next((line.strip() for line in text.splitlines() if line.strip()), "TempleTherapy")


def source_chapter(text: str) -> str:
    """Choose an editorial location without modifying the source text."""
    if CALENDAR_TERMS.search(text):
        return CHAPTERS[2]
    if PLACE_TERMS.search(text):
        return CHAPTERS[3]
    if RITUAL_TERMS.search(text):
        return CHAPTERS[4]
    if SETTING_TERMS.search(text):
        return CHAPTERS[0]
    if GOD_TERMS.search(text):
        return CHAPTERS[1]
    return CHAPTERS[5]


def select_maya_aztec_records(records: list[dict[str, object]]) -> list[dict[str, object]]:
    selected: list[dict[str, object]] = []
    for record in records:
        text = str(record["raw_text"])
        matches = sorted({match.group(0).casefold() for match in TARGET_TERMS.finditer(text)})
        if not matches:
            continue
        post_id = int(record["post_id"])
        selected.append({
            **record,
            "title": first_line(text),
            "chapter": source_chapter(text),
            "topic_terms": matches,
            "media_caption": "",
            "reader_include": post_id not in NON_READER_POST_IDS,
        })
    return selected


def main() -> None:
    records = [json.loads(line) for line in RAW_ARCHIVE.read_text(encoding="utf-8").splitlines()]
    selected = select_maya_aztec_records(records)
    SELECTION_INDEX.write_text(
        "".join(json.dumps(record, ensure_ascii=False) + "\n" for record in selected), encoding="utf-8"
    )
    reader_records = [record for record in selected if record["reader_include"]]
    audit = [
        "# TempleTherapy Maya/Aztec selection audit", "",
        f"- Public records screened: {len(records)}",
        f"- Records matching the controlled Maya/Aztec vocabulary: {len(selected)}",
        f"- Standalone reader candidates: {len(reader_records)}",
        f"- Source-only announcements, link pointers, or multi-tradition programme entries: {len(selected) - len(reader_records)}", "",
        "The selection index retains every matched source record. `reader_include: false` keeps the source traceable without turning announcements into methodology articles.",
    ]
    SELECTION_AUDIT.write_text("\n".join(audit) + "\n", encoding="utf-8")
    print(f"Selected {len(selected)} source records; {len(reader_records)} are standalone reader candidates")


if __name__ == "__main__":
    main()
