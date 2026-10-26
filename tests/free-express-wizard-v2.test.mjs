import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  FREE_EXPRESS_TTL_SECONDS, FREE_EXPRESS_SERVICE,
  isFreeExpressRequest, createFreeExpressToken, verifyFreeExpressToken,
  freeExpressMediaPath,
} from '../lib/practitioners/free-express-continuation.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const id = '9d891d6c-2b9a-410c-8fe2-850a0840169a'
const operationId = 'dcdd14de-ecb1-48d5-bdee-e6b22c6ac609'
const config = { encryptionKey: Buffer.alloc(32, 7) }
const now = Date.UTC(2026, 9, 25, 18, 0, 0)

test('free express capability is a signed one-hour same-record token, never a public reference', () => {
  const token = createFreeExpressToken({ id, operationId, createdAt: now }, config)
  assert.ok(!token.includes('HH-'))
  assert.deepEqual(verifyFreeExpressToken(token, config, now + 60000), { id, operationId, createdAt: now })
  assert.equal(verifyFreeExpressToken(token, config, now + (FREE_EXPRESS_TTL_SECONDS + 1) * 1000), null)
  assert.equal(verifyFreeExpressToken(token.slice(0, -2) + 'aa', config, now), null)
  assert.equal(verifyFreeExpressToken(token, { encryptionKey: Buffer.alloc(32, 1) }, now), null)
  assert.equal(verifyFreeExpressToken('HH-123456789ABC', config, now), null)
  assert.equal(verifyFreeExpressToken(token, config, now - 120000), null)
})

test('only actual existing free review services, locales and source paths can receive continuation', () => {
  for (const locale of ['en','ru','es']) {
    assert.ok(isFreeExpressRequest({
      locale, serviceTitle: FREE_EXPRESS_SERVICE[locale],
      sourcePath: '/' + locale + '/services/free-situation-review',
      contactConsent: true, contact: { phone: '+14165550123' },
    }))
  }
  assert.ok(!isFreeExpressRequest({ locale: 'ru', serviceTitle: FREE_EXPRESS_SERVICE.en,
    sourcePath: '/ru/services/free-situation-review', contactConsent: true, contact: {} }))
  assert.ok(!isFreeExpressRequest({ locale: 'en', serviceTitle: FREE_EXPRESS_SERVICE.en,
    sourcePath: '/en/services/free-situation-review', contactConsent: false, contact: {} }))
})

test('private media keys are per-day, per-enquiry and per-type without client filename', () => {
  assert.equal(freeExpressMediaPath(id, 'drawing', now), 'free-express/2026-10-25/' + id + '/drawing.jpg')
  assert.equal(freeExpressMediaPath(id, 'portrait', now), 'free-express/2026-10-25/' + id + '/portrait.jpg')
  assert.throws(() => freeExpressMediaPath('HH-123456789ABC','drawing',now))
  assert.throws(() => freeExpressMediaPath(id,'video',now))
})

test('landing reuses existing accordion and keeps the new multi-step path behind server release gate', () => {
  const landing = read('components/free-entry-landing.tsx')
  const capture = read('components/personal-express-enquiry.tsx')
  const wizard = read('components/free-express-wizard.tsx')
  assert.match(landing, /enableWizard=\{process\.env\.HH_FREE_EXPRESS_V2_ENABLED === "true"\}/)
  assert.match(capture, /FreeExpressWizard/)
  assert.match(capture, /data-express-inline-disclosure/)
  assert.match(capture, /!enableWizard && focus === "situation"/)
  assert.match(wizard, /data-free-express-lead/)
  assert.match(wizard, /data-free-express-questions/)
  assert.match(wizard, /data-free-express-media/)
  assert.match(wizard, /data-free-express-google/)
  assert.match(wizard, /data-free-express-complete/)
  assert.match(wizard, /COACHING_FIELDS/)
  assert.match(wizard, /"short" \| "detailed"/)
})

test('one initial first-party CRM write; sensitive follow-up never creates a second lead or uses messengers', () => {
  const wizard = read('components/free-express-wizard.tsx')
  const primary = read('app/api/service-enquiries/route.js')
  const update = read('app/api/free-express/route.js')
  const model = read('lib/practitioners/free-express-enquiry.js')
  assert.match(wizard, /fetch\("\/api\/service-enquiries"/)
  assert.match(wizard, /fetch\("\/api\/free-express"/)
  assert.doesNotMatch(wizard, /\/api\/coaching-diagnostic/)
  assert.match(primary, /createFreeExpressToken/)
  assert.ok(primary.indexOf('const result = await createPublicServiceEnquiry') <
    primary.indexOf('response.cookies.set(FREE_EXPRESS_COOKIE'))
  assert.match(update, /freeExpressProof/)
  assert.doesNotMatch(update, /createPublicServiceEnquiry/)
  assert.match(model, /set_config\('hh.public_enquiry_continuation'/)
  assert.match(model, /update app\.public_service_enquiries/)
  assert.doesNotMatch(model, /insert into app\.crm_contacts/)
  assert.match(wizard, /"My free written review request is registered\. "/)
  assert.doesNotMatch(wizard, /navigator\.clipboard|emitPublicAnalyticsEvent|ga4|metaPixel/)
})

test('RLS is deny-by-default, signed guest token needed; private owner read is checked', () => {
  const sql = read('supabase/migrations/20261026133321_hh_free_express_guest_continuation_rls_20261025.sql')
  const owner = read('lib/practitioners/free-express-owner.js')
  const media = read('lib/practitioners/free-express-media.js')
  const guestRoute = read('app/api/free-express/media/route.js')
  const claim = read('app/api/free-express/claim/route.js')
  assert.match(sql, /operation_id::text = current_setting\('hh\.public_enquiry_continuation', true\)/)
  assert.match(sql, /created_at > now\(\) - interval '1 hour'/)
  assert.match(sql, /force row level security/)
  assert.match(sql, /account_id\s*=\s*\(select\s+auth\.uid\(\)\)/)
  assert.match(owner, /trusted_auth_user_id=\$3/)
  assert.match(owner, /practitionerEmailAllowed/)
  assert.match(media, /FREE_EXPRESS_MEDIA_BUCKET/)
  assert.match(media, /data\.public !== false/)
  assert.match(media, /limitInputPixels: 20_000_000/)
  assert.match(media, /upsert: false/)
  assert.match(media, /purgeExpiredFreeExpressMedia/)
  assert.match(guestRoute, /freeExpressProof/)
  assert.match(guestRoute, /requireSameOrigin/)
  assert.match(claim, /auth\.verified\(\)/)
  assert.match(claim, /on conflict \(enquiry_id\) do nothing/)
})

test('iPhone large photos are reduced locally before private server upload, without exposing files or relaxing limits', () => {
  const photo = read('lib/practitioners/free-express-photo-client.ts')
  const wizard = read('components/free-express-wizard.tsx')
  assert.match(photo, /EXPRESS_MAX_SOURCE_BYTES = 12_000_000/)
  assert.match(photo, /EXPRESS_MAX_UPLOAD_BYTES = 2_750_000/)
  assert.match(photo, /createImageBitmap/)
  assert.match(photo, /canvas\.toBlob/)
  assert.match(photo, /image\/jpeg/)
  assert.match(photo, /new File\(\[blob\], "free-review\.jpg"/)
  assert.match(photo, /new FileReader\(\)/)
  assert.match(photo, /image\.close\(\)/)
  assert.doesNotMatch(photo, /fetch\(|sendBeacon\(|https:\/\//)
  assert.match(wizard, /prepareFreeExpressPhoto\(selected\)/)
  assert.match(wizard, /setError\(t\.mediaTooLarge\)/)
  const css = read('components/free-express-wizard.module.css')
  assert.match(css, /currentStep/)
  assert.match(css, /span small\{display:none\}/)
  assert.match(wizard, /aria-current=\{i === step \? "step" : undefined\}/)
})

test('Vercel bundles native Sharp libvips only inside protected free-express media handler', () => {
  const config = read('next.config.ts')
  const marker = '"/api/free-express/media": ['
  const begin = config.indexOf(marker)
  assert.ok(begin > 0, 'Private upload route must include traced native dependencies')
  const end = config.indexOf('],', begin)
  const scoped = config.slice(begin, end + 2)
  assert.match(scoped, /@img\/sharp-linux-x64/)
  assert.match(scoped, /@img\/sharp-libvips-linux-x64/)
  assert.ok(scoped.length < 400, 'Do not package native media assets in all functions')
})
