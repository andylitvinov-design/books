# Holistic House — прямое скачивание Android APK (1 ноября 2026)

**Статус:** защищённая ручная сборка APK реализована в [PR #2230](https://github.com/andylitvinov-design/books/pull/2230), но клиентский **подписанный файл ещё НЕ выпущен**. Нет подтверждённой публикации GitHub Release, реального Android OAuth/передачи сообщений или LIVE-проверки APK. Основной трекер: [#1310](https://github.com/andylitvinov-design/books/issues/1310).

## Основной маршрут: собственный сайт, без Google Play

**Google Play не требуется** для сборки и распространения подписанного APK с сайта. Используется только существующее Capacitor-приложение `com.holistichouse.app`, с HTTPS-входом `https://holistichouse.vercel.app/en/app/messages`, единым сервером, авторизацией и защищёнными кабинетами. Приложение PsiAlchemy, его пакет и исходные нативные файлы остаются нетронутыми.

Используем существующий workflow [`holistic-house-play-aab.yml`](https://github.com/andylitvinov-design/books/actions/workflows/holistic-house-play-aab.yml). Его историческое имя и GitHub Environment `google-play-release` сохраняются для совместимости и защищённого хранения ключей, **не ради магазина**. Параметр `build_play_aab=false` (по умолчанию) означает только `assembleRelease` → подписанный APK; AAB создаётся только при явном `build_play_aab=true`.

**Firebase не нужен для сборки APK.** Без `HH_FIREBASE_CONFIG_B64` native FCM push не включён и не может считаться работающим. Реальные push-уведомления требуют отдельного подключения, пользовательского согласия и физического E2E. Веб-PWA уведомления не превращаются автоматически в native push.

## Что требуется владельцу перед реальной подписанной сборкой

1. Создать и безопасно сохранить **постоянный Android website APK signing key** (`.jks`), не использовать отладочный или одноразовый CI-ключ. Подтвердить SHA-256 отпечаток сертификата и независимую резервную копию. Непрерывность подписи обязательна для будущих обновлений.
2. В GitHub [Settings → Environments](https://github.com/andylitvinov-design/books/settings/environments) настроить уже существующий защищённый Environment `google-play-release`: только `codex/public-book-library`, владелец-рецензент, закрытые секреты `HH_ANDROID_KEYSTORE_B64`, `HH_ANDROID_KEYSTORE_PASSWORD`, `HH_ANDROID_KEY_ALIAS`, `HH_ANDROID_KEY_PASSWORD` и НЕсекретная переменная `HH_EXPECTED_WEBSITE_CERT_SHA256`. Не отправлять значения ключей в Git, чат или логи.
3. Если нужны native push-уведомления, *отдельно* подключить Firebase Android `com.holistichouse.app` через `HH_FIREBASE_CONFIG_B64` и server-only FCM credentials на Vercel. Для первой приватной APK-сборки это необязательно. **Без** provider/permission/device QA не обещать push пользователям.

Действие с постоянным ключом и платными или юридическими регистрациями требует отдельного разрешения владельца. Текущие GitHub- и Vercel-подключения не означают, что эти ключи уже настроены.

## Шифрование тестового APK до публикации

Репозиторий публичный, поэтому GitHub Actions artifacts нельзя считать закрытыми. До явного одобрения пользователя workflow загружает **только зашифрованный** `.apk.age` (и необязательный `.aab.age`) и открытые контрольные суммы/метаданные. Обычный APK в Actions НЕ загружается.

На своём доверенном компьютере владелец создаёт индивидуальный ключ для QA (например, после установки `age` через `brew install age`):

```bash
age-keygen -o ~/hh-apk-qa-identity.txt
age-keygen -y ~/hh-apk-qa-identity.txt
```

Файл `~/hh-apk-qa-identity.txt` — **секретный**, его нельзя загружать в репозиторий, ChatGPT или GitHub Actions. Второй вызов выводит публичный ключ `age1...`; его нужно внести в защищённый GitHub Environment `google-play-release` как переменную `HH_APK_QA_AGE_RECIPIENT` (публичный recipient, не ключ подписи). Если переменной нет, workflow останавливается, не загружая APK. Это не дополнительный платный сервис.

Скачать QA artifact `HH-Website-APK-<version_code>-ENCRYPTED-NOT-PUBLISHED` и на своём компьютере выполнить:

```bash
age --decrypt -i ~/hh-apk-qa-identity.txt -o Holistic-House-Android-vX.Y.Z.apk Holistic-House-Android-vX.Y.Z.apk.age
shasum -a 256 Holistic-House-Android-vX.Y.Z.apk
```

Полученный SHA-256 сверить с `hh-website-apk-sha256.txt`; сам APK пока предназначен только для проверяющих. Лишь после физического Android E2E и явного одобрения владельца выпускается открытый GitHub Release. Для публичной версии файл уже не шифруется, и сайт сможет предложить его по существующему проверенному URL.

## Как получить приватный APK и проверить его

1. Провести code/security review и все обязательные тесты PR #2230, затем разрешённым способом влить его **только в production** `codex/public-book-library`, не в GitHub default `codex/bootstrap-books`. Черновые/пропущенные проверки не равны успеху.
2. Открыть [Actions → Holistic House Android Direct APK](https://github.com/andylitvinov-design/books/actions/workflows/holistic-house-play-aab.yml), выбрать `codex/public-book-library`, `version_code` выше последнего публичного Android `data/native-public-releases.json`, `version_name` например `1.0.0`, `build_play_aab=false`. Подтвердить защищённый Environment; никаких автоматических публикаций.
3. Workflow проверяет настоящий пакет/HTTPS-origin, наличие постоянного ключа, ожидаемый отпечаток и монотонность номера версии; staged Android API 36 / AGP 8.9.1, затем `assembleRelease`. `apksigner verify --print-certs`, `aapt`, SHA-256 и fingerprint должны подтвердить именно подписанный `com.holistichouse.app`. При ошибке — остановка, а не debug-fallback.
4. Скачать GitHub Actions артефакт `HH-Website-APK-<version_code>-ENCRYPTED-NOT-PUBLISHED` (7 дней): **`Holistic-House-Android-vX.Y.Z.apk.age`**, контрольная сумма, сертификат, package/version evidence. Расшифровать только на своём компьютере, как описано выше. Исходный APK и ключ подписи не входят в Actions-артефакт.
5. На физическом Android проверить: установку APK через браузер (разрешение установки из этого источника), запуск и возвращение из background; Google OAuth в системном браузере → защищённый HTTPS callback → `holistichouse://auth/callback` → PKCE; logout, повторный запуск, неправильный аккаунт, отсутствующую сеть; тесты, отчёты, курсы, личные сообщения, голос/видео, приватность, реальные обновления тем же сертификатом. Записать только обезличенные результаты и версию в [#1310](https://github.com/andylitvinov-design/books/issues/1310). Native FCM delivery проверять отдельно, только при наличии провайдера и разрешения.
6. **Лишь после физического QA и явного утверждения владельца** опубликовать тот же проверенный APK в GitHub Releases с tag `hh-android-vX.Y.Z` и filename `Holistic-House-Android-vX.Y.Z.apk`. Записать фактические `sha256`, `signingCertificateSha256`, `version`, `versionCode`, ссылку на QA evidence и `ownerApproved:true` в едином `data/native-public-releases.json`. После проверенного production деплоя включить server-only `HH_NATIVE_PUBLIC_RELEASES_ENABLED=true` и подтвердить `/api/native-download/android` → одобренный APK и отображение кнопки `/ru|en|es/install`. До этого API обязан возвращать 404, а кнопки не должно быть.

Это **не** механизм автоматического обновления: новую подписанную APK-версию пользователь должен снова загрузить и установить (либо позднее добавить отдельный контролируемый update-check). Никогда не заменять клиентский файл debug-сборкой.

## Google Play — только дополнительный вариант

Google Play Console / Organization registration, Play Billing, Play Health Declaration, Play testing и AAB **не являются условиями загрузки APK с сайта**. Если впоследствии появится магазинная версия, включать `build_play_aab=true` отдельно и выполнять его политики. Play upload key и Play app signing key могут различаться; APK, подписанный одним сертификатом, не гарантирует обновление Play-версии, подписанной другим. Сравнить реальные отпечатки до обещания совместимости.

**Android Developer Verification — отдельный процесс, не публикация в Play.** По [Android Developers FAQ](https://developer.android.com/developer-verification/guides/faq) в сентябре 2026 прямой sideload не подпадает под первые региональные требования; к глобальному расширению в 2027 году для удобной широкой установки потребуется зарегистрировать пакет и сертификат через Android Developer Console. Для full distribution может применяться регистрация/идентификация и сбор; limited distribution имеет отдельные ограничения. Не описывать неподтверждённое участие как завершённое.

**iPhone в Канаде:** обычный неподписанный IPA нельзя установить одним нажатием с сайта. Для широкой аудитории остаётся Safari Home Screen PWA; отдельный персонально подписанный IPA пригоден только для частного тестирования по правилам Apple. Это не Android APK и не App Store release.

## Отказ, откат и критерии готовности

- Workflow запускается вручную из проверенного production, с защищёнными секретами. Нет `pull_request`/автоматического `push` запуска самого подписного workflow, публикации в GitHub Releases, Play Console, оплаты или внешней рассылки. Проверки exact HEAD и безопасности остаются обязательными.
- Версия должна возрастать, SHA-256 сертификата — совпадать. При неправильной подписи, ошибке OAuth/RLS, нарушении согласия, фальшивом QA evidence или несовместимом package — **не публиковать**.
- Если уже опубликованная версия неисправна, снять ссылку с сайта (выключить server-side release flag / вернуться к предыдущему проверенному реестру); серверная поддержка и установленный APK требуют отдельной проверки совместимости. Не считать Vercel READY доказательством работы Android.
- **Не приравнивать:** успешные source-тесты → подписанный APK → физическую установку/вход/отправку/получение → опубликованный релиз → работающие нативные уведомления. Это разные уровни приёмки.
