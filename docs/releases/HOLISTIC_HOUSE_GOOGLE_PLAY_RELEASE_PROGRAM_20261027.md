# Holistic House — программа Android / Google Play (27 октября 2026)

**Owner:** Holistic House / Andrey. **Tracker:** [books #1310](https://github.com/andylitvinov-design/books/issues/1310). **Production branch:** `codex/public-book-library`, NOT `codex/bootstrap-books`. **Product:** `https://holistichouse.vercel.app`.

## 0. Решение и границы

- Использовать **уже существующий** Capacitor 7 клиент `com.holistichouse.app`, один сайт Next.js/Vercel, одну систему логина/CRM/Supabase и EN/RU/ES. PsiAlchemy `app.psialchemy.mobile` — другое приложение, его не менять. Не создавать дублированных app ID, Firebase, кабинетов и БД.
- Google AI Studio → **Play Personal Library** (анонс 13.10.2026) только для личного запуска в поддерживаемых странах, **не для распространения Holistic House клиентам**. Канада в исходном сообщении Google не подтверждена. Для клиентского Play Store нужен обычный выпуск через Play Console.
- **Никаких** публикаций, платных подписок у провайдеров, рекламы, массовых сообщений или загрузок приватных данных без разрешённой конфигурации, необходимости и проверки. Новая CI-сборка ≠ релиз; `200`/mock/push-accepted ≠ успешный E2E.
- Native shell с удалённым HTTPS стартом `/en/app/messages` требует сеть и производственный API. PWA остаётся доступной клиентам независимо от Android release.
- Вводные: [native app runbook](../holistic-house-native-app-2026-10-20.md), [native push/runbook](../holistic-house-native-push-2026-10-20.md), [#1310](https://github.com/andylitvinov-design/books/issues/1310), [messenger-first #2179](https://github.com/andylitvinov-design/books/pull/2179).

## 1. Программа и Definition of Done

### P0 — кодовая подготовка и воспроизводимость (агент, без действий владельца)

- [x] Предыдущие native/PWA релизы и текущие конфиги проанализированы, рабочая ветка production определена; не переиспользовать старые ID/SHA автоматически.
- [x] Обнаружен source drift: `capacitor.holistic-house.config.json` использует `/en/app/messages`, а `scripts/prepare-holistic-house-native.mjs` и контрактный тест всё ещё требуют `/en/app/portrait`. PR: исправить и проверить в CI.
- [ ] PASS: `node --test tests/holistic-house-native-build.test.mjs tests/native-private-message-push.test.mjs tests/native-push-release.test.mjs` с соответствующими Node flags где нужно; Android debug APK/unsigned iOS simulator из `holistic-house-native.yml` собираются, совпадают label/package/start URL. Debug ≠ production.
- [x] Создана **исходная реализация** отдельного вручную запускаемого Android signed AAB pipeline (только trusted production ref, секреты в защищённом CI environment, preflight, SHA256/подпись, артефакт), **без автоматического upload в Play или внешних покупок**; [runbook](./HOLISTIC_HOUSE_PLAY_OPERATOR_RUNBOOK_20261027.md). **Не является проверенным подписанным AAB** до CI, настоящего ключа и Play Console QA.
- [ ] Зафиксировать версию Android `versionCode` monotonically increasing, имя `versionName`. **Google Play после 31.08.2026 требует API 36** для новых Android app submissions; исходный PsiAlchemy native target 35 **не менять**, вместо этого stage-only upgrade `compileSdkVersion/targetSdkVersion 36` и AGP `8.9.1` в ручном Android Play Release Candidate (`Gradle 8.11.1`). До Android device QA поведение Android 16 не заявлять проверенным. См. [официальное требование API 36](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en) и [минимальную AGP 8.9.1 для API36](https://developer.android.com/build/releases/about-agp).
- [ ] PR CI (source checks, native Android, iOS, security checks) и review изменений в signing workflow; **не включать секреты в PR workflows**. Merge только после green gates и ревью.

### P1 — учётная запись Google, ключи и право на распространение (владелец)

- [ ] **Уточнить тип аккаунта до регистрации:** Google Play **требует Organization developer account для health apps**, включая медицинские приложения; Holistic House содержит anti-stress/mental wellness и связанные сведения, поэтому нельзя автоматически выбрать Personal. Для Organization нужен D-U-N-S / юридическое подтверждение. Не предполагаем, что у владельца уже есть зарегистрированное юрлицо. Если подтверждённый правовой статус отсутствует — **STOP публичному Play запуску**, сайт/PWA работают дальше. Уточнить допустимую модель непосредственно в Play Console.
- [ ] После решения правового типа/верификации: [Play Console](https://play.google.com/console/), владелец хранит доступ, нам даёт только минимальные роли. Регистрационный платёж и условия выполняются только владельцем с явным согласием.
- [ ] Android `com.holistichouse.app` в своём Firebase проекте, CI secret `HH_FIREBASE_CONFIG_B64` и server-only `HH_FCM_PROJECT_ID`, `HH_FCM_CLIENT_EMAIL`, `HH_FCM_PRIVATE_KEY` в Vercel **без** `NEXT_PUBLIC_*`. Production key не использовать в PR/test логах.
- [ ] Долговременный upload keystore (не debug) и пароль/alias в approved secrets manager, CI secrets только после согласования владельца. Включить Play App Signing и сохранить безопасную резервную копию upload key; проверить fingerprint/assetlinks по настоящему сертификату, не выдумывать.
- [ ] Play внутреннее тестирование: создать приложение с прежним package ID, загрузить подписанный AAB вручную, подтвердить package/signature/version в Console. Отдельная проверка установок/обновлений.

### P2 — безопасность, политики, контент и платежи (владелец + агент)

- [ ] Privacy policy HTTPS (без геоблокировок), Terms, данные для удаления аккаунта, Data safety, **Health apps declaration** (в т.ч. stress management/mental health), возраст/контент-рейтинг, EN/RU/ES parity.
- [ ] Проверить эротический/танрический контент на соответствие Play **Sexual Content and Profanity**; не давать медицинских диагнозов или гарантий терапии/гомеопатии.
- [ ] Проверить Paywall и внешние платежные ссылки **по каждой категории**: доступ к цифровым курсам/подпискам может требовать Google Play Billing; 1:1 онлайн консультация между людьми без записи/повтора может подпадать под исключение (не предполагать заранее). До проверки отключить **в Android wrapper** навигацию к неподходящим покупкам безопасно и без ломания веб-сайта (если политика требует), не подменять статус успешной оплаты.
- [ ] Google OAuth **на физическом Android**: system browser → HTTPS callback → `holistichouse://auth/callback` → PKCE exchange; отмена, повторный код, refresh, logout, wrong-account, blocked third-party cookies; не хранить токены в публичном bundle.
- [ ] Приватные отчёты/тесты/клиентские файлы: server-side auth + FORCE RLS; ни SW, ни screenshot/analytics не должны раскрывать их. Внешние уведомления **только нейтральный текст и защищённая ссылка**, отдельный opt-in/STOP. Тестировать CRM Contacts vs practitioner-private accounts отдельно.
- [ ] FCM **реальная доставка** с разрешения тестера: practitioner synthetic reply → провайдер → системное уведомление → tap → только свой thread. Не смешивать Web Push/APNs и FCM; receipt/получение не равны read.
- [ ] Проверить мобильный UX 320–430 px, медленная сеть, клавиатура, Send, сеть пропала/вернулась, возврат из background, доступность, батарея и время загрузки.

### P3 — Play testing и сертификация

- [ ] Closed/internal test с выданным AAB и минимум одним физическим устройством (ни APK из CI, ни iOS simulator не доказывают релиз).
- [ ] Если применимы требования для **нового Personal** аккаунта — не менее **12 тестеров с непрерывным opt-in 14 дней**, затем заявка на production access; для Organization и конкретного аккаунта требования уточнить в Console, не применять автоматически чужой режим.
- [ ] Store listing: оригинальные icon/feature graphic/screenshots реальной сборки, короткий/полный текст без клинических гарантий, privacy URL, support, целевые страны/языки; reviewer test account без реальных медицинских/клиентских данных; согласованный content rating.
- [ ] E2E матрица с evidence (device / OS / locale / app versionCode / account role / UTC timestamp / provider receipt / скриншот без PII) по всему пути: install → Google sign-in → test/report → сохранение в My House → CRM opt-in → messages → logout/deny → upgrade → reinstall. 0 критических сбоев/утечек; отчёт по UX.
- [ ] Google одобрил релиз; rollout постепенно (с наблюдением crash/ANR, auth failures, провайдерских error), rollback plan документирован. Не публиковать без отдельного разрешения владельца.

### P4 — выпуск и сопровождение

- [ ] Зафиксировать конкретные Git merge commit и CI run, Vercel deployment **READY + alias `holistichouse.vercel.app` + тот же SHA**, Supabase migration / FORCE RLS, Play versionCode / release track, ссылку на store listing и реальный device E2E.
- [ ] После выпуска monitoring от 24–72 часов, постепенное расширение rollout, отрицательные кейсы с пользователями, обратная связь; PWA резервный маршрут.
- [ ] Issue #1310 закрывать **только** когда опубликованная/подписанная Android сборка действительно установлена и прошла E2E, а iOS/Apple части либо проверены, либо вынесены в отдельный tracker с явным статусом.

## 2. Четыре роли для QA до релиза

1. **Нетерпеливый:** от главной через CTA до первого сохранённого результата; стоп на первом сломанном клике.
2. **Скептик:** цены, privacy, Terms, Google login и разрешения; никаких искусственных health promises.
3. **Android 375px/slow network:** установка, клавиатура + Send, вернуться из background, быстрый повтор.
4. **Нагрузочный / adversarial:** double submit, revoked consent, wrong-account, browser back, expired session, offline и повторная доставка.

Каждый дефект: воспроизводимые шаги, severity, device/OS, обезличенный screenshot, ссылка на issue/PR, повторная проверка. Нельзя подменять негативные проверки скриншотами публичного HTTP 200.

## 3. Контрольные точки и ответственность

| Этап | Исполнитель | Доказательство | Gate |
| --- | --- | --- | --- |
| P0 drift fix | агент | PR, focused CI, native logs | merge после PASS |
| P0 signed AAB pipeline | агент, security review | gated manual workflow + synthetic contract tests | нет оплаты/авто публикации |
| P1 Play Organization/verification | владелец | Play Console подтверждает правовой тип | NO release без этого |
| P1 signing + Firebase | владелец с агентом | protected secrets existence без чтения значений; signed AAB fingerprint | NO secrets в Git |
| P2 privacy/policy/billing | владелец с агентом | декларации + реальные сценарии | approval до Play submission |
| P2 physical E2E | владелец / QA | доказательство receipt + tap + denied-account | PASS |
| P3 closed/internal testing | владелец с агентом | Play Console tester/date/version evidence | policy-compliant |
| P4 publish | владелец разрешает, агент проверяет | Play review + exact SHA/version + live device | rollout |

**Owner actions (до 3):** (1) решить юридическую регистрацию Play Organization с [Play Console](https://play.google.com/console/) и [типами аккаунтов](https://support.google.com/googleplay/android-developer/answer/13634885); (2) настроить [Firebase](https://console.firebase.google.com/) и защищённые секреты (не в чате); (3) выделить реальный Android и группу тестеров для install/OAuth/FCM E2E. iOS отдельно в #1310, здесь Android first.

## 4. Риски / откат / бюджет

- **Privacy:** медицинские/психологические данные строго в авторизованном кабинете; не в push, трекерах, логах, рекламе и Store screenshots. Использовать только синтетические QA записи.
- **Signing:** не пересоздавать upload key каждый раз; если ключ утрачен — запросить ключевой reset через официальную процедуру, не обходить.
- **Distribution:** при обнаружении аварии остановить rollout в Play Console, откатить web-функцию отдельно только после оценки backend-совместимости; debug APK **не** раздавать как замену подписанному Play release.
- **Costs:** build CI умеренный; Play registration/payments, Store billing и Firebase — отдельные решения. **Никаких автоматических платных API, массовых рассылок или рекламы.**
- **Blocker:** Google Play policy **организационного аккаунта для health apps** делает публичную публикацию зависимой от законной возможности такого аккаунта. До этого агент может закончить код, документацию и статические тесты, но не обещать магазин.

## 5. Официальные источники (проверены 27.10.2026)

- [Google Play / AI Studio Personal Library announcement](https://blog.google/products-and-platforms/platforms/google-play/google-play-updates-october-2026/)
- [Play Console — Choose developer account type (health apps require Organization)](https://support.google.com/googleplay/android-developer/answer/13634885?hl=en)
- [Play Console — Health apps declaration](https://support.google.com/googleplay/android-developer/answer/14738291?hl=en)
- [Google Play API36 requirement since 31 Aug 2026](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [AGP minimum for Android API36](https://developer.android.com/build/releases/about-agp)
- [Google Play Developer Policy — health, sexual content, privacy](https://support.google.com/googleplay/android-developer/answer/18258653?hl=en)
- [Payments policy and one-to-one online services exception](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en)
- [Personal account closed testing rule](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)

**Status as of authoring:** PLAN + native path drift FIX in review; **NOT** signed AAB, NOT Play Console upload, NOT customer release. Merge, GitHub CI, production deployment and device testing each require separate evidence.
