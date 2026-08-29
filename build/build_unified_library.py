from __future__ import annotations

from collections import OrderedDict
from html import escape
from pathlib import Path
import re

from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "source-books"
FINAL_ROOT = ROOT / "final"
OUTPUT_FILE = FINAL_ROOT / "unified-library.html"


BOOKS = [
    {
        "group": "Maya Tradition",
        "group_id": "maya-tradition",
        "id": "maya-tradition-methodology",
        "title": "Maya Tradition: методология источникового чтения",
        "description": "Единая reading edition: 122 источниково размеченных материала в семи тематических главах, с сохранёнными ссылками на Telegram-источники.",
        "path": SOURCE_ROOT / "book-3-maya-tradition" / "outputs" / "Maya_Tradition_Methodology.html",
        "asset_prefix": "../source-books/book-3-maya-tradition/outputs/",
        "asset_rewrites": {
            "../raw/": "../source-books/book-3-maya-tradition/raw/",
            "../media/": "../source-books/book-3-maya-tradition/media/",
        },
        "cover_image": "../source-books/book-3-maya-tradition/raw/photos/photo_1@07-09-2022_19-37-03.jpg",
        "kind": "Методология",
    },
    {
        "group": "Алхимия души",
        "group_id": "alchemy-soul",
        "id": "soul-homeopathy-foundations",
        "title": "Книга 01. Гомеопатия: основы и метод",
        "description": "Базовые материалы о гомеопатии в проекте: принципы, мифы, логика подбора и место метода.",
        "path": SOURCE_ROOT / "book-1-alchemy-soul" / "alchemy_soul_guide_homeopathy_foundations.html",
        "asset_prefix": "../source-books/book-1-alchemy-soul/",
        "cover_image": "../source-books/book-1-alchemy-soul/media/post_10_01.jpg",
        "kind": "Книга",
    },
    {
        "group": "Алхимия души",
        "group_id": "alchemy-soul",
        "id": "soul-homeopathy-remedies",
        "title": "Книга 02. Гомеопатические препараты и карточки",
        "description": "Карточки и прикладные заметки по препаратам, эффектам, образам и психологическому смыслу.",
        "path": SOURCE_ROOT / "book-1-alchemy-soul" / "alchemy_soul_guide_homeopathy_remedies.html",
        "asset_prefix": "../source-books/book-1-alchemy-soul/",
        "cover_image": "../source-books/book-1-alchemy-soul/media/post_18_01.jpg",
        "kind": "Книга",
    },
    {
        "group": "Алхимия души",
        "group_id": "alchemy-soul",
        "id": "soul-naturopathy-hormones",
        "title": "Книга 03. Натуропатия: БАДы, минералы и гормональная поддержка",
        "description": "Материалы о натуральной поддержке через БАДы, минералы и гормональные темы.",
        "path": SOURCE_ROOT / "book-1-alchemy-soul" / "alchemy_soul_guide_naturopathy_hormones.html",
        "asset_prefix": "../source-books/book-1-alchemy-soul/",
        "cover_image": "../source-books/book-1-alchemy-soul/media/post_259_01.jpg",
        "kind": "Книга",
    },
    {
        "group": "Алхимия души",
        "group_id": "alchemy-soul",
        "id": "soul-naturopathy-oils",
        "title": "Книга 04. Натуропатия: аромамасла, травы и натуральные носители",
        "description": "Отдельный блок по аромамаслам, травам и натуральным носителям воздействия.",
        "path": SOURCE_ROOT / "book-1-alchemy-soul" / "alchemy_soul_guide_naturopathy_oils.html",
        "asset_prefix": "../source-books/book-1-alchemy-soul/",
        "cover_image": "../source-books/book-1-alchemy-soul/media/post_117_01.jpg",
        "kind": "Книга",
    },
    {
        "group": "Алхимия души",
        "group_id": "alchemy-soul",
        "id": "soul-bach-foundations",
        "title": "Книга 05. Эссенции Баха: введение и практика",
        "description": "Как используются эссенции Баха и как они встраиваются в общую практику.",
        "path": SOURCE_ROOT / "book-1-alchemy-soul" / "alchemy_soul_guide_bach_foundations.html",
        "asset_prefix": "../source-books/book-1-alchemy-soul/",
        "cover_image": "../source-books/book-1-alchemy-soul/media/post_855_01.jpg",
        "kind": "Книга",
    },
    {
        "group": "Алхимия души",
        "group_id": "alchemy-soul",
        "id": "soul-bach-cards",
        "title": "Книга 06. Эссенции Баха: карточки препаратов",
        "description": "Компактный сборник карточек и точечных заметок по отдельным препаратам Баха.",
        "path": SOURCE_ROOT / "book-1-alchemy-soul" / "alchemy_soul_guide_bach_cards.html",
        "asset_prefix": "../source-books/book-1-alchemy-soul/",
        "cover_image": "../source-books/book-1-alchemy-soul/media/post_999_01.jpg",
        "kind": "Книга",
    },
    {
        "group": "Алхимия души",
        "group_id": "alchemy-soul",
        "id": "soul-brain-theory",
        "title": "Книга 07. Работа с мозгом: теория, модели и нейрофизиология",
        "description": "Теоретический блок по мозгу, нейрофизиологии, вагусу и общей модели нейроподхода.",
        "path": SOURCE_ROOT / "book-1-alchemy-soul" / "alchemy_soul_guide_brain_theory.html",
        "asset_prefix": "../source-books/book-1-alchemy-soul/",
        "cover_image": "../source-books/book-1-alchemy-soul/media/post_897_01.jpg",
        "kind": "Книга",
    },
    {
        "group": "Алхимия души",
        "group_id": "alchemy-soul",
        "id": "soul-brain-protocols",
        "title": "Книга 08. Работа с мозгом: диагностика и протоколы",
        "description": "Практическая книга по матрицам, протоколам, вратам, уровням и нейрокоррекции.",
        "path": SOURCE_ROOT / "book-1-alchemy-soul" / "alchemy_soul_guide_brain_protocols.html",
        "asset_prefix": "../source-books/book-1-alchemy-soul/",
        "cover_image": "../source-books/book-1-alchemy-soul/media/post_294_01.jpg",
        "kind": "Книга",
    },
    {
        "group": "Даосская алхимия",
        "group_id": "dao-books",
        "id": "dao-alchemy-intro",
        "title": "1. Введение в даосскую алхимию",
        "description": "Вводные тексты, опорные принципы Пути Дао и базовые ориентиры для первого входа.",
        "path": SOURCE_ROOT / "book-2-dao-books" / "dao_alchemy_intro.html",
        "asset_prefix": "../source-books/book-2-dao-books/",
        "cover_image": "../source-books/book-2-dao-books/photos/post_2_1.jpg",
        "kind": "Книга",
    },
    {
        "group": "Даосская алхимия",
        "group_id": "dao-books",
        "id": "dao-tradition-temples-symbols",
        "title": "2. Даосская традиция, храмы и символический мир",
        "description": "Храмы, божества, священные места и календарно-символический мир даосской традиции.",
        "path": SOURCE_ROOT / "book-2-dao-books" / "dao_tradition_temples_symbols.html",
        "asset_prefix": "../source-books/book-2-dao-books/",
        "cover_image": "../source-books/book-2-dao-books/photos/post_7_1.jpg",
        "kind": "Книга",
    },
    {
        "group": "Даосская алхимия",
        "group_id": "dao-books",
        "id": "dao-magic-basics",
        "title": "3. Даосская магия: основы",
        "description": "Базовые принципы даосской магии, внутренней силы и сакрального действия.",
        "path": SOURCE_ROOT / "book-2-dao-books" / "dao_magic_basics.html",
        "asset_prefix": "../source-books/book-2-dao-books/",
        "cover_image": "../source-books/book-2-dao-books/photos/post_18_1.jpg",
        "kind": "Книга",
    },
    {
        "group": "Даосская алхимия",
        "group_id": "dao-books",
        "id": "dao-talismans-symbols",
        "title": "4. Талисманы, иероглифы и сакральные знаки",
        "description": "Тексты о талисманах, символах, сакральных знаках и образах-носителях силы.",
        "path": SOURCE_ROOT / "book-2-dao-books" / "dao_talismans_symbols.html",
        "asset_prefix": "../source-books/book-2-dao-books/",
        "cover_image": "../source-books/book-2-dao-books/photos/post_15_1.jpg",
        "kind": "Книга",
    },
    {
        "group": "Даосская алхимия",
        "group_id": "dao-books",
        "id": "dao-rituals-altars",
        "title": "5. Ритуалы, алтари и обращения",
        "description": "Материалы о ритуалах, алтарях, настройках и последовательности сакральной практики.",
        "path": SOURCE_ROOT / "book-2-dao-books" / "dao_rituals_altars.html",
        "asset_prefix": "../source-books/book-2-dao-books/",
        "cover_image": "../source-books/book-2-dao-books/photos/post_129_1.jpg",
        "kind": "Книга",
    },
    {
        "group": "Даосская алхимия",
        "group_id": "dao-books",
        "id": "dao-yijing-predictions",
        "title": "6. Ицзин и даосские предсказания",
        "description": "Гадание, гексаграммы, Ицзин и методика получения даосских подсказок.",
        "path": SOURCE_ROOT / "book-2-dao-books" / "dao_yijing_predictions.html",
        "asset_prefix": "../source-books/book-2-dao-books/",
        "cover_image": "../source-books/book-2-dao-books/photos/post_80_1.jpg",
        "kind": "Книга",
    },
    {
        "group": "Даосская алхимия",
        "group_id": "dao-books",
        "id": "dao-healing-basics",
        "title": "7. Даосское целительство: основы",
        "description": "Принципы даосского целительства, восстановления ресурса и работы с состоянием человека.",
        "path": SOURCE_ROOT / "book-2-dao-books" / "dao_healing_basics.html",
        "asset_prefix": "../source-books/book-2-dao-books/",
        "cover_image": "../source-books/book-2-dao-books/photos/post_105_1.jpg",
        "kind": "Книга",
    },
    {
        "group": "Даосская алхимия",
        "group_id": "dao-books",
        "id": "dao-wuxing-five-elements",
        "title": "8. УСИН: пять стихий и состояния",
        "description": "Практические материалы о пяти стихиях УСИН, органах, эмоциях и коррекции дисбалансов.",
        "path": SOURCE_ROOT / "book-2-dao-books" / "dao_wuxing_five_elements.html",
        "asset_prefix": "../source-books/book-2-dao-books/",
        "cover_image": "../source-books/book-2-dao-books/photos/post_87_1.jpg",
        "kind": "Книга",
    },
    {
        "group": "Даосская алхимия",
        "group_id": "dao-books",
        "id": "dao-wuxing-model-steps",
        "title": "9. Модель ДАО УСИН и ступени развития",
        "description": "Авторская модель ДАО УСИН, уровни, ступени развития и архитектура пути.",
        "path": SOURCE_ROOT / "book-2-dao-books" / "dao_wuxing_model_steps.html",
        "asset_prefix": "../source-books/book-2-dao-books/",
        "cover_image": "../source-books/book-2-dao-books/photos/post_117_1.jpg",
        "kind": "Книга",
    },
    {
        "group": "Даосская алхимия",
        "group_id": "dao-books",
        "id": "dao-practicum-cases-remedies",
        "title": "10. Практикум: диагностика, кейсы, препараты",
        "description": "Разборы состояний, прикладные кейсы, препараты и рабочие заметки по практике.",
        "path": SOURCE_ROOT / "book-2-dao-books" / "dao_practicum_cases_remedies.html",
        "asset_prefix": "../source-books/book-2-dao-books/",
        "cover_image": "../source-books/book-2-dao-books/photos/post_65_1.jpg",
        "kind": "Книга",
    },
    {
        "group": "Дополнительные разделы",
        "group_id": "extras",
        "id": "dao-wuxing-steps",
        "title": "Ступени Дао Усин",
        "description": "Краткая схема ступеней Дао Усин.",
        "path": SOURCE_ROOT / "book-2-dao-books" / "dao_wuxing_steps.html",
        "asset_prefix": "../source-books/book-2-dao-books/",
        "kind": "Раздел",
    },
    {
        "group": "Дополнительные разделы",
        "group_id": "extras",
        "id": "dao-model-mini-guide",
        "title": "Мини-методичка по модели DAO",
        "description": "Сжатое описание модели DAO в отдельной методичке.",
        "path": SOURCE_ROOT / "book-2-dao-books" / "dao_model_mini_guide.html",
        "asset_prefix": "../source-books/book-2-dao-books/",
        "kind": "Методичка",
    },
    {
        "group": "Дополнительные разделы",
        "group_id": "extras",
        "id": "book-build-guide",
        "title": "Руководство по сборке книг",
        "description": "Техническое описание структуры и сборки корпуса книг.",
        "path": SOURCE_ROOT / "book-2-dao-books" / "book_build_guide.html",
        "asset_prefix": "../source-books/book-2-dao-books/",
        "kind": "Раздел",
    },
    {
        "group": "Дополнительные разделы",
        "group_id": "extras",
        "id": "agents-config",
        "title": "Инструкции проекта",
        "description": "Встроенная справка по проектным инструкциям.",
        "path": SOURCE_ROOT / "book-2-dao-books" / "agents_config.html",
        "asset_prefix": "../source-books/book-2-dao-books/",
        "kind": "Раздел",
    },
]


def slugify(text: str) -> str:
    text = text.strip().lower().replace("ё", "е")
    text = re.sub(r"[^a-zа-я0-9]+", "-", text, flags=re.I)
    text = re.sub(r"-+", "-", text).strip("-")
    return text or "section"


def collect_book_data() -> tuple[OrderedDict, list[str]]:
    included_html = {item["path"].name: item["id"] for item in BOOKS}
    nav_groups: OrderedDict[str, list[dict]] = OrderedDict()
    content_chunks: list[str] = []

    for item in BOOKS:
        soup = BeautifulSoup(item["path"].read_text(encoding="utf-8"), "html.parser")
        main = soup.find("main") or soup.body

        for node in main.select("script, style, nav.nav"):
            node.decompose()

        for tag in main.find_all(True):
            if tag.has_attr("id"):
                tag["id"] = f"{item['id']}-{tag['id']}"

        section_records = []
        local_section_counter = 0
        for section in main.find_all("section"):
            classes = section.get("class", [])
            if "page-intro" in classes or "toc" in classes:
                continue
            heading = section.find(["h2", "h3"])
            if not heading:
                continue
            if not section.get("id"):
                local_section_counter += 1
                section["id"] = f"{item['id']}-section-{slugify(heading.get_text(' ', strip=True))}-{local_section_counter}"
            section_records.append((section["id"], heading.get_text(" ", strip=True)))

        for tag in main.find_all(["a", "img", "source"]):
            attr = "href" if tag.name == "a" else "src"
            if not tag.has_attr(attr):
                continue
            value = tag[attr].strip()
            if not value:
                continue
            if value.startswith("#"):
                tag[attr] = f"#{item['id']}-{value[1:]}"
                continue
            if re.match(r"^(https?:|mailto:|tel:|data:)", value):
                continue
            filename = value.split("/")[-1]
            if attr == "href" and filename in included_html:
                tag[attr] = f"#{included_html[filename]}"
                continue
            for source_prefix, output_prefix in item.get("asset_rewrites", {}).items():
                if value.startswith(source_prefix):
                    tag[attr] = output_prefix + value[len(source_prefix):]
                    break
            else:
                tag[attr] = item["asset_prefix"] + value.lstrip("./")

        overview_id = f"{item['id']}-overview"
        first_h1 = main.find("h1")
        if first_h1:
            first_h1["id"] = overview_id
        elif main.find(True):
            main.find(True)["id"] = overview_id

        if not section_records:
            for heading in main.find_all("h2", recursive=True):
                if heading.get("id"):
                    section_records.append((heading["id"], heading.get_text(" ", strip=True)))
                    continue
                local_section_counter += 1
                heading_id = f"{item['id']}-heading-{slugify(heading.get_text(' ', strip=True))}-{local_section_counter}"
                heading["id"] = heading_id
                section_records.append((heading_id, heading.get_text(" ", strip=True)))

        nav_groups.setdefault(item["group"], []).append(
            {
                "id": item["id"],
                "title": item["title"],
                "description": item["description"],
                "kind": item["kind"],
                "sections": [(overview_id, "Обзор")] + section_records,
            }
        )

        content_chunks.append(
            f"""
    <article class="library-book" id="{item['id']}" data-book-id="{item['id']}" data-group="{item['group_id']}">
      <header class="library-book-header">
        <div class="library-book-kicker">{escape(item['group'])} • {escape(item['kind'])}</div>
        <h1>{escape(item['title'])}</h1>
        <p>{escape(item['description'])}</p>
      </header>
      <div class="book-content">{main.decode_contents()}</div>
    </article>
"""
        )

    return nav_groups, content_chunks


def build_html() -> str:
    nav_groups, content_chunks = collect_book_data()

    sidebar_groups = []
    for index, (group_name, group_books) in enumerate(nav_groups.items()):
        group_items = []
        for book in group_books:
            section_links = "\n".join(
                f'<li><a href="#{sid}" data-book-link="{book["id"]}" data-target-section="{sid}">{escape(title)}</a></li>'
                for sid, title in book["sections"]
            )
            search_text = (book["title"] + " " + book["description"] + " " + " ".join(title for _, title in book["sections"])).lower()
            group_items.append(
                f"""
        <details class="nav-book" {'open' if index == 0 else ''} data-book-id="{book['id']}" data-search-text="{escape(search_text, quote=True)}">
          <summary data-activate-book="{book['id']}">
            <span class="nav-book-kind">{escape(book['kind'])}</span>
            <span class="nav-book-title">{escape(book['title'])}</span>
          </summary>
          <ul class="nav-sections">{section_links}</ul>
        </details>
"""
            )
        sidebar_groups.append(
            f"""
    <section class="nav-group" data-group-name="{escape(group_name)}">
      <div class="nav-group-label">{escape(group_name)}</div>
      {''.join(group_items)}
    </section>
"""
        )

    home_cards = []
    for group_name, group_books in nav_groups.items():
        cards = []
        extras = []
        for book in group_books:
            book_meta = next(item for item in BOOKS if item["id"] == book["id"])
            if book_meta["kind"] == "Книга" and book_meta.get("cover_image"):
                cards.append(
                    f"""
      <button type="button" class="home-card" data-open-book="{book['id']}">
        <img class="home-card-image" src="{escape(book_meta['cover_image'])}" alt="{escape(book['title'])}">
        <span class="home-card-title">{escape(book['title'])}</span>
      </button>
"""
                )
            else:
                extras.append(
                    f'<button type="button" class="home-link" data-open-book="{book["id"]}">{escape(book["title"])}<span>{escape(book["kind"])}</span></button>'
                )
        home_cards.append(
            f"""
    <section class="home-group">
      <h2>{escape(group_name)}</h2>
      <p>{len(group_books)} материалов в разделе.</p>
      {'<div class="home-cards">' + ''.join(cards) + '</div>' if cards else ''}
      {'<div class="home-links">' + ''.join(extras) + '</div>' if extras else ''}
    </section>
"""
        )

    first_id = BOOKS[0]["id"]
    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Электронная библиотека — Алхимия души и даосская алхимия</title>
  <style>
    :root {{
      --bg: #efe7db;
      --bg-deep: #e2d4c3;
      --panel: rgba(255, 250, 243, 0.94);
      --panel-strong: #fffaf2;
      --line: #d3c0ab;
      --line-strong: #b79d81;
      --ink: #221912;
      --muted: #6b5a4c;
      --accent: #8a4b21;
      --accent-strong: #6b3513;
      --accent-soft: #f2e3cf;
      --shadow: 0 22px 48px rgba(56, 33, 16, 0.12);
      --sidebar-w: 380px;
      --content-max: 1080px;
    }}
    * {{ box-sizing: border-box; }}
    html {{ scroll-behavior: smooth; }}
    body {{
      margin: 0;
      min-height: 100vh;
      font-family: Georgia, "Times New Roman", serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(255,255,255,0.45), transparent 28%),
        radial-gradient(circle at bottom right, rgba(176, 129, 84, 0.12), transparent 24%),
        linear-gradient(180deg, #f7f0e6 0%, var(--bg) 44%, var(--bg-deep) 100%);
    }}
    a {{ color: var(--accent); }}
    button, input {{ font: inherit; }}
    .mobile-bar {{
      display: none;
      position: sticky;
      top: 0;
      z-index: 60;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 16px;
      background: rgba(255, 248, 239, 0.92);
      backdrop-filter: blur(18px);
      border-bottom: 1px solid rgba(179, 156, 129, 0.5);
    }}
    .mobile-bar button {{
      border: 1px solid var(--line);
      background: var(--panel-strong);
      border-radius: 999px;
      padding: 10px 14px;
      color: var(--accent-strong);
      cursor: pointer;
    }}
    .mobile-title {{ font-size: 15px; line-height: 1.25; color: var(--muted); }}
    .layout {{ display: grid; grid-template-columns: minmax(290px, var(--sidebar-w)) 1fr; min-height: 100vh; }}
    .sidebar {{
      position: sticky;
      top: 0;
      height: 100vh;
      overflow: auto;
      padding: 28px 20px 24px;
      background: rgba(251, 244, 235, 0.88);
      border-right: 1px solid rgba(179, 156, 129, 0.55);
      backdrop-filter: blur(16px);
    }}
    .sidebar-shell {{ display: flex; flex-direction: column; gap: 18px; }}
    .sidebar-head {{
      padding: 20px 18px;
      border: 1px solid rgba(179, 156, 129, 0.6);
      border-radius: 22px;
      background: linear-gradient(180deg, rgba(255,250,244,0.95), rgba(245,233,217,0.88));
      box-shadow: var(--shadow);
    }}
    .sidebar-head h1 {{ margin: 0 0 8px; font-size: 28px; line-height: 1.05; }}
    .sidebar-head p {{ margin: 0; color: var(--muted); line-height: 1.55; font-size: 15px; }}
    .search-wrap input {{
      width: 100%;
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.72);
      color: var(--ink);
      outline: none;
    }}
    .search-wrap input:focus {{ border-color: var(--line-strong); box-shadow: 0 0 0 4px rgba(138, 75, 33, 0.08); }}
    .nav-tree {{ display: flex; flex-direction: column; gap: 16px; }}
    .nav-group {{
      padding: 14px;
      border: 1px solid rgba(179, 156, 129, 0.5);
      border-radius: 18px;
      background: rgba(255, 251, 246, 0.82);
    }}
    .nav-group[hidden] {{ display: none; }}
    .nav-group-label {{
      margin-bottom: 10px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--muted);
    }}
    .nav-book {{
      border: 1px solid rgba(211, 192, 171, 0.85);
      border-radius: 16px;
      background: rgba(255,255,255,0.82);
      overflow: hidden;
    }}
    .nav-book + .nav-book {{ margin-top: 10px; }}
    .nav-book summary {{
      list-style: none;
      cursor: pointer;
      display: grid;
      gap: 4px;
      padding: 14px 16px;
      position: relative;
    }}
    .nav-book summary::-webkit-details-marker {{ display: none; }}
    .nav-book summary::after {{
      content: "+";
      position: absolute;
      right: 14px;
      top: 12px;
      font-size: 22px;
      line-height: 1;
      color: var(--accent);
    }}
    .nav-book[open] summary::after {{ content: "−"; }}
    .nav-book.active {{ border-color: var(--line-strong); box-shadow: inset 0 0 0 1px rgba(138, 75, 33, 0.12); }}
    .nav-book-kind {{ font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }}
    .nav-book-title {{ padding-right: 22px; font-size: 15px; line-height: 1.35; }}
    .nav-sections {{ margin: 0; padding: 0 14px 14px 32px; }}
    .nav-sections li + li {{ margin-top: 8px; }}
    .nav-sections a {{ text-decoration: none; color: #533726; line-height: 1.35; }}
    .nav-sections a:hover, .nav-sections a.is-current {{ color: var(--accent-strong); text-decoration: underline; }}
    .content-shell {{ max-width: calc(var(--content-max) + 64px); margin: 0 auto; padding: 32px; }}
    .welcome, .library-book {{
      background: linear-gradient(180deg, rgba(255,252,247,0.96), rgba(249,243,235,0.96));
      border: 1px solid rgba(179, 156, 129, 0.58);
      border-radius: 30px;
      box-shadow: var(--shadow);
    }}
    .welcome {{ padding: 34px 30px; }}
    .welcome h2 {{ margin: 0 0 14px; font-size: clamp(34px, 4.8vw, 56px); line-height: 0.98; }}
    .welcome p {{ margin: 0; max-width: 72ch; color: var(--muted); line-height: 1.65; font-size: 18px; }}
    .welcome-grid {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; margin-top: 28px; }}
    .home-group {{ padding: 20px; border: 1px solid rgba(211, 192, 171, 0.8); border-radius: 22px; background: rgba(255,255,255,0.64); }}
    .home-group h2 {{ margin: 0 0 8px; font-size: 24px; }}
    .home-group p {{ margin: 0 0 14px; font-size: 15px; color: var(--muted); }}
    .home-links {{ display: flex; flex-wrap: wrap; gap: 10px; }}
    .home-cards {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; }}
    .home-card {{
      border: 1px solid rgba(211, 192, 171, 0.9);
      background: rgba(255,255,255,0.82);
      border-radius: 22px;
      overflow: hidden;
      padding: 0;
      cursor: pointer;
      color: var(--ink);
      text-align: left;
      box-shadow: 0 10px 24px rgba(63, 39, 20, 0.08);
    }}
    .home-card-image {{
      width: 100%;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      display: block;
      background: #e8dbc8;
      border-bottom: 1px solid rgba(211, 192, 171, 0.9);
    }}
    .home-card-title {{
      display: block;
      padding: 14px 14px 16px;
      font-size: 17px;
      line-height: 1.35;
      font-weight: 700;
    }}
    .home-link {{
      border: 1px solid var(--line);
      background: var(--panel-strong);
      color: var(--accent-strong);
      border-radius: 999px;
      padding: 10px 14px;
      cursor: pointer;
      text-align: left;
    }}
    .home-link span {{ display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); margin-top: 4px; }}
    .library-book {{ display: none; padding: 28px; }}
    .library-book.is-active {{ display: block; }}
    .library-book-header {{ margin-bottom: 24px; padding-bottom: 18px; border-bottom: 1px solid rgba(179, 156, 129, 0.55); }}
    .library-book-kicker {{ margin-bottom: 8px; font-size: 12px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }}
    .library-book-header h1 {{ margin: 0 0 10px; font-size: clamp(28px, 4vw, 46px); line-height: 1.04; }}
    .library-book-header p {{ margin: 0; color: var(--muted); line-height: 1.6; font-size: 17px; max-width: 70ch; }}
    .book-content > :first-child {{ margin-top: 0 !important; }}
    .book-content h1 {{ display: none; }}
    .book-content h2 {{ margin: 0 0 16px; font-size: clamp(24px, 3vw, 34px); line-height: 1.1; }}
    .book-content h3 {{ margin: 0 0 12px; font-size: clamp(22px, 2.4vw, 30px); line-height: 1.18; }}
    .book-content h4 {{ margin: 0 0 10px; font-size: clamp(20px, 2.2vw, 28px); line-height: 1.18; }}
    .book-content p, .book-content li, .book-content blockquote {{ font-size: 18px; line-height: 1.7; color: #2a1f18; }}
    .book-content ul, .book-content ol {{ padding-left: 22px; }}
    .book-content .page-intro,
    .book-content .toc,
    .book-content .book-section,
    .book-content section,
    .book-content article,
    .book-content .post,
    .book-content .hero,
    .book-content .links,
    .book-content .panel {{
      background: rgba(255, 253, 249, 0.94);
      border: 1px solid rgba(211, 192, 171, 0.82);
      border-radius: 24px;
      padding: 22px 22px 24px;
      margin: 0 0 18px;
      box-shadow: 0 10px 24px rgba(63, 39, 20, 0.06);
    }}
    .book-content article.post + article.post {{ margin-top: 18px; }}
    .book-content .meta {{ color: var(--muted); font-size: 13px; line-height: 1.6; margin-bottom: 12px; }}
    .book-content img {{ max-width: 100%; height: auto; display: block; border-radius: 18px; background: #eadfce; }}
    .book-content figure {{ margin: 0 0 16px; }}
    .book-content .lead-figure, .book-content .post-media {{ float: right; width: min(34%, 320px); margin: 0 0 14px 20px; }}
    .book-content .post-gallery {{ clear: both; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-top: 14px; }}
    .book-content .nav, .book-content .grid {{ display: flex; flex-wrap: wrap; gap: 10px; }}
    .book-content .nav a, .book-content .grid a, .book-content .links a {{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 999px;
      border: 1px solid rgba(211, 192, 171, 0.9);
      background: var(--accent-soft);
      text-decoration: none;
      color: var(--accent-strong);
    }}
    .book-content::after, .book-content article::after, .book-content section::after {{ content: ""; display: block; clear: both; }}
    @media (max-width: 900px) {{
      .mobile-bar {{ display: flex; }}
      .layout {{ display: block; }}
      .sidebar {{
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: min(88vw, 380px);
        z-index: 80;
        transform: translateX(-102%);
        transition: transform 0.25s ease;
        box-shadow: 20px 0 40px rgba(38, 21, 9, 0.18);
      }}
      .sidebar.is-open {{ transform: translateX(0); }}
      .content-shell {{ padding: 18px 14px 28px; }}
      .welcome-grid {{ grid-template-columns: 1fr; }}
      .library-book {{ padding: 18px; }}
      .book-content p, .book-content li, .book-content blockquote {{ font-size: 16px; }}
      .book-content .lead-figure, .book-content .post-media {{ float: none; width: 100%; margin: 0 0 14px; }}
    }}
  </style>
</head>
<body>
  <div class="mobile-bar">
    <div class="mobile-title">Электронная библиотека<br>Алхимия души / Даосская алхимия</div>
    <button type="button" id="menuToggle">Меню</button>
  </div>
  <div class="layout">
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-shell">
        <div class="sidebar-head">
          <h1>Электронная библиотека</h1>
          <p>Для этой задачи библиотека собирается только из локальных копий в текущем проекте. Слева доступно дерево книг и разделов, справа — выбранный материал.</p>
        </div>
        <label class="search-wrap">
          <input id="menuSearch" type="search" placeholder="Поиск по книгам и разделам">
        </label>
        <nav class="nav-tree" id="navTree">
          {''.join(sidebar_groups)}
        </nav>
      </div>
    </aside>
    <main>
      <div class="content-shell">
        <section class="welcome" id="welcomePanel">
          <h2>Корпус знаний в одном HTML-файле</h2>
          <p>Внутри объединены обе библиотеки: методички по «Алхимии души» и книги по даосской алхимии. Все материалы, изображения и внутренние разделы загружаются только из локальных копий внутри текущего проекта.</p>
          <div class="welcome-grid">
            {''.join(home_cards)}
          </div>
        </section>
        {''.join(content_chunks)}
      </div>
    </main>
  </div>
  <script>
    (function () {{
      const sidebar = document.getElementById('sidebar');
      const menuToggle = document.getElementById('menuToggle');
      const menuSearch = document.getElementById('menuSearch');
      const books = Array.from(document.querySelectorAll('.library-book'));
      const navBooks = Array.from(document.querySelectorAll('.nav-book'));
      const welcome = document.getElementById('welcomePanel');
      const sectionLinks = Array.from(document.querySelectorAll('[data-target-section]'));

      function openSidebar(force) {{
        const next = typeof force === 'boolean' ? force : !sidebar.classList.contains('is-open');
        sidebar.classList.toggle('is-open', next);
      }}

      function setCurrentLink(targetId) {{
        sectionLinks.forEach((link) => {{
          link.classList.toggle('is-current', link.dataset.targetSection === targetId);
        }});
      }}

      function activateBook(bookId, sectionId) {{
        welcome.style.display = 'none';
        books.forEach((book) => {{
          book.classList.toggle('is-active', book.dataset.bookId === bookId);
        }});
        navBooks.forEach((book) => {{
          const active = book.dataset.bookId === bookId;
          book.classList.toggle('active', active);
          if (active) {{
            book.open = true;
          }}
        }});
        const target = document.getElementById(sectionId || bookId);
        if (target) {{
          requestAnimationFrame(() => {{
            target.scrollIntoView({{ behavior: 'smooth', block: 'start' }});
          }});
          setCurrentLink(sectionId || (bookId + '-overview'));
        }}
        if (window.innerWidth <= 900) {{
          openSidebar(false);
        }}
      }}

      navBooks.forEach((detail) => {{
        const summary = detail.querySelector('summary');
        if (!summary) return;
        summary.addEventListener('click', () => {{
          const bookId = detail.dataset.bookId;
          setTimeout(() => activateBook(bookId, bookId + '-overview'), 0);
        }});
      }});

      sectionLinks.forEach((link) => {{
        link.addEventListener('click', (event) => {{
          event.preventDefault();
          activateBook(link.dataset.bookLink, link.dataset.targetSection);
          history.replaceState(null, '', '#' + link.dataset.targetSection);
        }});
      }});

      document.querySelectorAll('[data-open-book]').forEach((button) => {{
        button.addEventListener('click', () => {{
          activateBook(button.dataset.openBook, button.dataset.openBook + '-overview');
        }});
      }});

      document.querySelectorAll('.book-content a[href^="#"]').forEach((link) => {{
        link.addEventListener('click', (event) => {{
          const id = link.getAttribute('href').slice(1);
          const target = document.getElementById(id);
          if (!target) return;
          event.preventDefault();
          const book = target.closest('.library-book');
          if (book) {{
            activateBook(book.dataset.bookId, id);
          }}
          history.replaceState(null, '', '#' + id);
        }});
      }});

      menuSearch.addEventListener('input', () => {{
        const query = menuSearch.value.trim().toLowerCase();
        document.querySelectorAll('.nav-group').forEach((group) => {{
          let hasVisible = false;
          group.querySelectorAll('.nav-book').forEach((book) => {{
            const match = !query || (book.dataset.searchText || '').includes(query);
            book.hidden = !match;
            if (match) {{
              hasVisible = true;
              if (query) {{
                book.open = true;
              }}
            }}
          }});
          group.hidden = !hasVisible;
        }});
      }});

      if (menuToggle) {{
        menuToggle.addEventListener('click', () => openSidebar());
      }}

      const initialHash = window.location.hash ? window.location.hash.slice(1) : '';
      if (initialHash) {{
        const target = document.getElementById(initialHash);
        const book = target && target.closest('.library-book');
        if (book) {{
          activateBook(book.dataset.bookId, initialHash);
        }} else {{
          activateBook('{first_id}', '{first_id}-overview');
        }}
      }} else {{
        activateBook('{first_id}', '{first_id}-overview');
      }}
    }})();
  </script>
</body>
</html>
"""


def main() -> None:
    FINAL_ROOT.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(build_html(), encoding="utf-8")
    print(OUTPUT_FILE)


if __name__ == "__main__":
    main()
