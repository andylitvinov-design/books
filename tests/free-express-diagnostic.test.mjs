import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { safePublicWhatsAppPath } from '../lib/whatsapp-enquiry.js'
import { normalizePublicServiceEnquiry } from '../lib/practitioners/public-service-enquiry-input.mjs'

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8')
const banner = read('components/home-free-diagnosis-banner.tsx')
const offers = read('components/direction-offers.tsx')
const styles = read('components/home-free-diagnosis-banner.module.css')

test('three topical pages show one stand-out, contextual free express offer immediately below the conversation', () => {
  assert.match(offers, /<HomeFreeDiagnosisBanner locale=\{locale\} context=\{direction === 'relationships' \? 'love' : direction\}/)
  assert.ok(offers.indexOf('<HomeFreeDiagnosisBanner') > offers.indexOf('data-direction-dialogue'))
  assert.ok(offers.indexOf('<HomeFreeDiagnosisBanner') < offers.indexOf('data-direction-topic-finder'))
  for (const key of ['energy','love','business','pro']) {
    assert.ok(banner.includes(key+': {'), key)
    assert.ok(styles.includes('data-express-context="'+key+'"'), key)
  }
  for (const text of [
    'Куда уходит ваша энергия?', 'Что мешает близости и доверию?',
    'Какой следующий шаг нужен вашему делу?', 'С чего начать ваш путь Профи?',
    'GRATIS · REVISIÓN EXPRÉS', 'FREE · EXPRESS SITUATION REVIEW',
    'БЕСПЛАТНАЯ ЭКСПРЕСС-ДИАГНОСТИКА',
  ]) assert.ok(banner.includes(text), text)
  assert.match(styles, /@media \(max-width: 365px\)/)
  assert.match(styles, /:focus-visible/)
})

test('all four free promos reuse original consented CRM transaction and truthful written offer', () => {
  assert.match(banner, /sourcePath: sourcePath\(locale, context\)/)
  assert.match(banner, /contactConsent: true/)
  assert.match(banner, /operationId: currentId/)
  assert.match(banner, /result\?\.saved !== true/)
  assert.match(banner, /data-lead-saved/)
  assert.match(banner, /not a medical diagnosis/i)
  assert.doesNotMatch(banner, /lead_created|payment_received|sendBeacon|localStorage/)
  for (const locale of ['en','ru','es']) {
    for (const theme of ['energy','love','business','pro']) {
      const path = '/'+locale+(theme==='pro'?'/pro':'/explore/'+theme)
      assert.equal(safePublicWhatsAppPath(path),path)
      const result = normalizePublicServiceEnquiry({
        operationId:'13b822f6-8d70-4b1c-b44e-d0c31ad1d82f',
        locale, sourcePath:path, serviceTitle:'Free drawing-based situation review',
        description:'Please send written-review instructions and questionnaire.',
      })
      assert.equal(result.sourcePath,path)
    }
  }
  for (const bad of ['/en/explore/client','/en/explore/business/private','/ru/pro/private',
    '/en/pro?email=test@example.org','/es/app/practice','/en/client/reports']) {
    assert.equal(safePublicWhatsAppPath(bad).includes('?'),false)
    if (!bad.includes('?')) assert.equal(safePublicWhatsAppPath(bad),'')
  }
})
