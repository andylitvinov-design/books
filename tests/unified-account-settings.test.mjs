import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8')
const entry = source('components/holistic-support-settings-panel.tsx')
const mobile = source('components/holistic-support-mobile.tsx')
const mandala = source('components/holistic-support-mandala-dock.tsx')
const app = source('components/app/app-workspace.jsx')
const appRoute = source('app/[locale]/app/[[...path]]/page.jsx')
const api = source('app/api/app/[...path]/route.js')
const repo = source('lib/app/repository.js')
const migration = source('supabase/migrations/20261029194000_hh_account_es_ui_locale.sql')
const accountCopy = source('components/app/copy.js')
const css = source('components/holistic-support-mobile.module.css')
const appCss = source('app/[locale]/app/[[...path]]/workspace.css')
const browser = source('scripts/verify-holistic-support-mock-fidelity.mjs')

test('mobile Support and Mandala reuse a single Settings entry without duplicating auth', () => {
  for (const shell of [mobile, mandala]) {
    assert.match(shell, /<HolisticSupportSettingsPanel locale=\{locale\}/)
    assert.match(shell, /aria-expanded=\{settingsOpen\}/)
    assert.match(shell, /onClick=\{\(\) => setSettingsOpen\(open => !open\)\}/)
  }
  assert.match(mobile, /data-support-mobile-account-settings/)
  assert.match(mandala, /data-mandala-account-settings/)
  assert.doesNotMatch(entry, /appFetch|\bfetch\(|localStorage|sessionStorage|auth\.|getSession|setSession/)
  assert.match(entry, /href=\{base \+ "#" \+ anchor\}/)
  for (const id of ['account', 'notifications', 'phone', 'subscription', 'privacy'])
    assert.ok(entry.includes('hh-settings-' + id), 'protected existing section ' + id)
})

test('language choices and the protected profile remain accessible to a signed-out mobile guest', () => {
  for (const locale of ['en', 'ru', 'es'])
    assert.ok(entry.includes('  ' + locale + ': {'), locale)
  assert.match(entry, /\["en", "ru", "es"\] as const/)
  assert.match(entry, /\/holistic-support\/\$\{section\}/)
  assert.match(entry, /href=\{base\} prefetch=\{false\}/)
  assert.match(css, /max-height: min\(740px/)
  assert.match(css, /overflow-y: auto/)
  assert.match(css, /safe-area-inset-bottom/)
  assert.match(css, /@media \(max-width:350px\)/)
})

test('all existing private account settings are mounted once in one protected screen', () => {
  assert.match(app, /data-unified-account-settings/)
  for (const id of ['account','notifications','messages','phone','subscription','install','privacy']) {
    assert.ok(app.includes('hh-settings-' + id), 'private section ' + id)
  }
  for (const component of ['Preferences data={data}', 'MessengerNotificationSettings', 'SubscriptionSettings',
    'CommunicationPreferences', 'ClientContactPhone', 'InstallHolisticHouse',
    'NativeMessageNotifications', 'NotificationSettings', 'Privacy'])
    assert.ok(app.includes('<' + component), component)
  assert.match(app, /data\.account\.displayName/)
  assert.match(app, /data\.email/)
  assert.match(app, /Google account/)
  assert.match(app, /maxLength=\{120\}/)
  assert.match(app, /displayName: values\.displayName/)
  assert.match(app, /goal: values\.goal/)
  assert.match(app, /option value="es"/)
  assert.match(app, /onDone=\{load\}/)
  assert.match(app, /continueTo: 'settings'/)
  assert.match(appRoute, /path\[0\] === 'settings'/)
  assert.match(appRoute, /locale === 'es'/)
  assert.match(appRoute, /redirect\('\/en\/app'/)
  assert.match(appCss, /\.hh-settings-index/)
  assert.match(appCss, /@media \(max-width:350px\)/)
})

test('Spanish locale has server validation, production DB constraint and OAuth handoff', () => {
  assert.equal((repo.match(/!\['en', 'ru', 'es'\]\.includes\(input\.uiLocale\)/g) || []).length, 2)
  assert.match(migration, /CHECK \(ui_locale IN \('en', 'ru', 'es'\)\)/)
  assert.match(api, /continueTo === 'settings'/)
  assert.match(api, /app\/settings/)
  assert.match(api, /'practice-preview','direct-messages','settings'/)
  assert.match(accountCopy, /COPY\.es = \{/)
  assert.doesNotMatch(entry, /supabase|DATABASE_URL|SECRET|NEXT_PUBLIC_/i)
})

test('existing Chromium and WebKit iPhone browser suite verifies the popup and navigation', () => {
  assert.match(browser, /data-support-mobile-account-settings/)
  assert.match(browser, /data-unified-settings-entry/)
  assert.match(browser, /settings panel fits iPhone viewport/)
  assert.match(browser, /settings-390\.png/)
})

test('changed TSX and private JSX pass parser diagnostics in all locales', () => {
  for (const [filename, contents] of [
    ['holistic-support-settings-panel.tsx', entry],
    ['holistic-support-mobile.tsx', mobile],
    ['holistic-support-mandala-dock.tsx', mandala],
    ['app-workspace.jsx', app],
    ['app-private-route.jsx', appRoute],
  ]) {
    const output = ts.transpileModule(contents, {
      fileName: filename,
      reportDiagnostics: true,
      compilerOptions: {
        allowJs: true, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    })
    const errors = (output.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error)
    assert.deepEqual(errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, ' ')), [], filename)
  }
})
