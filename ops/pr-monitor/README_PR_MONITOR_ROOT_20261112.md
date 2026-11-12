# PR Monitor: исправление главной страницы и приёмки релизов (12.11.2026)

**Владелец прислал скриншот:** при открытии `https://holistic-house-pr-monitor.vercel.app/` отображается чёрная страница «Agent Commander · PR Monitoring», а не графический монитор. Сервер возвращал 650-байтовый `index.html` с `<meta http-equiv="refresh" content="0;url=/pr-monitor.html">`. Клиентский refresh не сработал на iPhone Safari. При этом `/pr-monitor.html` уже содержал весь 7066-байтовый интерфейс после PR #4408, а 54/54 его CSS/JS были восстановлены в PR #4409.

## Экстренное исправление LIVE без пересборки

В проекте Vercel `holistic-house-pr-monitor` добавлены серверные маршруты `/` и `/index.html` с HTTP **307** на `/pr-monitor.html`, без JavaScript/meta refresh. Сначала проверена staged-версия, после чего опубликована версия маршрутов `2bc6a996-3d70-465d-b22b-8ef123b1463a` (31 правило). На публичном адресе `/`, `/index.html`, `/pr-monitor.html` возвращают конечный полноценный HTML, API `pr-three-kpis` и `pr-merge-speed` — 200 с правильной схемой. Полная ранее проверенная основная Vercel-сборка сохранена, автоматическое переключение неполных сборок оставлено выключенным.

## Защита будущих публикаций в исходниках

- `ops/pr-monitor/index.html` теперь **побайтно равен** `ops/pr-monitor/pr-monitor.html`. Если маршруты Vercel в будущем будут сброшены, корневой URL самостоятельно отдаёт тот же полноценный HTML; старой страницы с ссылкой и meta refresh больше нет.
- `scripts/verify-release-candidate.cjs` теперь принимает только полноценный first-paint монитор на `/`, `/index.html` и `/pr-monitor.html` или разрешает строго проверенный серверный **307/308** с первых двух путей на тот же `/pr-monitor.html`. Отвергает HTML meta refresh, «Загружаю проверенный монитор», пустые компоненты, чужой origin и неизвестные API схемы; динамически проверяет реальные JS/CSS-ссылки в полноценной странице, а не только в старом boot JS.
- Проверка полного локального source bundle дополнительно отклоняет несовпадающие `index.html` и `pr-monitor.html`. Тесты обновлены: 9 проверок, в том числе 650-байтовый старый index, корректный 307 и внешний redirect.

Тесты: `node --test ops/pr-monitor/scripts/verify-release-candidate.test.cjs` внутри репозитория. Control-plane merge **не равен** новой Vercel-публикации. Для следующих полных деплоев использовать существующую проверку полного source bundle, exact-URL candidate gate и отдельное подтверждение LIVE. Не включать новые платные сервисы, CI-workflow, cron или повторные волны для пробуждения CI.

Owner contract: `GLOBAL_PR_ONE_PUBLISH_V1`.