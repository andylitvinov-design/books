import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const workspace = read('components/app/app-workspace.jsx')
const css = read('components/app/consultation-offers.module.css')
const start = workspace.indexOf('function Consultations(')
const end = workspace.indexOf('function RequestForm(', start)
const consultations = workspace.slice(start, end)

test('existing authenticated consultation request is retained with no parallel booking flow', () => {
  assert.match(workspace, /appFetch\('requests', body\)/)
  assert.match(workspace, /operationId: crypto\.randomUUID\(\)/)
  assert.match(workspace, /shareConfirmed: confirmed/)
  assert.match(workspace, /<PracticeRequestConversation/)
  assert.match(consultations, /onDone=\{async \(\) => \{/)
  assert.match(consultations, /await reload\(\)/)
  assert.match(consultations, /No appointment is confirmed yet/)
})

test('journey deep link selects its service once; close cannot immediately reopen it', () => {
  assert.match(consultations, /handledDeepLink = useRef\(''\)/)
  assert.match(consultations, /handledDeepLink\.current === initialServiceId/)
  assert.match(consultations, /handledDeepLink\.current = initialServiceId/)
  assert.match(consultations, /close=\{\(\) => setSelected\(null\)\}/)
  assert.match(consultations, /requestRef\.current\?\.scrollIntoView\?/)
  assert.ok(consultations.indexOf('id="hh-consultation-request"') < consultations.indexOf('data-consultation-photo-cards'))
  assert.match(read('components/app/cabinet-journey.jsx'), /app\/consultations\?service=/)
})

test('all live service cards show an image on the left and transparent price/CTA', () => {
  assert.match(consultations, /services\.map\(\(service\) => \{/)
  assert.match(consultations, /data-consultation-photo-card=\{service\.slug \|\| service\.id\}/)
  assert.match(consultations, /<Image src=\{consultationPhotoFor\(service\)\} alt="" fill/)
  assert.match(consultations, /offer\.shortDescription \|\| offer\.description/)
  assert.match(consultations, /consultationPriceFor\(service, locale, c\.price\)/)
  assert.match(workspace, /service\.pricingMode === 'free'/)
  assert.match(workspace, /service\.pricingMode !== 'contact'/)
  assert.match(consultations, /Ask about an introduction/)
  assert.match(css, /grid-template-columns: minmax\(116px, 32%\) minmax\(0, 1fr\)/)
  assert.match(css, /@media \(max-width: 480px\)/)
  assert.match(css, /@media \(max-width: 350px\)/)
  assert.match(css, /\.action:focus-visible/)
})

test('new cards use approved local photo assets without implying other masters are Andrey', () => {
  const images = [
    'andy-about.png',
    'reiki-practitioner-sunrise.webp',
    'books-library.webp',
    'course-focus-mountain-boy.webp',
    'hero-olive-incense.webp',
  ]
  for (const name of images) {
    assert.ok(existsSync(new URL('../public/images/holistic-house/' + name, import.meta.url)), name)
  }
  assert.match(workspace, /if \(service\.slug === 'free-intro-availability-request'\) return '\/images\/holistic-house\/andy-about\.png'/)
  assert.match(workspace, /return '\/images\/holistic-house\/hero-olive-incense\.webp'/)
  assert.match(css, /\.photo img \{ object-fit: cover/)
  assert.match(css, /\.card \{ grid-template-columns: 100px minmax\(0, 1fr\)/)
})
