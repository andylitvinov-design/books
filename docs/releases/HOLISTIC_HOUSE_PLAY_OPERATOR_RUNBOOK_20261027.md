# Holistic House — операторский runbook Android Play candidate (27.10.2026)

**Status:** manual signed-candidate workflow implemented in source only. **No signature, AAB, upload or Play distribution is claimed.** Program: [Google Play release program](./HOLISTIC_HOUSE_GOOGLE_PLAY_RELEASE_PROGRAM_20261027.md); ticket [#1310](https://github.com/andylitvinov-design/books/issues/1310).

## Why AI Studio Personal Library is NOT this release

Google AI Studio / Play Personal Library creates and installs *personal* apps, not a general customer distribution of the existing Capacitor `com.holistichouse.app`. This workflow instead builds a standard Android App Bundle ready for **manual review and internal Play Console upload**. It does not auto-publish.

## Required owner approvals (STOP until complete)

1. **Google developer identity:** Verify with [Play Console](https://play.google.com/console/) that an **Organization** developer account is available/eligible for a health/wellness app. Google says organization is required for health apps. Requires organization identity verification/D-U-N-S; do not pretend the owner has a registered company. Payment is only by owner.
2. **Owned Android Firebase project:** [Firebase console](https://console.firebase.google.com/), package **`com.holistichouse.app`**. Create Android configuration and service account for FCM. Do not copy config or service account into Git/PR/chat.
3. **Stable upload key:** Owner creates a securely backed-up Android `.jks` signing/upload keystore and records its alias and fingerprint in private approved credential manager. **Not** ephemeral debug keystore. Google Play App Signing's final **app signing certificate fingerprint** can differ from upload key fingerprint; update verified HTTPS app links only after Play Console shows the exact signing cert.
4. **Environment protection:** GitHub repository [Settings → Environments](https://github.com/andylitvinov-design/books/settings/environments) → create `google-play-release`; configure trusted required reviewer(s) and branch restrictions to `codex/public-book-library` before authorizing secrets or workflow runs.
5. **Secret names:** Store only in approved encrypted GitHub Secrets (prefer protected Environment scoped to release):
   - `HH_ANDROID_KEYSTORE_B64` — base64 bytes of private stable upload key.
   - `HH_ANDROID_KEYSTORE_PASSWORD`, `HH_ANDROID_KEY_ALIAS`, `HH_ANDROID_KEY_PASSWORD` — private key metadata.
   - `HH_FIREBASE_CONFIG_B64` — base64 `google-services.json`, package `com.holistichouse.app`.
   - Server-only *production Vercel* FCM: `HH_FCM_PROJECT_ID`, `HH_FCM_CLIENT_EMAIL`, `HH_FCM_PRIVATE_KEY` (see [native push runbook](../holistic-house-native-push-2026-10-20.md)).
   - Secrets **never** via `NEXT_PUBLIC_*` / site client bundle, Git history, plaintext logs, external messages or screenshots.

## What to click after approvals

1. Ensure PR for `scripts/prepare-holistic-house-play-release.mjs`, `tests/holistic-house-play-release.test.mjs` and `.github/workflows/holistic-house-play-aab.yml` is approved and merged **into `codex/public-book-library`**, with focused PR/native CI PASS. Check exact source SHA.
2. Open [Actions → Holistic House Play AAB](https://github.com/andylitvinov-design/books/actions/workflows/holistic-house-play-aab.yml) → **Run workflow** → branch `codex/public-book-library`. Enter `version_code` as **strictly larger** than most recent Play Console build (first candidate often `2`, verify before choosing), `version_name` e.g. `1.0.0`.
3. Protected environment approval precedes signing. The job verifies repo + branch, stages the **existing** HH-only Capacitor app, checks Firebase package, upgrades *only that CI checkout* to API36 + AGP8.9.1, enforces version and signing inputs, creates a JAR-signed `app-release.aab`, checks archive and signature, emits SHA-256, then removes ephemeral key/config.
4. On SUCCESS download the **private** `HH-Play-AAB-<version_code>-NOT-PUBLISHED` action artifact (retained seven days). Record run URL, exact source SHA, AAB checksum and independently inspect package/manifest/signing cert/version/API in an Android build verification tool or Play Console. An action green without real key/Play validation is not store readiness.
5. Upload manually to **Internal Testing** in Play Console **only after** policy review and permission; confirm package `com.holistichouse.app`, release signing, `targetSdkVersion 36`, correct versionCode, reviewer login, data safety/health declaration, store listing and compliant purchase flows. Never assume closed test/prod access.

## Дополнительно: публичная Android APK загрузка с сайта (НЕ опубликована)

Тот же **защищённый** manual workflow теперь из одного staged `com.holistichouse.app` исходника строит одновременно подписанные `app-release.aab` (Play) и `app-release.apk` (website). Перед сборкой владелец добавляет в защищённый GitHub Environment НЕсекретную переменную `HH_EXPECTED_WEBSITE_CERT_SHA256` — заранее сверенный SHA256 **стабильного сертификата подписи веб-APK**. Без этой переменной или при несовпадении отпечатка workflow обязан аварийно завершиться; одноразовый CI/debug ключ использовать нельзя. `apksigner verify --verbose --print-certs` должен подтвердить APK v2/v3, SHA256 сертификата, `aapt` — точный package/versionCode/versionName/targetSdk 36; в приватный артефакт на 7 дней попадёт `Holistic-House-Android-vX.Y.Z.apk` + checksum + certificate evidence. **Это internal QA candidate, а не публичный download**. Сам workflow не создаёт GitHub Release, не включает release-флаг и не публикует APK для клиентов.

**Внимание: Play upload key ≠ Play app signing key.** По [официальной инструкции Google](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en-en) Google может **переподписывать** скачиваемые из Play APK отдельным app signing key. Тогда сайт-APK с Play *upload key* нельзя использовать для бесшовного обновления Play-установки и наоборот. До первого массового релиза владелец должен выбрать непротиворечивую цепочку подписей: либо предоставить собственный app signing key в Play, совпадающий с веб-APK (с отдельным upload key), либо для сайта распространять universal APK, официально подписанный Google Play app signing key, после утверждения в Play Console. Без проверки пары отпечатков не считать cross-store updates рабочими.

Для публичного выхода выполнить реальный Android install и Google OAuth → private messages / account-isolation / photo+voice / logout / mobile EN-RU-ES E2E с синтетическими данными. Не раздавать release до независимой проверки сертификата APK и постоянного ключа на следующей версии. После отдельного одобрения владельца вручную опубликовать файл только в GitHub Releases репозитория books, tag `hh-android-vX.Y.Z`, filename `Holistic-House-Android-vX.Y.Z.apk`. В [public native distribution runbook](https://github.com/andylitvinov-design/books/blob/codex/public-book-library/docs/releases/HOLISTIC_HOUSE_PUBLIC_NATIVE_DISTRIBUTION_20261028.md) заполнить утверждённый реестр `data/native-public-releases.json`, с действительными SHA256, certificate, version, QA issue evidence и `ownerApproved:true`, после чего отдельно включить server-side `HH_NATIVE_PUBLIC_RELEASES_ENABLED=true` в Vercel и redeploy. Пока не выполнено: страницы `/en/install`, `/ru/install`, `/es/install` должны честно показывать `not_released` и `/api/native-download/android` должен возвращать 404.

**Правовая проверка:** публикация Android через собственный сайт не требует Google Play аккаунта, однако [Android Developer Verification](https://developer.android.com/developer-verification) расширится глобально в 2027. Регистрация/проверка разработчика для широкой дистрибуции может потребоваться; нельзя запускать массовую рекламу бинарника до этого. Для iPhone в Канаде нужен отдельный App Store релиз и Apple Developer; неподписанный IPA никогда не заменяет его.

## Native physical device evidence (non-negotiable)

- Fresh Play internal install on Android with one synthetic test account; launch directly to `/[locale]/app/messages` on EN/RU/ES; loading/error states at 320–430 px; keyboard/Send.
- Google OAuth via system browser → `holistichouse://auth/callback` → server-bound PKCE; log out, expired session, wrong-account denial, cold start, background restore, offline/retry.
- Synthetic assigned practitioner reply → FCM provider acceptance **AND visible receipt** on actual device → notification tap opens correct authorized private thread; withheld consent/disabled permission, duplicate messages and private-note exclusions. No names, symptoms, reports or clinical content in notification.
- Server-side own-account checks and Supabase RLS, no private SW caches/analytics; completed My Tests/Courses/reports flow. Verify all negative cases.
- Record OS/versionCode/locale, anonymized screenshots, action logs/receipt, and test date in #1310. **0 critical auth/privacy/purchase incidents** before production request.

## Safe failure and rollback

- Workflow has **no** `push`, `pull_request`, store upload, Play API tokens or deployment; invoking it from a branch other than reviewed production skips job. Missing secret, wrong identity/origin, missing keystore, SDK mismatch or invalid version abort.
- Signing key path is ephemeral `$RUNNER_TEMP/hh-upload.jks`; the `.jks` is not uploaded. Only the signed AAB and checksum are retained. An AAB is still not automatically public.
- If API36 compilation fails, fix and test in PR, do not lower targetSdk to 35 to bypass Play policy. If an AAB is invalid, stop upload. If live rollout is problematic, halt rollout via Console and use existing PWA; Play versionCode cannot be reused.
- Original PsiAlchemy app and `capacitor.config.json` remain unchanged on source branch, because staging is CI-only.

## Google policy and cost context (27.10.2026)

- API36 required for new Play mobile apps after 31.08.2026: https://support.google.com/googleplay/android-developer/answer/11926878?hl=en
- AGP >=8.9.1 required for API36: https://developer.android.com/build/releases/about-agp
- Organization account required for health apps: https://support.google.com/googleplay/android-developer/answer/13634885?hl=en
- Health declaration: https://support.google.com/googleplay/android-developer/answer/14738291?hl=en
- Digital courses/subscriptions vs 1:1 unrecorded online sessions: https://support.google.com/googleplay/android-developer/answer/10281818?hl=en
- 12 opted-in testers for 14 continuous days applies to *new Personal* accounts, not indiscriminately to Organization: https://support.google.com/googleplay/android-developer/answer/14151465?hl=en

**Do not equate:** native source built != signed candidate != Play internal install != authenticated E2E != provider-delivered push != public Play listing.
