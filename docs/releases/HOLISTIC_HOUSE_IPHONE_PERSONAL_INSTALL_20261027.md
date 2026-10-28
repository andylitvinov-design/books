# Holistic House — настоящий iPhone app для личного теста (без платного Apple Developer)

**27 October 2026 · internal owner sideload, not customer distribution · tracker [#1310](https://github.com/andylitvinov-design/books/issues/1310).**

## Что собираем

Existing Capacitor 7 native **Holistic House** client `com.holistichouse.app`, kept separate from PsiAlchemy, using the reviewed production origin `https://holistichouse.vercel.app/en/app/messages`. It is a real iOS `.app` for hardware **arm64**, packed as an **unsigned** `.ipa`. This is not the old iOS Simulator package. The native container starts from a separate app icon with a native WKWebView and requires an internet connection to retrieve the existing private cabinet UI and API (it is not an offline reimplementation).

The GitHub Actions workflow `.github/workflows/holistic-house-native.yml` now builds `-sdk iphoneos -destination 'generic/platform=iOS'` with `CODE_SIGNING_ALLOWED=NO`, verifies bundle ID/name, arm64, exact allowed HTTPS origin and unsigned status, and uploads:
- `Holistic-House-iPhone-Unsigned-IPA-Personal-Only` → `Holistic-House-Unsigned-iPhone.ipa`, SHA256 and logs.
- **Unsigned IPA cannot be installed directly through Safari or a link**, and it must **never** be presented as a signed Apple release, TestFlight download or independently verified E2E app.
- GitHub's private-to-the-owner Actions artifact expires after **14 days**, so this is *not* a stable public download endpoint.

## Рекомендуемый для бесплатного Apple Account вариант — Lite

A separate **hardware iPhoneOS, arm64** archive `Holistic-House-iPhone-Personal-Lite-Unsigned` is produced from a *copy* of the same validated `com.holistichouse.app` device bundle. Only the optional `HHCourseWidget.appex` is removed from the copy, to avoid using another personal App ID and reduce sideload extension/signing failures; the main native executable, allowed HTTPS origin and OAuth routing remain intact. CI verifies SHA256 and that the Lite IPA contains no extensions. The main regular IPA is retained unchanged.

For the owner's personal iPhone, prefer extracting `Holistic-House-iPhone-Personal-Lite-Unsigned.ipa` from the successful [Native Installers](https://github.com/andylitvinov-design/books/actions/workflows/holistic-house-native.yml) run. Free Apple personal provisioning still requires **AltServer or Xcode signing**, a physically trusted iPhone, and renewal about every 7 days; this is **not** a Safari-installable signed release. Native Google OAuth/private messages remain unverified until physical device testing. Never use a third-party public IPA signing website with the owner's Apple account.

## Получение файла и бесплатная установка на свой iPhone

1. Open [Holistic House Native Installers](https://github.com/andylitvinov-design/books/actions/workflows/holistic-house-native.yml) on GitHub while signed in; choose a **successful** run containing an **iPhone arm64** build (not `iOS-Simulator-Only`).
2. Under **Artifacts**, download `Holistic-House-iPhone-Unsigned-IPA-Personal-Only`. Extract the artifact ZIP. Inside is the `Holistic-House-Unsigned-iPhone.ipa`; verify SHA256 before installing.
3. On an authorized Mac or Windows computer install **AltStore Classic + AltServer** using only the official vendor site [altstore.io](https://altstore.io/) and its [macOS](https://faq.altstore.io/altstore-classic/how-to-install-altstore-macos) or [Windows](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows) instructions. Keep your Apple Account credentials **out of ChatGPT, GitHub and Holistic House**.
4. Connect/unlock the iPhone once and trust the computer. Use AltServer to install AltStore. iOS 16+ also needs **Developer Mode** enabled in Settings → Privacy & Security. Inside AltStore → My Apps → **+**, select the IPA from Files, and have AltStore sign it with the owner's Apple Account.
5. Start the new **Holistic House** app from its own Home Screen icon; confirm launch, Google OAuth→native callback, logout, correct signed-in account and nonclinical test message on the physical device. Real OAuth/message/push E2E **has not yet passed**. Do not use real patient health data until QA gates pass. Native APNs remain disabled without the approved Apple Developer entitlement and keys.
6. A **free** personal Apple Account has seven-day app provisioning. AltStore can refresh with AltServer, or the app will stop opening until re-signed. Max app/device limits apply. The signed IPA is bound to the owner/device; never upload that signed personal package to a public website.

## Why not a one-tap install directly from the Holistic House website?

For an iPhone in **Canada**, Apple does not offer ordinary self-hosted `.ipa` installation from Safari. Apple's official direct web distribution for normal iOS apps is restricted to approved eligible regions, currently the EU, and requires Apple approval and App Store Connect. Xcode with a Personal Team or AltStore sideload is the practical zero-membership-cost **personal** testing route. An unsigned GitHub asset does not override iOS code signing.

For wider customer installation without renewing every 7 days, use a signed Apple Developer distribution route (TestFlight/App Store and policies), or clearly label an installable PWA as a *different product*. Do not present one as the other.

## Verification / release gates

- Before calling the build successful: test workflow syntax, `node --test tests/holistic-house-native-build.test.mjs`, actual **macOS iPhoneOS** Xcode build, the archive's `Payload/App.app`, arm64 architecture, HTTPS-only bundled origin, SHA256; report exact CI run, SHA and artifact name.
- Before claiming it works on a phone: physical iPhone signed install, Google OAuth PKCE deep-link return, correct account and logout/reinstall, private messages, no unauthorized private-data exposure. Unavailable Mac or owner device is a **blocker**, not PASS.
- `native shell` does **not** promise offline access to private messages or notifications. APNs requires its separate real-device/provider E2E.
- No production Vercel change is necessary for this build; a merged workflow is **not proof** of a new website deployment.

Sources: [Apple free personal Xcode signing](https://developer.apple.com/help/account/basics/about-your-developer-account), [Apple web distribution](https://developer.apple.com/documentation/marketplacekit/distributing-your-app-from-your-website), [AltStore Classic docs](https://faq.altstore.io/altstore-classic/your-altstore).
