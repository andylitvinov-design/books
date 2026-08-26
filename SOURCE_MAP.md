# SOURCE MAP

## Основное правило

После первичного копирования для анализа, правок и сборки использовать только локальные копии из этого проекта.

## Книга 1: Алхимия души

- Внешний источник: `/Users/andriilitvinov/projects/Алхимия/Книга Алхимия души/alchemy_soul_guides.html`
- Локальная копия-источник: `/Users/andriilitvinov/projects/books/source-books/book-1-alchemy-soul/alchemy_soul_guides.html`
- Дополнительные локальные HTML книги:
  - `alchemy_soul_guide_homeopathy_foundations.html`
  - `alchemy_soul_guide_homeopathy_remedies.html`
  - `alchemy_soul_guide_naturopathy_hormones.html`
  - `alchemy_soul_guide_naturopathy_oils.html`
  - `alchemy_soul_guide_bach_foundations.html`
  - `alchemy_soul_guide_bach_cards.html`
  - `alchemy_soul_guide_brain_theory.html`
  - `alchemy_soul_guide_brain_protocols.html`
  - `alchemy_soul_guide_services_workflow.html`
- Привязанные ресурсы:
  - `/Users/andriilitvinov/projects/books/source-books/book-1-alchemy-soul/media/`
  - локально сохранены также `telegram_export.html`, `page.html`, `alchemy_soul_guides_index.md`, `generate_alchemy_soul_guides.py`
- Выбор источника:
  - выбран полный индекс `alchemy_soul_guides.html`, потому что `alchemy_soul_guides_links.html` в проекте `books` был только упрощённым ссылочником на внешние абсолютные пути и не годится как основной источник для автономной сборки.

## Книга 2: Даосская алхимия

- Найденные варианты индекса:
  - `/Users/andriilitvinov/projects/books/dao-books-site/index.html`
  - `/Users/andriilitvinov/projects/Книга Даоская Алхимия/index_daos_books.html`
  - `/Users/andriilitvinov/projects/Алхимия/daos-books/index_daos_books.html`
  - `/Users/andriilitvinov/projects/dao_book_open/index_daos_books.html`
- Выбранный внешний/базовый источник для локальной зоны:
  - уже существующий в текущем проекте `/Users/andriilitvinov/projects/books/dao-books-site/index.html`
- Локальная копия-источник:
  - `/Users/andriilitvinov/projects/books/source-books/book-2-dao-books/dao_books_index.html`
- Почему выбран именно этот вариант:
  - он уже лежал в текущем проекте рядом со всеми нужными HTML и папкой `photos/`;
  - его содержимое соответствует найденному `index_daos_books.html`, но локальный вариант безопаснее и стабильнее, потому что не требует новых внешних зависимостей;
  - для ясности добавлена каноническая копия `dao_books_index.html`, чтобы не использовать неоднозначное имя `index.html` как основной источник.
- Дополнительные локальные HTML книги:
  - `dao_alchemy_intro.html`
  - `dao_tradition_temples_symbols.html`
  - `dao_magic_basics.html`
  - `dao_talismans_symbols.html`
  - `dao_rituals_altars.html`
  - `dao_yijing_predictions.html`
  - `dao_healing_basics.html`
  - `dao_wuxing_five_elements.html`
  - `dao_wuxing_model_steps.html`
  - `dao_practicum_cases_remedies.html`
  - дополнительные разделы: `dao_wuxing_steps.html`, `dao_model_mini_guide.html`, `book_build_guide.html`, `agents_config.html`
- Привязанные ресурсы:
  - `/Users/andriilitvinov/projects/books/source-books/book-2-dao-books/photos/`

## Книга 3: Maya Tradition

- Первичный источник: локальный экспорт Telegram-канала `mayaismagic`, сохранённый в `source-books/book-3-maya-tradition/raw/`.
- Канонический экспорт: `raw/messages.html`; изображения: `raw/photos/`; контрольный список ресурсов: `raw/media-manifest.json`.
- Исходниковая редакционная рукопись: `manuscript/MAYA_TRADITION.md`; карта глав и покрытие: `manuscript/CHAPTER_MAP.md`, `manuscript/COVERAGE.md`.
- Reading edition: `source-books/book-3-maya-tradition/outputs/Maya_Tradition_Methodology.html`.
- Печатные издания: `outputs/Maya_Tradition_Methodology.docx` и `outputs/Maya_Tradition_Methodology.pdf`.
- Сборщик `build_maya_book.py` читает только локальные первичные файлы и не изменяет экспорт или рукопись.

## Локальная структура работы

- Исходники: `/Users/andriilitvinov/projects/books/source-books/`
- Сборка: `/Users/andriilitvinov/projects/books/build/`
- Общие артефакты: `/Users/andriilitvinov/projects/books/assets/`
- Финальный результат: `/Users/andriilitvinov/projects/books/final/`

## Статус путей

- Для HTML в `source-books/` проверены `href` и `src`: зависимостей на `file://`, `/Users/...` и старые локальные HTTP-пути в атрибутах ресурсов не осталось.
- Текстовые упоминания старых путей внутри справочных статей (`book_build_guide.html`, `agents_config.html`, `generate_alchemy_soul_guides.py`) сохранены как исторический контент и не используются как рабочие пути сборки.
- Ручная сверка live-паблика `https://t.me/psychic_alchemy` на 2026-04-28 показала новые публикации `1014–1023`; из них в методички добавлены только уникальные по смыслу материалы (`1015`, `1018`, `1019`, `1021`), а повторы уже существующих карточек и заметок оставлены без дублирования.
