import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('private report offers a dismissible bottom Google prompt only after viewing', async () => {
  const [view, gate, prompt, style] = await Promise.all([
    readFile('components/app/shared-report-view.jsx', 'utf8'),
    readFile('components/app/report-invitation-gate.jsx', 'utf8'),
    readFile('components/app/report-google-signin-prompt.jsx', 'utf8'),
    readFile('components/app/report-google-signin-prompt.module.css', 'utf8'),
  ])
  assert.match(view, /<ReportGoogleSignInPrompt/)
  assert.match(view, /onViewed=\{\(\) => setViewing\(true\)\}/)
  assert.match(view, /enabled=\{Boolean\(grant\?\.saveAllowed && appAvailable\)\}/)
  assert.match(view, /onGoogle=\{save\}/)
  assert.match(gate, /onViewed\?\.\(\)/)
  assert.match(gate, /onClick=\{openReport\}/)
  assert.match(prompt, /if \(!viewing \|\| !enabled\) return undefined/)
  assert.match(prompt, /response\.status === 401/)
  assert.match(prompt, /credentials: 'same-origin'/)
  assert.match(prompt, /cache: 'no-store'/)
  assert.match(prompt, /data-report-google-prompt/)
  assert.match(prompt, /sessionStorage\.setItem\(DISMISS_KEY, '1'\)/)
  assert.match(prompt, /aria-label=\{c.close\}/)
  assert.match(prompt, /role="alert"/)
  assert.match(style, /position: fixed/)
  assert.match(style, /env\(safe-area-inset-bottom/)
  assert.match(style, /\.spacer/)
  assert.match(style, /@media \(max-width: 355px\)/)
  assert.match(style, /@media print/)
})

test('Google prompt reuses explicit report-scoped save; no automatic lead or auth', async () => {
  const [view, prompt] = await Promise.all([
    readFile('components/app/shared-report-view.jsx', 'utf8'),
    readFile('components/app/report-google-signin-prompt.jsx', 'utf8'),
  ])
  assert.match(view, /sourceKind: 'delivered_report'/)
  assert.match(view, /save-intents/)
  assert.match(view, /intentId: intent\.id/)
  assert.match(view, /intent\.signedIn/)
  assert.match(prompt, /onClick=\{onGoogle\}/)
  assert.doesNotMatch(prompt, /signInWithOAuth|localStorage|gtag|analytics|lead_created|report\/claim/)
  assert.doesNotMatch(prompt, /selector|secret|report\.title|clientId/)
})
