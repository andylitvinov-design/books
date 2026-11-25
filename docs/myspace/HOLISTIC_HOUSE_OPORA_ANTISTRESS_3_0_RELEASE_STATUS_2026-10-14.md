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


## Продолжение: схема 14 дней и тесты — PR #546 (14 октября 2026, время работы ~15 октября UTC)

**GitHub:** PR [#546](https://github.com/andylitvinov-design/books/pull/546) **объединён** с production branch, merge commit `131d346c6d98a49110d5e346fb83f9e2ce682043`. Записано: публичный и личный просмотр всех 14 дней (упражнение, ожидаемый результат, восемнадцать ролей экранов, шкалы); новые интерактивные реплики/попытки по слайдам; первоначальные и заключительные Weekly Pulse/GAD-7, опциональный checkpoint T7; защита временных окон ретеста (7 дней Weekly, 14 дней GAD); все восемь сопоставимых недельных показателей, не только три; право Stop и owner-scoped сохранение семи обучающих навыков.

**Языки:** публичные описания RU/EN/ES; интерактивные занятия RU/EN. Добавлен русский перевод GAD-7 с отдельным зарегистрированным definition, но **это авторский перевод Holistic House, не прошедший отдельную психометрическую валидацию**. Запрещены формулировки «официальный валидированный русский GAD-7» и диагнозы по этому инструменту. Предпочитать профессиональную редактуру/подтверждённую опубликованную версию до клинических рекламных заявлений.

**Безопасность существующих данных:** только новые циклы pack `stress` используют `hh-antistress-outcomes-v3-20261014`. Старые циклы остаются на исходной версии. Сессии/психотесты хранятся owner-scoped. Автоматическая публикация клиентских материалов не выполнялась.

**QA:** В объединённом PR unit suite новой учебной логики проходит, однако общий `verify` имел **6 не относящихся к Антистрессу старых snapshot/assertions главной страницы услуг** (ожидание прежнего вида `visibleOffers` и числа фото). Кроме этого, job `unit-build` PR #546 поймал синтаксическую ошибку JSX в `components/app/course-slide-player.jsx` на переходе от блока фразы к основной практике. Ошибка **исправлена отдельным прямым commit** `c0d662bed890cb37ede4cd5cdc32a91ad7f67040` в `codex/public-book-library`. На момент этой записи последующая полноценная production сборка на этом exact SHA **ещё не подтверждена**; приоритет: новая сборка/CI перед запуском.

**Проверка production после merge:** Live `holistichouse.vercel.app` всё ещё указывает на Vercel deployment `dpl_FQT1Rja3azQUgH29F2pfQPo4Hn8P`, `READY`, SHA `4c6ab405b298fa65f473760bfdfd8022eb1470c7` — **старше** кода PR #546. Production не считать обновлённым.

**Внешняя блокировка Vercel:** Прямой авторизованный Git-linked production deployment для `super10` / `prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b` с merge SHA `131d346c...` отклонён Vercel **HTTP 402 `resource_creation_blocked`: "Your Team exceeded our fair use limits and has been blocked."** Это более сильное ограничение, чем предыдущее `api-deployments-free-per-day`. Не заменять новым сервисом, не обходить лимит, не менять тариф и billing автоматически. Требуется действие владельца команды в панели Vercel (Usage/Billing/Support) для разблокировки создания deployment. Команда `super10` — Hobby.

**Следующее действие для любого ассистента:** 1) проверить точный текущий commit production GitHub (с учётом hotfix); 2) запустить защищённую сборку/проверки JSX/TypeScript и отдельно зафиксировать unrelated failing services snapshots, не писать "всё зелёное" без фактов; 3) после разблокировки Vercel запросить Git-linked production build именно актуальной ветки и дождаться `READY`, перепроверить alias и фактический `githubCommitSha`; 4) через независимую браузерную проверку посмотреть `/ru/courses/antistress`, `/en/courses/antistress`, `/ru/app/course` и `/ru/client`, сценарий тестов и день 1 в **синтетическом авторизованном тестовом** аккаунте. Не выполнять тесты над реальными клиентами и не заявлять автоматического клинического эффекта.


## Финальная проверка исходного кода после исправлений: PR #554 и #555

Дополнительное QA проводилось на исходном коде после исправления синтаксиса. Обнаружен и устранён второй дефект: двойной импорт `Course14DayOverview` в `components/public-antistress-landing.tsx` ([PR #554](https://github.com/andylitvinov-design/books/pull/554), **merged** `4e9e5dd4a8787b03def5723a808f7d8bf83290fc`). Затем устранён конфликт TSX-параметра `programId`: у generic `Course14DayOverview` пустой строковый default вместо inferred null, что не меняет логику других программ ([hotfix](https://github.com/andylitvinov-design/books/commit/1d8437ee0d3b55d8107c398ea5e4f883c63ff514)). Регрессионный typed-check ([PR #555](https://github.com/andylitvinov-design/books/pull/555)) **merged** `f30402dbc89912fde76d3d0612e777d8fd84bcaf`.

**Проверено независимо от блокировки Vercel:** На проверенном SHA `2eeb39917ff72fc7a4139011ede4156b2b25beb6` GitHub Actions `unit-build` **SUCCESS**, включая app-тесты, lint, полную production-mode Next.js build, TypeScript typecheck и требуемые регрессии. Обе `course-banner-browser` проверки Chromium/WebKit и `database` также **SUCCESS**. Репозиторный `verify` остаётся **FAILURE** из-за шести старых тестов структуры и количества карточек **главной страницы услуг**, не относящихся к Антистрессу. Остальные долгие браузерные проверки не считать успешными без отдельного финального результата. Слияние выполнено по разрешению владельца «merge anyway», но это не означает «весь CI зелёный».

**Live:** настоящий `holistichouse.vercel.app` последний раз проверен на production `READY` `dpl_FQT1Rja3azQUgH29F2pfQPo4Hn8P` / `githubCommitSha=4c6ab405b298fa65f473760bfdfd8022eb1470c7`. Для нового кода deployment **не создан**, Vercel team `super10` на Hobby возвращает **402 `resource_creation_blocked` (exceeded fair use limits)**. Для публикации владелец команды должен разрешить блокировку Usage/Billing/Support в Vercel; нельзя обходить тариф, автоматически менять платежные настройки или утверждать «уже live». После разблокировки делать Git-linked production build на последнюю SHA `codex/public-book-library`, дожидаться READY, сверять alias, затем выполнять QA страниц и owner-scoped первого занятия на отдельном тестовом аккаунте.
