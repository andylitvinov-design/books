# Magic Mirror · три страницы создания видео · 22 ноября 2026

**Канонический маршрут:** `/{en,ru,es}/holistic-support/mandala` → мобильный Video / Magic Mirror. Утверждённое последовательное решение владельца: фото-карточки направлений, отдельный экран формата и существующий Topic; никакого нового видеоредактора.

1. **Landing** (`data-hh-mirror-screen="landing"`): «Видео для себя», «Видео для других», «Видео для работы». Каждая вертикальная карточка открывает Format с `scope=me/present/business`, без зелёной кнопки внизу.
2. **Format** (`data-hh-mirror-screen="format"`): три горизонтальные фото-строки, каждая целиком кнопка — Simple Video 250 XP, Live Photo 500 XP (мятный выделенный вариант), Cinematographic Video 2 000 XP. Выбор сохраняет `MirrorResolution.videoFormat` (`basic/pro/vip`) и открывает Topic. Back возвращает к Landing. Ни списания, ни запроса к HeyGen на выбор.
3. **Topic** (`data-hh-mirror-screen="topic"`): прежнее компактное поле цели, пример видео, 2×2 направления, локальная классификация и существующее разрешённое продолжение в Ideas/Script/Montage. Back возвращает к Format с сохранёнными `scope` и `videoFormat`.

EN/RU/ES и 320/354/390/430 px; использовать существующие лицензированные изображения/плеер, не смешивать CRM и частные материалы. Действующий серверный XP/consent/rights gate — источник истины; 2 000 XP на экране пока лишь планирование, а не доказательство работающего тарифа.

**Acceptance:** исходные ошибки WebKit связаны с ожиданием удалённой кнопки Plan/Back в `scripts/benchmarking/first-video-live-export.mjs`. Сценарий теперь проходит именно через видимые Landing → Format → Topic → Plus, затем обязан доказать реальный 30-секундный MP4/AAC, скачанный файл, аудио и движение; не обходить проверку. Core + Mandala, Public Services, WebKit, hh-merge-check на точном HEAD; защищённый merge; затем только штатная почасовая Vercel-публикация, совпадающий READY/SHA и проверка реальных мобильных кликов.

**Ограничение доказательств:** готовый код и source-contract не являются скриншотным совпадением или подтверждённым LIVE. Физический Safari/iPhone и пиксельные overlay-измерения проводятся отдельно. No extra spend / no manual deploy.
