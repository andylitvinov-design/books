#!/usr/bin/env python3
from __future__ import annotations

import html
import re
from pathlib import Path


ROOT = Path("/Users/andriilitvinov/projects/alchemy/alchemy-soul-book")
SOURCE = ROOT / "telegram_export.html"


THEMES = [
    {
        "slug": "homeopathy_foundations",
        "title": "Книга 01. Гомеопатия: основы и метод",
        "summary": (
            "Базовые материалы о гомеопатии в проекте: принципы, мифы, потенции, "
            "логика подбора и место гомеопатии внутри метода."
        ),
        "lead": (
            "Теория и методология гомеопатии: как она понимается, применяется и "
            "интегрируется в «Алхимию души»."
        ),
        "cover_class": "cover-homeopathy-foundations",
        "sections": [
            {"title": "Введение в метод", "keywords": ["мой путь", "что такое", "это очень интересно", "медицина и гомеопатия"]},
            {"title": "Принципы и возможности", "keywords": ["принципы", "мифы", "возможности", "ограничени", "потенц", "подбор доз"]},
            {"title": "Интеграция с другими подходами", "keywords": ["психотерап", "расстанов", "алхими", "системной гомеопатии"]},
            {"title": "Формат работы и практика метода", "keywords": ["как я работаю", "сесс", "сопровожд", "эффект", "вопрос", "пример"]},
        ],
    },
    {
        "slug": "homeopathy_remedies",
        "title": "Книга 02. Гомеопатические препараты и карточки",
        "summary": (
            "Собрание карточек и прикладных заметок по гомеопатическим препаратам, "
            "их эффектам, образам и психологическому смыслу."
        ),
        "lead": (
            "Каталог гомеопатических средств внутри паблика: от классических карточек "
            "до прикладных заметок по конкретным препаратам."
        ),
        "cover_class": "cover-homeopathy-remedies",
        "sections": [
            {"title": "Классические карточки препаратов", "keywords": ["препарат", "natrum", "ignatia", "sulphur", "lachesis", "gelsemium", "spongia", "baryta", "mezereum", "teucrium", "calcarea", "pulsatilla"]},
            {"title": "Минеральные и металлические препараты", "keywords": ["metallic", "metal", "aurum", "zincum", "cobalt", "ferrum", "kalium", "magnesium"]},
            {"title": "Гормональные и специальные препараты", "keywords": ["testosteron", "oophor", "folliculin", "x-ray", "северный полюс", "planet", "марс"]},
            {"title": "Прикладные примеры и наблюдения", "keywords": ["пример", "кейс", "работаю", "подходит", "эффект", "симптом"]},
        ],
    },
    {
        "slug": "naturopathy_hormones",
        "title": "Книга 03. Натуропатия: БАДы, минералы и гормональная поддержка",
        "summary": (
            "Материалы о натуральной поддержке через БАДы, минералы, гормональные "
            "темы и сопутствующие натуропатические средства."
        ),
        "lead": (
            "Натуропатический блок, где акцент сделан на добавках, минералах, "
            "гормональных схемах и телесной регуляции."
        ),
        "cover_class": "cover-naturopathy-hormones",
        "sections": [
            {"title": "Натуропатия как линия поддержки", "keywords": ["натуропат", "добав", "поддержк", "бад"]},
            {"title": "Минералы и добавки", "keywords": ["магний", "цинк", "минерал", "бад"]},
            {"title": "Гормональная регуляция", "keywords": ["гормон", "кортизол", "тестостерон", "folliculin", "oophor"]},
            {"title": "Телесные эффекты и рабочие примеры", "keywords": ["нервной системы", "качество вен", "пример", "работаю", "эффект"]},
        ],
    },
    {
        "slug": "naturopathy_oils",
        "title": "Книга 04. Натуропатия: аромамасла, травы и натуральные носители",
        "summary": (
            "Отдельный блок по аромамаслам, травам, натуральным носителям воздействия "
            "и их роли в коррекции состояний."
        ),
        "lead": (
            "Натуропатия как линия мягкого воздействия через масла, травы, запахи и "
            "другие натуральные проводники."
        ),
        "cover_class": "cover-naturopathy-oils",
        "sections": [
            {"title": "Аромамасла как инструмент", "keywords": ["аромамас", "масла", "масло"]},
            {"title": "Травы и натуральные носители", "keywords": ["трав", "туя", "камфор", "овса", "пепельник", "чабрец"]},
            {"title": "Масла и работа с состояниями", "keywords": ["обоняние", "нанесения масел", "мощная вещь", "роль аромамасел"]},
            {"title": "Примеры применения", "keywords": ["пример", "как применять", "вопрос", "апдейт"]},
        ],
    },
    {
        "slug": "bach_foundations",
        "title": "Книга 05. Эссенции Баха: введение и практика",
        "summary": (
            "Материалы о том, как автор использует эссенции Баха, чем они отличаются "
            "от других линий работы и как встраиваются в практику."
        ),
        "lead": (
            "Вводный и практический корпус по эссенциям Баха: наблюдения, способы "
            "применения, сочетание с другими средствами."
        ),
        "cover_class": "cover-bach-foundations",
        "sections": [
            {"title": "Введение в линию Баха", "keywords": ["эссенции баха", "цветочные эссенции", "начал работать", "возвращаюсь к работе"]},
            {"title": "Как применять и сочетать", "keywords": ["как принимать", "когда мы используем", "эффективней", "наблюдения"]},
            {"title": "Бах в общей структуре метода", "keywords": ["подход", "формат работы", "особенность работы", "алхимия души"]},
            {"title": "Практические наблюдения", "keywords": ["наблюдения", "апдейт", "мне нравятся", "работе с препаратами"]},
        ],
    },
    {
        "slug": "bach_cards",
        "title": "Книга 06. Эссенции Баха: карточки препаратов",
        "summary": (
            "Отдельный компактный сборник карточек и точечных заметок по отдельным "
            "препаратам Баха."
        ),
        "lead": (
            "Конкретные препараты Баха: отдельные карточки, краткие описания и "
            "рабочие наблюдения автора."
        ),
        "cover_class": "cover-bach-cards",
        "sections": [
            {"title": "Базовые карточки", "keywords": ["rock water", "willow", "vine", "oak"]},
            {"title": "Карточки баланса и очищения", "keywords": ["crab apple", "hornbeam", "elm", "wild oat"]},
            {"title": "Карточки кризиса и опоры", "keywords": ["sweet chestnut", "cerato"]},
        ],
    },
    {
        "slug": "brain_theory",
        "title": "Книга 07. Работа с мозгом: теория, модели и нейрофизиология",
        "summary": (
            "Теоретический блок по мозгу, нейрофизиологии, вагусу, ретикулярной "
            "формации и общей модели нейроподхода."
        ),
        "lead": (
            "Нейроподход автора на уровне теории: как устроены мозговые центры, "
            "нейровегетативная модель и телесные входы."
        ),
        "cover_class": "cover-brain-theory",
        "sections": [
            {"title": "Общая модель мозга и подсознания", "keywords": ["мозг и подсознание", "нейрофизиолог", "мозг", "сознани"]},
            {"title": "Ствол, вагус и ретикулярная формация", "keywords": ["ствол мозга", "вагус", "ретикуляр", "ядра мозга"]},
            {"title": "Нейрогормональные и телесные входы", "keywords": ["нейрогормон", "телесные входы", "обоняние", "лимбическ"]},
            {"title": "Теоретические наблюдения и примеры", "keywords": ["пример из новостей", "счастье", "просветления", "железный человек"]},
        ],
    },
    {
        "slug": "brain_protocols",
        "title": "Книга 08. Работа с мозгом: диагностика и протоколы",
        "summary": (
            "Практическая книга по матрицам, протоколам, вратам, уровням и рабочим "
            "схемам нейрокоррекции."
        ),
        "lead": (
            "Нейроподход в прикладной форме: диагностика, карты, протоколы, этапы "
            "восстановления и рабочие схемы."
        ),
        "cover_class": "cover-brain-protocols",
        "sections": [
            {"title": "Алгоритм и этапы восстановления", "keywords": ["алгоритм", "этап", "восстановления", "программа"]},
            {"title": "Матрицы и диагностика", "keywords": ["матрица", "диагностик", "карта", "экспресс"]},
            {"title": "Протоколы по центрам и вратам", "keywords": ["протокол", "врата", "dmnv", "nts", "cvlm", "pag", "raphe", "rf"]},
            {"title": "Эффекты и рабочие комментарии", "keywords": ["эффект", "нюанс", "пример", "скажу честно"]},
        ],
    },
]


BRAIN_KEYWORDS = [
    "мозг",
    "нейро",
    "нейровегетат",
    "нейрогормон",
    "ствол мозга",
    "ретикуляр",
    "вагус",
    "миндалина",
    "лимбическ",
    "ядра мозга",
    "головного мозга",
    "мозгов",
    "obonяние".replace("я", "y"),  # keeps ASCII source while evaluating to unused fallback
    "обоняние",
    "parabrach",
    "dmnv",
    "nts",
    "drn",
    "cvlm",
    "vlm",
    "pag",
    "rf",
]

BACH_KEYWORDS = [
    "бах",
    " bach ",
    "bach ",
    " bach",
]

NATUROPATHY_KEYWORDS = [
    "натуропат",
    "бад",
    "аромамас",
    "ароматерап",
    "гормональн",
    "кортизол",
    "тестостерон",
]

HOMEOPATHY_EXTRA_IDS = {
    "note-838",
    "note-839",
    "note-840",
    "note-841",
    "note-842",
    "note-857",
}

HOMEOPATHY_METHOD_KEYWORDS = [
    "гомеопатия",
    "потенц",
    "подбор доз",
    "мифы о гомеопатии",
    "принципы гомеопатии",
    "классическая гомеопатия",
    "психо-гомеопат",
    "архетипическ",
    "системной гомеопатии",
    "как работает гомеопатия",
]

NATUROPATHY_HORMONE_KEYWORDS = [
    "натуропат",
    "бад",
    "магний",
    "цинк",
    "кортизол",
    "гормональн",
    "тестостерон",
    "folliculinum",
    "oophorinum",
]

NATUROPATHY_OIL_KEYWORDS = [
    "аромамас",
    "ароматерап",
    "масла",
    "масло",
    "обоняние",
    "травы",
    "аромат",
]

BACH_CARD_KEYWORDS = [
    "препарат bach",
    "bach willow",
    "bach vine",
    "bach crab apple",
    "bach oak",
    "bach hornbeam",
    "bach wild oat",
    "bach elm",
    "bach sweet chestnut",
    "bach cerato",
    "rock water",
]

BACH_FOUNDATION_KEYWORDS = [
    "эссенции баха",
    "препараты баха",
    "цветочные эссенции баха",
    "как принимать эссенции баха",
    "когда мы используем травы, когда масла, а когда гомеопатию",
]

BRAIN_PROTOCOL_KEYWORDS = [
    "протокол",
    "матрица",
    "диагностик",
    "врата",
    "dmnv",
    "nts",
    "cvlm",
    "pag",
    "raphe",
    "rf",
    "этажи",
]


def strip_tags(value: str) -> str:
    value = re.sub(r"<br\s*/?>", " ", value)
    value = re.sub(r"<.*?>", "", value, flags=re.S)
    return html.unescape(" ".join(value.split()))


def slugify(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[^\wа-яё0-9]+", "-", text, flags=re.IGNORECASE)
    return text.strip("-") or "section"


def format_count(value: int, one: str, few: str, many: str) -> str:
    rem100 = value % 100
    rem10 = value % 10
    if 11 <= rem100 <= 14:
        word = many
    elif rem10 == 1:
        word = one
    elif 2 <= rem10 <= 4:
        word = few
    else:
        word = many
    return f"{value} {word}"


def find_local_image(note_id: str) -> str | None:
    for path in sorted((ROOT / "media").glob(f"post_{note_id}_01.*")):
        if path.is_file() and path.stat().st_size > 0:
            return path.relative_to(ROOT).as_posix()
    return None


def parse_posts() -> tuple[list[dict], dict[str, list[str]]]:
    text = SOURCE.read_text(encoding="utf-8")
    section_pattern = re.compile(
        r'<section class="year-section" id="([^"]+)"><h2>(.*?)</h2><p class="section-lead">(.*?)</p>(.*?)(?=<section class="year-section" id=|</main>)',
        re.S,
    )
    post_pattern = re.compile(
        r'<article class="post" id="([^"]+)">(.*?)</article>',
        re.S,
    )

    posts: list[dict] = []
    sections: dict[str, list[str]] = {}

    for section_id, section_title, section_lead, body in section_pattern.findall(text):
        section_title = strip_tags(section_title)
        section_lead = strip_tags(section_lead)
        sections[section_id] = []

        for note_id, article in post_pattern.findall(body):
            title_match = re.search(r"<h4>(.*?)</h4>", article, re.S)
            date_match = re.search(r"<span>(\d{4}-\d{2}-\d{2})T", article)
            link_match = re.search(r"<span>Публикация: ([^<]+)</span>", article)
            plain = strip_tags(article).lower()
            title = strip_tags(title_match.group(1) if title_match else note_id)
            post = {
                "note_id": note_id,
                "title": title,
                "date": date_match.group(1) if date_match else "",
                "telegram_link": html.unescape(link_match.group(1).strip()) if link_match else "",
                "article_html": f'<article class="post" id="{note_id}">{article}</article>',
                "section_id": section_id,
                "section_title": section_title,
                "section_lead": section_lead,
                "plain": plain,
            }
            posts.append(post)
            sections[section_id].append(note_id)

    return posts, sections


def match_any(text: str, keywords: list[str]) -> bool:
    return any(keyword in text for keyword in keywords)


def build_theme_posts(posts: list[dict], sections: dict[str, list[str]]) -> list[dict]:
    posts_by_id = {post["note_id"]: post for post in posts}

    homeopathy_remedy_ids = set(sections.get("section-remedies", [])) | HOMEOPATHY_EXTRA_IDS

    homeopathy_foundation_ids = {
        post["note_id"]
        for post in posts
        if match_any(post["plain"], HOMEOPATHY_METHOD_KEYWORDS)
    }

    bach_card_ids = {
        post["note_id"]
        for post in posts
        if match_any(f" {post['plain']} ", BACH_KEYWORDS)
        and match_any(f" {post['plain']} ", BACH_CARD_KEYWORDS + ["препарат bach"])
    }

    bach_foundation_ids = {
        post["note_id"]
        for post in posts
        if (
            match_any(f" {post['plain']} ", BACH_KEYWORDS)
            or match_any(post["plain"], BACH_FOUNDATION_KEYWORDS)
        )
        and post["note_id"] not in bach_card_ids
    }

    naturopathy_hormone_ids = {
        post["note_id"]
        for post in posts
        if match_any(post["plain"], NATUROPATHY_HORMONE_KEYWORDS)
        and post["note_id"] not in bach_foundation_ids
        and post["note_id"] not in bach_card_ids
    }

    naturopathy_oil_ids = {
        post["note_id"]
        for post in posts
        if match_any(post["plain"], NATUROPATHY_OIL_KEYWORDS)
        and post["note_id"] not in bach_card_ids
    }

    brain_protocol_ids = {
        post["note_id"]
        for post in posts
        if match_any(post["plain"], BRAIN_KEYWORDS)
        and match_any(post["plain"], BRAIN_PROTOCOL_KEYWORDS)
    }

    brain_theory_ids = {
        post["note_id"]
        for post in posts
        if match_any(post["plain"], BRAIN_KEYWORDS)
        and post["note_id"] not in brain_protocol_ids
    }

    selections = {
        "homeopathy_foundations": homeopathy_foundation_ids,
        "homeopathy_remedies": homeopathy_remedy_ids,
        "naturopathy_hormones": naturopathy_hormone_ids,
        "naturopathy_oils": naturopathy_oil_ids,
        "bach_foundations": bach_foundation_ids,
        "bach_cards": bach_card_ids,
        "brain_theory": brain_theory_ids,
        "brain_protocols": brain_protocol_ids,
    }

    themed: list[dict] = []
    for theme in THEMES:
        chosen = [posts_by_id[note_id] for note_id in selections[theme["slug"]] if note_id in posts_by_id]
        chosen.sort(key=lambda item: posts.index(item))
        cover_image = None
        for post in chosen:
            cover_image = find_local_image(post["note_id"].replace("note-", ""))
            if cover_image:
                break

        sectioned_posts = []
        used_ids: set[str] = set()
        for section in theme["sections"]:
            matched = [
                post for post in chosen
                if post["note_id"] not in used_ids
                and match_any(post["plain"], [kw.lower() for kw in section["keywords"]])
            ]
            if matched:
                for post in matched:
                    used_ids.add(post["note_id"])
                sectioned_posts.append(
                    {
                        "title": section["title"],
                        "anchor": slugify(section["title"]),
                        "posts": matched,
                    }
                )
        remaining = [post for post in chosen if post["note_id"] not in used_ids]
        if remaining:
            sectioned_posts.append(
                {
                    "title": "Дополнительные материалы",
                    "anchor": slugify("Дополнительные материалы"),
                    "posts": remaining,
                }
            )

        themed.append(
            {
                **theme,
                "posts": chosen,
                "sectioned_posts": sectioned_posts,
                "count": len(chosen),
                "cover_image": cover_image,
            }
        )

    return themed


def render_markdown(themes: list[dict]) -> dict[str, str]:
    rendered: dict[str, str] = {}

    for theme in themes:
        lines = [
            f"# {theme['title']}",
            "",
            theme["summary"],
            "",
            "## Ключевое оглавление",
            "",
        ]

        for section in theme["sectioned_posts"]:
            lines.append(f"- [{section['title']}](#{section['anchor']})")

        lines.extend(
            [
                "",
                "## Что входит",
                "",
            f"- Тематическая рамка: {theme['lead']}",
            f"- Всего материалов: {theme['count']}",
            "- Примечание: темы частично пересекаются; один и тот же пост может входить в несколько методичек.",
            "- Формат: ссылки ведут к полной книжной версии экспорта по якорям отдельных заметок.",
            "",
                "## Материалы книги",
                "",
            ]
        )

        for section in theme["sectioned_posts"]:
            lines.extend([f"### {section['title']}", ""])
            for idx, post in enumerate(section["posts"], start=1):
                lines.append(
                    f"{idx}. [{post['title']}](telegram_export.html#{post['note_id']}) "
                    f"({post['date']}; [Telegram]({post['telegram_link']}))"
                )
            lines.append("")

        rendered[f"alchemy_soul_guide_{theme['slug']}.md"] = "\n".join(lines) + "\n"

    index_lines = [
        "# Тематические методички по паблику «Алхимия души»",
        "",
        "Структура методичек переделана по тематикам, а не по прежним крупным разделам книжного экспорта. "
        "Теперь материалы сгруппированы в восемь более узких книг: гомеопатические основы, карточки препаратов, две линии натуропатии, две линии Баха и две линии нейроподхода.",
        "",
        "## Темы",
        "",
    ]

    for theme in themes:
        html_name = f"alchemy_soul_guide_{theme['slug']}.html"
        index_lines.extend(
            [
                f"### {theme['title']}",
                "",
                theme["summary"],
                "",
                f"- Фокус: {theme['lead']}",
                f"- Материалов: {theme['count']}",
                f"- Открыть: [{html_name}]({html_name})",
                "",
            ]
        )

    index_lines.extend(
        [
            "## Дополнительно",
            "",
            "- Полная книжная версия: [telegram_export.html](telegram_export.html)",
            "- Исходный Telegram-экспорт: [page.html](page.html)",
            "- Темы могут пересекаться: если пост относится сразу к двум линиям, он включается в обе методички.",
            "",
        ]
    )
    rendered["alchemy_soul_guides_index.md"] = "\n".join(index_lines)

    return rendered


def inline_markup(text: str) -> str:
    escaped = html.escape(text)
    escaped = re.sub(r"`([^`]+)`", r"<code>\1</code>", escaped)
    escaped = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", escaped)
    escaped = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", escaped)

    def replace_link(match: re.Match[str]) -> str:
        label = html.escape(match.group(1))
        href = html.escape(html.unescape(match.group(2)), quote=True)
        return f'<a href="{href}">{label}</a>'

    return re.sub(r"\[([^\]]+)\]\(([^)]+)\)", replace_link, escaped)


def render_markdown_html(text: str, title: str, lead: str) -> str:
    lines = text.splitlines()
    if lines and lines[0].startswith("# "):
        lines = lines[1:]
        while lines and not lines[0].strip():
            lines = lines[1:]
    if lines and lines[0].strip() == lead.strip():
        lines = lines[1:]
        while lines and not lines[0].strip():
            lines = lines[1:]

    out: list[str] = []
    paragraph: list[str] = []
    list_type: str | None = None

    def flush_paragraph() -> None:
        nonlocal paragraph
        if paragraph:
            content = " ".join(part.strip() for part in paragraph if part.strip())
            out.append(f"<p>{inline_markup(content)}</p>")
            paragraph = []

    def flush_list() -> None:
        nonlocal list_type
        if list_type:
            out.append(f"</{list_type}>")
            list_type = None

    for line in lines:
        stripped = line.strip()

        if not stripped:
            flush_paragraph()
            flush_list()
            continue

        heading = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if heading:
            flush_paragraph()
            flush_list()
            level = len(heading.group(1))
            text_value = heading.group(2).strip()
            anchor = slugify(text_value)
            out.append(f'<h{level} id="{anchor}">{inline_markup(text_value)}</h{level}>')
            continue

        ordered = re.match(r"^\d+\.\s+(.*)$", stripped)
        if ordered:
            flush_paragraph()
            if list_type != "ol":
                flush_list()
                list_type = "ol"
                out.append("<ol>")
            out.append(f"<li>{inline_markup(ordered.group(1))}</li>")
            continue

        unordered = re.match(r"^[-*]\s+(.*)$", stripped)
        if unordered:
            flush_paragraph()
            if list_type != "ul":
                flush_list()
                list_type = "ul"
                out.append("<ul>")
            out.append(f"<li>{inline_markup(unordered.group(1))}</li>")
            continue

        flush_list()
        paragraph.append(stripped)

    flush_paragraph()
    flush_list()
    content = "\n".join(out)

    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <style>
    :root {{
      --bg: #f2eee6;
      --paper: #fffdfa;
      --ink: #1f1c18;
      --muted: #6a6258;
      --line: #d9cdbd;
      --accent: #6d3f1f;
      --accent-soft: #efe3d3;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: Verdana, Tahoma, Arial, sans-serif;
      background:
        radial-gradient(circle at top left, #f8f1e8 0, #f2eee6 46%, #ece6dc 100%);
      color: var(--ink);
      line-height: 1.6;
    }}
    main {{
      width: min(980px, calc(100vw - 24px));
      margin: 0 auto;
      padding: 24px 0 56px;
    }}
    .page {{
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 24px;
      padding: 28px;
      box-shadow: 0 24px 60px rgba(73, 49, 29, 0.08);
    }}
    h1 {{
      margin: 0 0 8px;
      font-size: clamp(32px, 4.2vw, 48px);
      line-height: 1.08;
    }}
    h2 {{
      margin-top: 28px;
      font-size: 26px;
      line-height: 1.15;
    }}
    h3 {{
      margin-top: 22px;
      font-size: 20px;
      line-height: 1.2;
    }}
    p, li {{ max-width: 74ch; }}
    p {{ font-size: 17px; }}
    ol, ul {{ padding-left: 22px; }}
    li {{ margin-bottom: 8px; }}
    a {{
      color: var(--accent);
      text-decoration: none;
      border-bottom: 1px solid #c6af95;
    }}
    .lead {{
      margin: 0 0 22px;
      font-size: 18px;
      color: var(--muted);
      max-width: 72ch;
    }}
    .nav {{
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 18px;
    }}
    .nav a {{
      padding: 8px 12px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent);
      border-bottom: 0;
    }}
    code {{
      padding: 0.15em 0.38em;
      border-radius: 6px;
      background: #f4ede3;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }}
    @media (max-width: 760px) {{
      main {{ width: min(100vw - 16px, 980px); padding-top: 12px; }}
      .page {{ padding: 18px 16px 24px; border-radius: 18px; }}
      p {{ font-size: 16px; }}
    }}
  </style>
</head>
<body>
  <main>
    <article class="page">
      <nav class="nav">
        <a href="alchemy_soul_guides.html">Все методички</a>
        <a href="telegram_export.html">Полная книжная версия</a>
      </nav>
      <h1>{html.escape(title)}</h1>
      <p class="lead">{html.escape(lead)}</p>
      {content}
    </article>
  </main>
</body>
</html>
"""


def render_theme_html(theme: dict) -> str:
    toc_items = "\n".join(
        f'<li><a href="#{section["anchor"]}">{html.escape(section["title"])}</a></li>'
        for section in theme["sectioned_posts"]
    )

    sections_html: list[str] = []
    for section in theme["sectioned_posts"]:
        articles = "\n".join(post["article_html"] for post in section["posts"])
        sections_html.append(
            f"""
<section class="book-section" id="{section['anchor']}">
  <h2>{html.escape(section['title'])}</h2>
  {articles}
</section>
""".strip()
        )

    content = "\n".join(sections_html)

    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(theme['title'])}</title>
  <style>
    :root {{
      --paper: #f3f1ec;
      --sheet: #fffdfa;
      --ink: #222222;
      --muted: #6d6d6d;
      --line: #dddddd;
      --accent: #8b4513;
      --accent-soft: #f0e2cf;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: Verdana, Tahoma, Arial, sans-serif;
      color: var(--ink);
      background: var(--paper);
      line-height: 1.5;
    }}
    main {{
      width: min(860px, calc(100vw - 28px));
      margin: 20px auto 56px;
    }}
    .page-intro, .toc, .post, .book-section {{
      background: var(--sheet);
      border: 1px solid var(--line);
      border-radius: 20px;
    }}
    .page-intro, .toc, .book-section {{
      padding: 24px 24px 26px;
      margin-bottom: 22px;
    }}
    .nav {{
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 18px;
    }}
    .nav a {{
      padding: 8px 12px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent);
      text-decoration: none;
    }}
    h1 {{
      margin: 0 0 10px;
      font-size: clamp(30px, 4vw, 44px);
      line-height: 1.08;
    }}
    h2 {{
      margin: 0 0 14px;
      font-size: clamp(24px, 3vw, 34px);
      line-height: 1.12;
    }}
    .page-intro p, .toc p {{
      margin: 0;
      font-size: 17px;
      max-width: 70ch;
      color: var(--muted);
    }}
    .toc ul {{
      margin: 14px 0 0;
      padding-left: 20px;
    }}
    .toc li {{ margin-bottom: 8px; }}
    .toc a {{
      color: var(--accent);
      text-decoration: none;
      border-bottom: 1px solid #cdb08f;
    }}
    .book-section > h2 {{
      border-bottom: 1px solid var(--line);
      padding-bottom: 12px;
      margin-bottom: 18px;
    }}
    .post {{
      margin: 0 0 20px;
      padding: 24px 24px 26px;
    }}
    .post:last-child {{ margin-bottom: 0; }}
    .post h4 {{
      margin: 0 0 8px;
      font-size: clamp(22px, 2.7vw, 30px);
      line-height: 1.18;
    }}
    .meta {{
      display: flex;
      gap: 10px 18px;
      flex-wrap: wrap;
      margin-bottom: 16px;
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }}
    .lead-figure {{
      float: right;
      width: min(32%, 220px);
      margin: 2px 0 14px 22px;
    }}
    .lead-figure img {{
      width: 100%;
      aspect-ratio: 4 / 5;
      object-fit: cover;
      display: block;
      border: 1px solid var(--line);
      background: #efefef;
    }}
    .text p {{
      margin: 0 0 14px;
      font-size: 18px;
      max-width: 66ch;
    }}
    .post::after {{
      content: "";
      display: block;
      clear: both;
    }}
    @media (max-width: 760px) {{
      main {{ width: min(100vw - 16px, 860px); margin-top: 12px; }}
      .page-intro, .toc, .book-section, .post {{ padding: 18px 16px 20px; border-radius: 16px; }}
      .lead-figure {{
        float: none;
        width: 100%;
        max-width: 340px;
        margin: 8px 0 16px;
      }}
      .text p {{ font-size: 16px; max-width: none; }}
    }}
  </style>
</head>
<body>
  <main>
    <section class="page-intro">
      <nav class="nav">
        <a href="alchemy_soul_guides.html">Все методички</a>
        <a href="telegram_export.html">Полная книжная версия</a>
      </nav>
      <h1>{html.escape(theme['title'])}</h1>
      <p>{html.escape(theme['summary'])}</p>
    </section>
    <section class="toc">
      <h2>Ключевое оглавление</h2>
      <p>{html.escape(theme['lead'])}</p>
      <ul>
        {toc_items}
      </ul>
    </section>
    {content}
  </main>
</body>
</html>
"""


def render_index_html(themes: list[dict]) -> str:
    cards: list[str] = []
    for idx, theme in enumerate(themes, start=1):
        html_name = f"alchemy_soul_guide_{theme['slug']}.html"
        cover = (
            f'<img class="cover-image" src="{html.escape(theme["cover_image"], quote=True)}" alt="{html.escape(theme["title"])}">'
            if theme.get("cover_image")
            else '<div class="cover-fallback"></div>'
        )
        cards.append(
            f"""      <a class="card" href="{html_name}">
        <div class="cover {theme['cover_class']}">
          {cover}
          <div class="cover-overlay">
            <div class="cover-mark">Алхимия души</div>
            <div class="cover-title">{html.escape(theme['title'])}</div>
          </div>
        </div>
        <div class="card-body">
          <div class="eyebrow">Методичка {idx}</div>
          <h2>{html.escape(theme['title'])}</h2>
          <p class="meta">{format_count(theme['count'], 'материал', 'материала', 'материалов')}</p>
          <p class="desc">{html.escape(theme['summary'])}</p>
        </div>
      </a>"""
        )

    cards_html = "\n".join(cards)

    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Тематические методички по паблику «Алхимия души»</title>
  <style>
    :root {{
      --bg: #efe6d6;
      --paper: #fbf7f0;
      --card: rgba(255, 252, 246, 0.96);
      --ink: #241b16;
      --muted: #6d5d51;
      --line: #d9c7b0;
      --accent: #8b4513;
      --accent-soft: #c97d3a;
      --shadow: 0 18px 42px rgba(77, 49, 26, 0.12);
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: Verdana, Tahoma, Arial, sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top, rgba(255, 255, 255, 0.55), transparent 36%),
        linear-gradient(180deg, #f6efe4 0%, var(--bg) 100%);
    }}
    main {{ max-width: 1200px; margin: 0 auto; padding: 36px 20px 72px; }}
    .hero {{
      background: linear-gradient(135deg, rgba(116, 66, 29, 0.94), rgba(156, 89, 37, 0.88));
      color: #fff7ee;
      border-radius: 28px;
      padding: 32px 28px;
      box-shadow: var(--shadow);
    }}
    .hero h1 {{ margin: 0 0 12px; font-size: clamp(32px, 4vw, 48px); line-height: 1.05; }}
    .hero p {{ margin: 0; max-width: 860px; line-height: 1.6; color: rgba(255, 247, 238, 0.92); }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; margin-top: 28px; }}
    .card {{
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 22px;
      text-decoration: none;
      color: inherit;
      box-shadow: var(--shadow);
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    }}
    .card:hover {{ transform: translateY(-3px); border-color: #cba27a; box-shadow: 0 22px 46px rgba(77, 49, 26, 0.16); }}
    .cover {{
      aspect-ratio: 4 / 3;
      width: 100%;
      position: relative;
      border-bottom: 1px solid var(--line);
      color: #fff7ee;
      overflow: hidden;
    }}
    .cover-image, .cover-fallback {{
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
      background: #d6c4af;
    }}
    .cover-overlay {{
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 10px;
      padding: 18px;
      background: linear-gradient(180deg, rgba(20, 16, 12, 0.08) 0%, rgba(36, 22, 14, 0.72) 100%);
    }}
    .cover-mark {{
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: rgba(255, 247, 238, 0.82);
    }}
    .cover-title {{
      font-size: 24px;
      line-height: 1.15;
      font-weight: 700;
      max-width: 15ch;
      text-wrap: balance;
    }}
    .cover-homeopathy-foundations {{ background: linear-gradient(135deg, #8a5c33, #b57b44 58%, #d6b474); }}
    .cover-homeopathy-remedies {{ background: linear-gradient(135deg, #7c4b27, #a86437 58%, #d39a62); }}
    .cover-naturopathy-hormones {{ background: linear-gradient(135deg, #48643f, #668659 58%, #a8c78c); }}
    .cover-naturopathy-oils {{ background: linear-gradient(135deg, #4b7047, #679266 58%, #b7d8a8); }}
    .cover-bach-foundations {{ background: linear-gradient(135deg, #6c4d7e, #926eae 58%, #c7b0dd); }}
    .cover-bach-cards {{ background: linear-gradient(135deg, #5c4575, #8360a4 58%, #b69bd7); }}
    .cover-brain-theory {{ background: linear-gradient(135deg, #355a73, #4a7f9c 58%, #93c2d8); }}
    .cover-brain-protocols {{ background: linear-gradient(135deg, #2f5169, #3f7292 58%, #84b5cf); }}
    .card-body {{ padding: 18px 18px 20px; }}
    .eyebrow {{ margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent-soft); }}
    .card h2 {{ margin: 0 0 10px; font-size: 22px; line-height: 1.2; }}
    .meta {{ margin: 0 0 12px; color: var(--muted); font-size: 14px; }}
    .desc {{ margin: 0; line-height: 1.58; color: #382d26; }}
    .links {{ margin-top: 36px; padding: 22px 24px; background: var(--paper); border: 1px solid var(--line); border-radius: 22px; box-shadow: var(--shadow); }}
    .links h2 {{ margin: 0 0 12px; font-size: 24px; }}
    .links ul {{ margin: 0; padding-left: 20px; line-height: 1.8; }}
    a {{ color: var(--accent); }}
    @media (max-width: 720px) {{
      main {{ padding: 20px 14px 52px; }}
      .hero {{ padding: 24px 20px; border-radius: 22px; }}
      .card h2 {{ font-size: 20px; }}
      .cover-title {{ font-size: 22px; }}
    }}
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <h1>Тематические методички по паблику «Алхимия души»</h1>
      <p>Структура методичек оптимизирована и расширена до восьми книг. Большие тематические корзины разрезаны на более логичные блоки: отдельно основы и карточки гомеопатии, отдельно две линии натуропатии, отдельно практика и карточки Баха, отдельно теория мозга и прикладные нейропротоколы. Темы частично пересекаются: если один пост относится сразу к двум линиям, он включается в обе книги.</p>
    </section>
    <section class="grid" aria-label="Методички">
{cards_html}
    </section>
    <section class="links">
      <h2>Дополнительно</h2>
      <ul>
        <li><a href="telegram_export.html">Полная книжная версия экспорта</a></li>
        <li><a href="page.html">Исходный Telegram-экспорт паблика</a></li>
        <li><a href="alchemy_soul_guides_index.md">Markdown-версия индекса методичек</a></li>
        <li><a href="generate_alchemy_soul_guides.py">Скрипт пересборки методичек</a></li>
      </ul>
    </section>
  </main>
</body>
</html>
"""


def write_outputs() -> None:
    posts, sections = parse_posts()
    themes = build_theme_posts(posts, sections)
    markdown_files = render_markdown(themes)

    for filename, text in markdown_files.items():
        (ROOT / filename).write_text(text, encoding="utf-8")

    for theme in themes:
        md_name = f"alchemy_soul_guide_{theme['slug']}.md"
        html_name = f"alchemy_soul_guide_{theme['slug']}.html"
        page = render_theme_html(theme)
        (ROOT / html_name).write_text(page, encoding="utf-8")

    index_html = render_index_html(themes)
    (ROOT / "alchemy_soul_guides.html").write_text(index_html, encoding="utf-8")


if __name__ == "__main__":
    write_outputs()
