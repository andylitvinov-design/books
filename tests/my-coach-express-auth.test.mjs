import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8')

test('Mira hero opens the existing Google/Telegram express sign-in only for verified guests', () => {
  const catalog = read('components/my-coach-catalog.jsx')
  const modal = read('components/my-coach-express-start.jsx')
  const css = read('components/my-coach-express-start.module.css')
  assert.match(catalog, /<MyCoachExpressStart locale=\{lang\}/)
  assert.match(modal, /data-my-coach-mira-talk/)
  assert.match(modal, /fetch\('\/api\/app\/auth\/status'/)
  assert.match(modal, /if \(response\.ok\) \{[\s\S]*?coachSessionHref\(lang, 'mira'\)/)
  assert.match(modal, /if \(response\.status === 401\) \{[\s\S]*?setIsOpen\(true\)/)
  assert.match(modal, /<dialog ref=\{dialogRef\}/)
  assert.match(modal, /onCancel=\{\(\) => setIsOpen\(false\)\}/)
  assert.match(css, /\.dialog::backdrop/)
  assert.match(css, /max-width:540px/)
})

test('Mira express auth reuses server PKCE and allows Telegram only when explicitly available', () => {
  const modal = read('components/my-coach-express-start.jsx')
  const route = read('app/api/app/[...path]/route.js')
  assert.match(modal, /fetch\('\/api\/app\/auth\/providers'/)
  assert.match(modal, /setTelegramAvailable\(value\?\.telegram === true\)/)
  assert.match(modal, /telegramAvailable && <button/)
  assert.match(modal, /continueTo: 'my-coach-mira', provider/)
  assert.match(modal, /data-my-coach-auth-google/)
  assert.match(modal, /data-my-coach-auth-telegram/)
  assert.match(route, /joined === 'auth\/status' && method === 'GET'[\s\S]*?await auth\.verified\(\)/)
  assert.match(route, /'my-coach-mira'\]\.includes\(body\.continueTo\)/)
  assert.match(route, /'my-coach-mira'\]\.includes\(url\.searchParams\.get\('continue'\)\)/)
  assert.match(route, /continueTo === 'my-coach-mira'[\s\S]*?coaching\/sessions\?coach=mira/)
  assert.match(route, /continueTo === 'my-coach-mira' \? \x60\$\{origin\}\/\$\{locale\}\/my-coach\x60/)
  assert.doesNotMatch(modal, /localStorage|sessionStorage|signInAnonymously|telegram-bot/)
  assert.doesNotMatch(modal, /returnPath|accountToken|service_role|SUPABASE_SERVICE_ROLE_KEY/)
})
