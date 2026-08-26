#!/usr/bin/env python3
"""Build reading editions from the source-backed Maya manuscript without editing it."""

from __future__ import annotations

import html
import re
import shutil
from pathlib import Path

from lxml import html as lxml_html
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


HERE = Path(__file__).resolve().parent
MANUSCRIPT = HERE / "manuscript" / "MAYA_TRADITION.md"
RAW_MESSAGES = HERE / "raw" / "messages.html"
RAW_PHOTOS = HERE / "raw" / "photos"
OUT = HERE / "outputs"
HTML_OUT = OUT / "Maya_Tradition_Methodology.html"
DOCX_OUT = OUT / "Maya_Tradition_Methodology.docx"

WARM = "6B2F1A"
GOLD = "B7791F"
CREAM = "FBF4E9"
INK = "2F241D"
MUTED = "6D5A4D"


def parse_media() -> dict[int, list[str]]:
    tree = lxml_html.fromstring(RAW_MESSAGES.read_bytes())
    media: dict[int, list[str]] = {}
    for message in tree.xpath('//div[contains(concat(" ", normalize-space(@class), " "), " message ") and contains(concat(" ", normalize-space(@class), " "), " default ")]'):
        matched = re.fullmatch(r"message(\d+)", message.get("id", ""))
        if not matched:
            continue
        refs: list[str] = []
        for tag in message.xpath('.//a | .//img'):
            ref = tag.get("href") or tag.get("src")
            if ref and ref.startswith("photos/") and ref not in refs:
                refs.append(ref)
        media[int(matched.group(1))] = refs
    return media


def parse_articles() -> list[dict[str, object]]:
    text = MANUSCRIPT.read_text(encoding="utf-8")
    current_chapter = ""
    articles: list[dict[str, object]] = []
    blocks = re.split(r"(?m)^## (.+)\n", text)
    # blocks[0] contains the title/editorial note; heading/body pairs follow.
    for index in range(1, len(blocks), 2):
        heading, body = blocks[index], blocks[index + 1]
        if heading == "Editorial note":
            continue
        source = re.search(r"^\s*\*Источник: пост \[(\d+)\]\((https://t\.me/[^)]+)\); (.+)\.\*\s*\n", body)
        if not source:
            # The manuscript's H1 headings are the chapter labels.
            continue
        article_text = body[source.end():].strip()
        preceding = text[: text.find("## " + heading)]
        chapter_hits = re.findall(r"(?m)^# ([IVX]+\. .+)$", preceding)
        if chapter_hits:
            current_chapter = chapter_hits[-1]
        articles.append({
            "chapter": current_chapter,
            "title": heading,
            "post_id": int(source.group(1)),
            "url": source.group(2),
            "date": source.group(3),
            "text": article_text,
        })
    return articles


def article_html(article: dict[str, object], primary: str | None) -> str:
    photo = ""
    if primary:
        photo = (f'<figure class="post-media"><img class="post-photo-main" src="../raw/{html.escape(primary)}" '
                 f'alt="Источник: пост {article["post_id"]}" loading="lazy"></figure>')
    text = "<br>\\n".join(html.escape(line) for line in str(article["text"]).splitlines())
    return f'''<article class="post" id="post-{article["post_id"]}">
  <div class="chapter-token">{html.escape(str(article["chapter"]))}</div>
  <h2>{html.escape(str(article["title"]))}</h2>
  <div class="meta"><span>Источник: пост {article["post_id"]}</span><span>Дата: {html.escape(str(article["date"]))}</span><a href="{article["url"]}">{article["url"]}</a></div>
  {photo}
  <div class="text">{text}</div>
</article>'''


def build_html(articles: list[dict[str, object]], media: dict[int, list[str]]) -> None:
    sections: list[str] = []
    chapter = None
    for article in articles:
        if article["chapter"] != chapter:
            chapter = article["chapter"]
            sections.append(f'<h1 class="chapter">{html.escape(str(chapter))}</h1>')
        primary = (media.get(int(article["post_id"])) or [None])[0]
        sections.append(article_html(article, primary))
    document = "\\n".join(sections)
    HTML_OUT.write_text(f'''<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Maya Tradition: методология источникового чтения</title>
<style>
:root{{--ink:#{INK};--wine:#{WARM};--gold:#{GOLD};--paper:#{CREAM};--line:#ddc9b6}} *{{box-sizing:border-box}}
body{{margin:0;background:#efe5d8;color:var(--ink);font-family:Georgia,"Times New Roman",serif}} main{{max-width:980px;margin:auto;padding:36px 20px 80px}}
.cover{{background:linear-gradient(135deg,#4d2117,var(--wine));color:#fff7ec;border-radius:18px;padding:42px 38px;margin-bottom:36px;box-shadow:0 14px 34px #5b301533}} .eyebrow,.chapter-token{{font:700 12px/1.2 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--gold)}} .cover .eyebrow{{color:#f2c979}} .cover h1{{font-size:clamp(32px,5vw,54px);line-height:1.05;margin:.3em 0}} .cover p{{max-width:720px;line-height:1.55;margin:0}}
.chapter{{font-size:25px;color:var(--wine);margin:48px 0 16px;padding-bottom:9px;border-bottom:2px solid var(--gold)}} .post{{background:#fffdf9;border:1px solid var(--line);border-radius:14px;padding:23px 25px;margin:18px 0;display:flow-root;break-before:page;page-break-before:always;box-shadow:0 3px 12px #5b301511}} .post:first-of-type{{break-before:auto;page-break-before:auto}} .post h2{{font-size:24px;line-height:1.22;margin:7px 0 11px;color:var(--wine)}} .meta{{display:flex;gap:8px 13px;flex-wrap:wrap;font:13px/1.45 Arial,sans-serif;color:#{MUTED};padding:10px 0 14px;border-top:1px solid #eadacc;border-bottom:1px solid #eadacc;margin-bottom:16px}} .meta a{{color:var(--wine);overflow-wrap:anywhere}} .post-media{{float:right;width:min(36%,310px);margin:0 0 15px 24px}} .post-photo-main{{display:block;width:100%;height:auto;border-radius:10px;border:1px solid #d4b89e;background:#f1e6d9}} .text{{white-space:normal;font-size:17px;line-height:1.62}} @media(max-width:700px){{main{{padding:18px 12px 48px}}.cover{{padding:29px 22px}}.post{{padding:19px 17px}}.post-media{{float:none;width:100%;margin:0 0 15px}}.text{{font-size:16px}}}} @media print{{body{{background:#fff}}main{{max-width:none;padding:0}}.cover{{border-radius:0;box-shadow:none;break-after:page}}.post{{box-shadow:none;border-radius:0;margin:0;min-height:92vh}}}}
</style></head><body><main><header class="cover"><div class="eyebrow">Reading edition · local Telegram export</div><h1>Maya Tradition</h1><p>Методология источникового чтения. Редакционная компоновка 82 сохранённых текстов: формулировки автора воспроизводятся без фактологического дополнения.</p></header>{document}</main></body></html>''', encoding="utf-8")


def shade(cell, value: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr(); shd = OxmlElement("w:shd"); shd.set(qn("w:fill"), value); tc_pr.append(shd)


def set_cell_margins(cell, top=100, start=120, bottom=100, end=120):
    tc = cell._tc; tcPr = tc.get_or_add_tcPr(); margins = tcPr.first_child_found_in("w:tcMar")
    if margins is None: margins = OxmlElement("w:tcMar"); tcPr.append(margins)
    for side, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = margins.find(qn(f"w:{side}"))
        if node is None: node = OxmlElement(f"w:{side}"); margins.append(node)
        node.set(qn("w:w"), str(value)); node.set(qn("w:type"), "dxa")


def add_run(paragraph, text, size=10.5, bold=False, color=INK):
    run = paragraph.add_run(text); run.bold = bold; run.font.name = "Georgia"; run._element.rPr.rFonts.set(qn("w:hAnsi"), "Georgia"); run.font.size = Pt(size); run.font.color.rgb = RGBColor.from_string(color); return run


def build_docx(articles: list[dict[str, object]], media: dict[int, list[str]]) -> None:
    doc = Document(); sec = doc.sections[0]; sec.top_margin = Inches(.68); sec.bottom_margin = Inches(.65); sec.left_margin = Inches(.72); sec.right_margin = Inches(.72)
    styles = doc.styles; styles["Normal"].font.name = "Georgia"; styles["Normal"]._element.rPr.rFonts.set(qn("w:hAnsi"), "Georgia"); styles["Normal"].font.size = Pt(10.5)
    title = doc.add_paragraph(); title.alignment = WD_ALIGN_PARAGRAPH.CENTER; add_run(title, "MAYA TRADITION", 28, True, WARM)
    subtitle = doc.add_paragraph(); subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER; add_run(subtitle, "Методология источникового чтения", 14, True, GOLD)
    note = doc.add_paragraph(); note.alignment = WD_ALIGN_PARAGRAPH.CENTER; add_run(note, "Локальный Telegram-экспорт · 82 сохранённых текстовых поста", 9.5, False, MUTED)
    chapter = None
    for article in articles:
        if article["chapter"] != chapter:
            chapter = article["chapter"]
        doc.add_page_break()
        token = doc.add_table(rows=1, cols=1); token.autofit = False; cell = token.cell(0,0); shade(cell, CREAM); set_cell_margins(cell); cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p = cell.paragraphs[0]; add_run(p, str(chapter).upper(), 8.5, True, GOLD)
        table = doc.add_table(rows=1, cols=2); table.autofit = False; table.columns[0].width = Inches(4.3); table.columns[1].width = Inches(2.0)
        left, right = table.rows[0].cells; set_cell_margins(left); set_cell_margins(right); right.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP
        p = left.paragraphs[0]; add_run(p, str(article["title"]), 17, True, WARM)
        meta = left.add_paragraph(); add_run(meta, f"Источник: пост {article['post_id']}\n", 8.5, True, GOLD); add_run(meta, f"Дата: {article['date']}\n", 8.5, False, MUTED); add_run(meta, str(article["url"]), 8.5, False, WARM)
        primary = (media.get(int(article["post_id"])) or [None])[0]
        if primary and (HERE / "raw" / primary).exists():
            p = right.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.RIGHT; p.add_run().add_picture(str(HERE / "raw" / primary), width=Inches(1.85))
        body = doc.add_paragraph(); body.paragraph_format.space_before = Pt(9); body.paragraph_format.line_spacing = 1.25
        for line_no, line in enumerate(str(article["text"]).splitlines()):
            add_run(body, line, 10.5)
            if line_no < len(str(article["text"]).splitlines()) - 1: body.add_run().add_break()
    doc.save(DOCX_OUT)


def main() -> None:
    OUT.mkdir(exist_ok=True)
    articles, media = parse_articles(), parse_media()
    if len(articles) != 82:
        raise SystemExit(f"Expected 82 retained articles, found {len(articles)}")
    build_html(articles, media)
    build_docx(articles, media)
    print(f"wrote {HTML_OUT} and {DOCX_OUT} ({len(articles)} articles)")


if __name__ == "__main__":
    main()
