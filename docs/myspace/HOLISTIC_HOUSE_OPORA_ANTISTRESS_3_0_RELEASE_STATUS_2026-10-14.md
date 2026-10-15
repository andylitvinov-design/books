# ОПОРА · Антистресс 3.0 — статус реализации и публикации
**Дата фиксации:** 14.10.2026 · **Ответственный контур:** Holistic House / MySpace.
**Источник содержания:** [методика 14 дней](./HOLISTIC_HOUSE_OPORA_ANTISTRESS_OUTCOME_ALIGNED_14_DAY_CURRICULUM_V3_2026-10-14.md) и [каноническая батарея](./HOLISTIC_HOUSE_OPORA_ANTISTRESS_MEASUREMENT_BATTERY_CANONICAL_V2_2026-10-14.md).

## Что реально выполнено
1. **Код слит в production branch** `codex/public-book-library`: PR [#541](https://github.com/andylitvinov-design/books/pull/541), merge commit `e132856a1a3875c112509a069ce8d6a67347d841`. Это GitHub merge, **не свидетельство что сайт обслуживает эту версию**.
2. **Новая отдельная версия** `hh-antistress-outcomes-v3-20261014` — 14 RU/EN уроков, 7 пар навыков, отдельные безопасные инструкции, короткая/нейтральная практика, измерительные направления. Для новых циклов программы с точным pack `stress`; старые V3/V4 IDs и данные не мигрируют молча.
3. **Семь мини-проверок** сохраняются в owner-scoped `growth_sessions.signals` как реальный выбор (в том числе с подсказкой); не новая психологическая диагностическая оценка. Карта курса отображает знакомство, guided attempt, new context choice, no data.
4. Новая программа избегает повторного обязательного 0–10 check-in соседних слайдов; остаются отдельные допустимые проверки состояния, Stop и нейтральный выход. Рискованные trauma processing/EMDR/exposure техники не внедрены.
5. Публичная секция семи навыков оформлена RU/EN/ES; сами новые занятия RU/EN. Задача не включает клинический GAD-7 русский перевод или изменение существующей серверной батареи пяти тестов.
6. **CI после PR #541:** unit tests, lint, TypeScript, Next build, database, landing browser Chromium+WebKit, public services, full synthetic encrypted-store/owner acceptance — SUCCESS. В одном долгом отдельном browser runner Chromium найден устаревший assert unrelated `relationships` expecting 3 actions, while actual public page legitimately includes **4** (Browse full catalog). В PR [#543](https://github.com/andylitvinov-design/books/pull/543) обновлено точное ожидание 4 действий и href для каталога; merge commit `9ed5761b75d56eff5b9dea7357797d4bab5c7e73`. Результат полного CI на фиксе проверять отдельно, не утверждать PASS до завершения.

## Обязательный внешний блокер live-деплоя
На Vercel team `super10`, Hobby-плане `codex-public-book-library`, прямой запрос production Git deployment на merge SHA `e132856a1a3875c112509a069ce8d6a67347d841` вернул:
**HTTP 402 payment_required: api-deployments-free-per-day; exceeded 100 free daily deployments; retryAfter 86400 seconds (24 часа).**
Нельзя автоматически менять тариф или обходить дневной лимит. До повторной успешной сборки и `READY` с обновлённым `githubCommitSha` и alias `holistichouse.vercel.app` статус **NOT YET VERIFIED LIVE**. Старый сайт остаётся на ранее готовом deployment; факт GitHub merge не равен публикации.

## Следующие необходимые проверки после разблокировки Vercel
- Сверить последнюю production branch SHA (она может включать параллельные PR), создать Git-linked production deploy для `codex-public-book-library` или убедиться что Vercel автоматически собрал свежий commit.
- Дождаться `READY`, проверить настоящий `holistichouse.vercel.app` и RU/EN страницы курсов, ссылки CTA, desktop/mobile, аудио/Stop и безопасный выход.
- На **отдельном разрешённом тестовом аккаунте**, не на реальном клиенте, пройти стартовый набор и день 1, проверить локальную дату, запись owner-scoped, карту семи навыков, idempotent save и доступ к T14 только по отдельной допустимой дате.
- Подтвердить валидный GAD-7 только в допущенном языке. Нельзя выдумывать реальную динамику недельных шкал или утверждать клиническую эффективность без исследовательского контроля.

**Правило статуса:** прошедшие CI/код, GitHub merge, Vercel production READY и реальная браузерная проверка сайта — четыре РАЗНЫХ стадии. Следующий исполнитель должен честно проверять каждую и не заявлять «сайт обновлён» только на основании merge.
