import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8')

test('public test picker explains Google sign-in before asking visitors to select topics', () => {
  const source = read('components/app/simple-test-picker.jsx')
  const notice = source.indexOf('data-prelogin-google-notice')
  const firstTopic = source.indexOf('id="hh-simple-topic-title"')
  assert.ok(notice > 0 && firstTopic > notice, 'access information must precede topic selection')
  assert.match(source, /Starting a selected test set requires Google sign-in/)
  assert.match(source, /Для запуска выбранного набора тестов потребуется Google/)
  assert.match(source, /Para iniciar una selección de pruebas se requiere Google/)
  assert.match(source, /\/client\x60\} prefetch=\{false\}>\{c\.guestAction\}/)
})

test('homepage advertises the real login requirement and an optional guest entry', () => {
  const source = read('components/home-free-tests-banner.tsx')
  assert.match(source, /starting a full test set requires Google sign-in/)
  assert.match(source, /для запуска полного набора тестов нужен Google/)
  assert.match(source, /href=\{\x60\/\$\{locale\}\/client\x60\}/)
})

test('public selector keeps explicit Google intent flow for saved full batteries', () => {
  const source = read('components/app/public-test-explorer.jsx')
  assert.match(source, /request\('auth\/start'/)
  assert.match(source, /PENDING_TEST_SELECTION_KEY/)
})
