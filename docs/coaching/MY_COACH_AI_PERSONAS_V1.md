# My Coach — каталог AI-персонажей v1

Дата: 2026-11-10. Репозиторий: \`andylitvinov-design/books\`.
Источник реализации: существующий Holistic House / Coaching Lounge. Нового приложения, базы данных, клиентского кабинета, runner или модели-исполнителя не создаём.

## Пользовательская цепочка

1. Мобильный пункт **My Coach** и пункт основного меню ведут на \`/{en|ru|es}/my-coach\`, а не в каталог людей.
2. Клиент выбирает из восьми **вымышленных AI-персонажей**: Mira (бережность), Max (действия), Sofia (отношения), Alex (карьера и бизнес), Lea (смысл), Noah (привычки), Iris (ресурсы), Ray (творчество).
3. На одной компактной странице доступны поиск по теме/методике, тематические фильтры, избранное только по ID в браузере, профиль, сфера применения, стартовый вопрос, методики и регулируемый тон.
4. Настройки: теплота/прямота (1–5), темп (slow/balanced/fast), глубина (light/balanced/deep). Любое значение валидируется по белому списку. Неизменяемое правило — один вопрос на реплику. Нет настроек «отключить безопасность».
5. Кнопка **Начать коучинг-сессию** ведёт в текущую \`/{locale}/coaching\`, сохраняя в URL **только** \`coach\` и четыре несекретных параметра поведения. Никакие личные ответы/цели не передаются через URL.
6. Существующий reviewed coaching catalog, session runner, GROW/WOOP/etc, возрастные ограничения и сохранение остаются неизменны. При наличии \`coach\` сессия показывает выбранный профиль и персонализирует только *необязательный* авторский follow-up по стадии. Утверждённые вопросы и план действий не переписываются.
7. Каталог реальных людей остаётся в \`/{locale}/masters\` и доступен как «Реальные специалисты».

## Registry / Persona Policy

Единственный источник: \`lib/coaching/persona-registry.mjs\`:

- \`COACH_PERSONAS\` — публичные редакционные поля, локализация RU/EN/ES, тематики, оригинальные примеры по стадиям GROW;
- \`normalizeCoachSettings\` и \`resolveCoachSelection\` — строгая нормализация без произвольных инструкций;
- \`coachStagePrompt\` — адаптация авторского follow-up, без вызова внешней AI-модели;
- \`buildCoachBehaviorPolicy\` — версия персоналии, допустимые методы и жёсткие инструкции безопасности для будущего Coaching Brain. **Пока не вызывается LLM**;
- \`personaMethodFit\` — дополнительное, объяснимое ранжирование опубликованных методик, без классификации человека или диагноза.

Обязательные правила policy: явно заявлять, что AI-персонаж вымышленный; не выдавать его за человека/клинициста; один вопрос; право пропуска и паузы; запрет диагнозов, давления и выдуманных компетенций; прекращение обычного коучинга при непосредственном риске; память только с отдельным согласием; действия — лишь после подтверждения клиента.

## Ограничения текущего релиза

Реальный генеративный AI-диалог, двухсторонний голос, анимированный аватар, передача personaSnapshot в зашифрованную private session envelope и отчёт My Coaching Plan **не подключены**. Не выдавать детерминированную сессию за LLM-коуча. Подключение этих функций должно проходить через утверждённые Coaching Brain / Session Gateway, Supabase Auth, consent, квоты и safety/QA, без создания отдельного chat API или параллельного session store.

Граница для будущей интеграции: \`personaId\` + \`version\` + серверная \`normalizeCoachSettings\` + \`buildCoachBehaviorPolicy\`. Не доверять системным инструкциям, переданным с клиента.

## Проверка

- \`node --test tests/my-coach-personas.test.mjs tests/my-coach-navigation.test.mjs tests/unified-six-dock.test.mjs\`
- \`npm run test:coaching:release\` (интегрировано в prebuild)
- UI browser: EN/RU/ES \`/my-coach\` → выбор Max → изменённая настройка → \`/coaching?coach=max...\` → отображение «Выбранный AI-коуч» → авторский follow-up с персональным prompt; параллельно \`/masters\` продолжает показывать людей.
- Мобильный док на 320/390/430 px и клавиатурная доступность карточек, select/range, избранного и CTA.

**Не считать LIVE** до зелёных обязательных CI, merge в \`codex/public-book-library\` и production-deployment READY.

## Integration release checkpoint (2026-11-10)

- PR #4069 was reconciled with the latest `codex/public-book-library` release base, keeping the independently shipped Coaching Brain and its release tests.
- The existing Services menu remains reachable; My Coach is separate from both Services and the human `/masters` directory.
- The shared mobile Video Studio acceptance script uses the published Ideas → Personalization → advanced Voice controls; no legacy top-level Voice tab is assumed.
- **Publication gate:** never claim LIVE from a passed unit test or source commit alone. Verify the exact PR head in GitHub Actions, then merge and check a READY production Vercel deployment for the resulting merge SHA, including `/ru/my-coach`, `/en/my-coach` and `/es/my-coach`.

### Exact-head CI confirmation

The existing release checks run against the *current* pull-request commit, not against an earlier successful revision. In particular, `hh-specialist` rejects a changed PR head, and the Library/IA/Public Services/browser checks remain required until they finish successfully. A GitHub-side commit or auto-merge setting alone is **not** evidence of deployment.
