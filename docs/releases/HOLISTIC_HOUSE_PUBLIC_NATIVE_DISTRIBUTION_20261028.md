# Holistic House — публичная установка настоящего приложения · 28.10.2026

**Product:** `com.holistichouse.app` · website `https://holistichouse.vercel.app` · production branch `codex/public-book-library` (NOT default `codex/bootstrap-books`). Owner tracker: [books #1310](https://github.com/andylitvinov-design/books/issues/1310).

## Цель, проверенные ограничения

Публичная страница `/{en|ru|es}/install` сначала показывает **нативные iPhone и Android** как две отдельные карточки, затем чётко маркированный PWA как временную альтернативу. Не подменять iOS IPA ссылкой на Safari или unsigned файл. Не смешивать с отдельным PsiAlchemy и не создавать новую CRM, базу данных или OAuth.

**iPhone в Канаде / глобально:** публичную нативную iOS-версию можно распространять через **App Store** после Apple Developer Program, signing, App Store Connect review и реального iPhone E2E. Apple Developer individual/sole proprietor допустим, организация не обязательна, но публично показывается юридическое имя разработчика. Членство по официальным данным — USD 99/year, только по отдельному разрешению владельца. TestFlight подходит ограниченным тестерам, но это НЕ общедоступная постоянная установка. Простое размещение unsigned `.ipa` на нашем сайте в Канаде не делает его устанавливаемым. Официальная Web Distribution через сайт — **только ЕС и одобренные условия для разработчика**; не заявлять Canada/US direct install.

**Android:** release-signed `.apk` с неизменяемым Android signing key и идентификатором `com.holistichouse.app` может скачиваться с сайта (Android запросит разрешение на установку из источника); обновления требуют **того же сертификата**, возрастающего versionCode и корректного packageId. **Не публиковать** одноразовые GitHub Actions debug APK и неподписанные AAB. Google Developer Verification для внешних загрузок распространяется глобально в 2027: заранее пройти идентификацию/регистрацию `com.holistichouse.app` в Android Developer Console либо Play Console. Google Play для health apps может требовать Organization developer account, отдельный D-U-N-S; **не предполагать, что бизнес зарегистрирован**.

## Что действительно внедрено в сайт

1. `data/native-public-releases.json`: один публичный реестр двух платформ, в исходном состоянии **`not_released`** и без ссылок на реальные бинарники.
2. `lib/native/public-downloads.mjs`: 2 строгих проверки (платформенный `released`, ownerApproved, версия, evidence из #1310, для Android SHA256 файла и SHA256 сертификата). Разрешены **только** официальный `apps.apple.com` и фиксированный путь к GitHub Releases `andylitvinov-design/books`. Никаких testflight, altstore IPA, debug APK, случайных CDN, query, пользовательского URL или открытого редиректа.
3. Дополнительный production kill-switch **`HH_NATIVE_PUBLIC_RELEASES_ENABLED=true`** (server-only, НЕ `NEXT_PUBLIC_*`). Без него обе публичные кнопки скрыты даже при ошибочно заполненном реестре. После изменения env redeploy, чтобы prerendered страницы обновились.
4. Канонические адреса скачивания `/api/native-download/android` и `/api/native-download/ios`: `404` пока не выпущено, `302` исключительно на проверенный официальный бинарник/магазин после двойного разрешения. Без проксирования бинарников через Vercel Functions, без приватных данных, без загрузок от клиентов и без дорогостоящего Vercel storage.
5. EN/RU/ES native-first карточки, условные действия, мобильная сетка 320–430px, доступность/focus, чёткое разделение web fallback.

## Выпуск Android APK (не считать готовым пока нет реального подписанного файла)

- Использовать **существующий** Capacitor build и текущее `scripts/prepare-holistic-house-native.mjs`. Сохранить стабильно защищённый **Android release signing key** у владельца и в approved protected CI environment; не коммитить сертификаты, ключи, Firebase service account, passphrases и client data. Схема подписанного Play AAB уже начата в [draft PR #2230](https://github.com/andylitvinov-design/books/pull/2230); **дорабатывать существующий workflow**, а не выпускать отдельный конкурирующий AAB. Для web-APK нужна release-signed `assembleRelease` из той же версии, с обязательной независимой проверкой подписи `apksigner verify --print-certs`, package, target SDK, versionCode и SHA256.
- Выполнить на реальном Android: fresh install, server-origin launch, Google OAuth PKCE, вход/выход, неверный аккаунт не читает чаты, приватное фото/голос синтетическое, отказ/без сети, opt-in уведомлений только если настроены FCM и privacy; тесты EN/RU/ES, 320–430px. **Нет реального device QA — нет публичного APK.**
- После QA и отдельного одобрения владельца опубликовать подписанный `Holistic-House-Android-vX.Y.Z.apk` через GitHub Releases с тегом `hh-android-vX.Y.Z` (не Actions ephemeral artifact) и checksum. Перед выставлением кнопки скачать бинарник, проверить SHA256 + подлинность сертификата; сохранить release version, code, URL, SHA256 apk, cert fingerprint, конкретный комментарий E2E в #1310 и `ownerApproved:true` в JSON.
- Отдельно включить `HH_NATIVE_PUBLIC_RELEASES_ENABLED=true` в Vercel только после review и redeploy. По ошибке / отзыву сертификата **выключить** env, redeploy/rollback и проверить `404`.

## Выпуск iPhone через App Store

- Владелец самостоятельно подтверждает Apple Developer Program (индивидуальный аккаунт возможен) и сборку с собственной подписью `com.holistichouse.app`; нужен Xcode archive/Apple signing и Apple review. Без покупок/регистраций и передачи Apple credentials по чату.
- Проверить на физическом iPhone Google OAuth, private messages, permissions, account isolation, logout, EN/RU/ES. APNs отдельно, только при наличии Apple entitlement и реального provider receipt.
- Только после approved App Store public listing взять фактическую `https://apps.apple.com/.../app/.../id...` ссылку, сохранить App Store version и ссылку на QA в #1310, `ownerApproved:true` в реестре и пройти тот же server kill switch. В отличие от личного AltStore, у публичной версии нет семидневного истечения.

## Фактическая приёмка

- `node --test tests/holistic-house-native-public-downloads.test.mjs tests/holistic-house-free-install.test.mjs`.
- Production build и HTTP `/{en|ru|es}/install` **200**, `/api/native-download/android` и `/api/native-download/ios` **404** до выпуска; не 200 с подложным IPA.
- Сайт не утверждает установку или push на реальном iPhone без проверки. Release status `not_released` остаётся видимым, web app ясно обозначен как отдельный PWA.
- После реального выпуска проверить Android `302` на подписанный apk/App Store, SHA256/certificate, download/install/launch/login/E2E; отследить ошибки и возможность отключения.

**Ссылки владельца:** [Apple Developer](https://developer.apple.com/account/) · [Google Android Developer Verification](https://developer.android.com/developer-verification) · [GitHub native issue #1310](https://github.com/andylitvinov-design/books/issues/1310) · [Vercel project](https://vercel.com/super10/codex-public-book-library).

Официальная политика: [Apple alternative distribution](https://support.apple.com/en-ca/118110) · [Apple Developer membership](https://developer.apple.com/help/account/membership/program-enrollment) · [Android verification](https://developer.android.com/developer-verification).
