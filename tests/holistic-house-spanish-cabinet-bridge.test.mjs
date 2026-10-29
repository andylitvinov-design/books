import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {englishCabinetTarget} from '../lib/app/spanish-cabinet-bridge.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('Spanish app shortcuts open the existing signed-in workspace, not a streamed 404', () => {
  assert.equal(englishCabinetTarget(), '/en/app')
  assert.equal(englishCabinetTarget(['portrait']), '/en/app/portrait')
  assert.equal(englishCabinetTarget(['tests']), '/en/app/tests')
  assert.equal(englishCabinetTarget(['course'], {view:'courses'}), '/en/app/course?view=courses')
  assert.equal(englishCabinetTarget(['settings'], {section:'messages'}),
    '/en/app/settings?section=messages')
  const route = read('app/[locale]/app/[[...path]]/page.jsx')
  assert.match(route, /locale === 'es'[\s\S]*englishCabinetTarget\(path, await searchParams\)/)
  assert.match(route, /if \(!target\) notFound\(\)/)
  assert.match(route, /redirect\(target\)/)
  assert.ok(route.indexOf("locale === 'es'") < route.indexOf("!['en', 'ru'].includes(locale)"),
    'ES must not fall through to the EN/RU-only Next.js notFound')
})

test('bridge preserves safe account filters and cannot redirect outside the canonical host', () => {
  assert.equal(englishCabinetTarget(['course'], {courseId:'abc',tag:['a b','finanzas']}),
    '/en/app/course?courseId=abc&tag=a+b&tag=finanzas')
  assert.equal(englishCabinetTarget(['tests'], {'next':'https://evil.example/path','__proto__':'ignored'}),
    '/en/app/tests?next=https%3A%2F%2Fevil.example%2Fpath')
  for (const path of [['../admin'],['https://evil.example'],['..'],['portrait','foo','bar'],
    ['portrait?x=/'],[null],['portrait/../settings']]) {
    assert.equal(englishCabinetTarget(path),null)
  }
  assert.equal(englishCabinetTarget(['tests'],{'?x':'y',normal:22}),'/en/app/tests')
  assert.equal(englishCabinetTarget(['tests'],{giant:'x'.repeat(2049)}),'/en/app/tests')
})

test('ES saved-document link keeps the verified account and UUID authorization gate', () => {
  const source=read('app/[locale]/app/document-view/[id]/page.jsx')
  assert.match(source, /locale === 'es' && UUID\.test\(id \|\| ''\)/)
  assert.match(source, /redirect\('\/en\/app\/document-view\/' \+ encodeURIComponent\(id\)\)/)
  assert.match(source, /readSavedDocument\(config, store, actor, id, locale\)/)
  assert.match(source, /await createRequestAuth\(\{ cookies: cookieJar \}, config\)\.verified\(\)/)
})

test('Spanish messenger stays in Spanish; no duplicate install or private service worker cache', () => {
  const manifest=JSON.parse(read('public/holistic-house-app-es.webmanifest'))
  assert.equal(manifest.id,'/en/app')
  assert.equal(manifest.start_url,'/es/app/messages')
  assert.ok(manifest.shortcuts.some(s=>s.url==='/es/app/tests'))
  assert.ok(manifest.shortcuts.some(s=>s.url==='/es/app/course'))
  const messages=read('app/[locale]/app/messages/page.tsx')
  assert.match(messages,/\['en','ru','es'\]/)
  assert.doesNotMatch(messages,/englishCabinetTarget/)
  const sw=read('public/sw.js')
  assert.match(sw,/PRIVATE_PREFIXES/)
  assert.match(sw,/\/es\/app/)
  assert.match(sw,/network-only/)
})
