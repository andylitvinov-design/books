import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomBytes, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import {
  createFreeExpressToken, verifyFreeExpressToken, isFreeExpressRequest,
  freeExpressMediaPath, FREE_EXPRESS_COOKIE, FREE_EXPRESS_SERVICE,
  FREE_EXPRESS_CONTEXT_MARK, FREE_EXPRESS_TTL_SECONDS,
} from '../lib/practitioners/free-express-continuation.mjs'

const root = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const config = { encryptionKey: randomBytes(32) }
const now = Date.parse('2026-10-25T19:30:00Z')

test('strong short-lived continuation is tied to the original server request, not the public reference', () => {
  const id = randomUUID(), operationId = randomUUID()
  const proof = createFreeExpressToken({ id, operationId, createdAt: now }, config)
  assert.match(proof, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/)
  assert.equal(verifyFreeExpressToken(proof, config, now + 5000)?.id, id)
  assert.equal(verifyFreeExpressToken(proof, config, now + 5000)?.operationId, operationId)
  assert.equal(verifyFreeExpressToken(proof, config, now + 3601_000), null)
  assert.equal(verifyFreeExpressToken(proof, { encryptionKey: randomBytes(32) }, now), null)
  assert.equal(verifyFreeExpressToken('HH-' + id.slice(0,12).toUpperCase(), config), null)
  const tampered = proof.slice(0, -4) + 'AAAA'
  assert.equal(verifyFreeExpressToken(tampered, config, now), null)
  assert.equal(FREE_EXPRESS_TTL_SECONDS, 3600)
  assert.equal(FREE_EXPRESS_COOKIE, 'hh_free_express_v2')
})

test('the exact one-service/three-language category authorizes continuation', () => {
  for (const locale of ['en','ru','es']) {
    assert.equal(isFreeExpressRequest({
      locale, sourcePath: '/' + locale + '/services/free-situation-review',
      serviceTitle: FREE_EXPRESS_SERVICE[locale], contactConsent: true,
      contact: { phone: '+14165550123' },
    }), true)
  }
  assert.equal(isFreeExpressRequest({ locale: 'ru', sourcePath: '/ru/services/free-situation-review',
    serviceTitle: FREE_EXPRESS_SERVICE.ru, contactConsent: false, contact: {} }), false)
  assert.equal(isFreeExpressRequest({ locale: 'en', sourcePath: '/en/services/dao-health-profile',
    serviceTitle: FREE_EXPRESS_SERVICE.en, contactConsent: true, contact: {} }), false)
})

test('media filenames are exactly portrait or drawing and partitioned by submission date', () => {
  const id = randomUUID()
  assert.equal(freeExpressMediaPath(id, 'portrait', now),
    'free-express/2026-10-25/' + id + '/portrait.jpg')
  assert.equal(freeExpressMediaPath(id, 'drawing', now),
    'free-express/2026-10-25/' + id + '/drawing.jpg')
  assert.throws(() => freeExpressMediaPath(id, '../public', now))
  assert.throws(() => freeExpressMediaPath('HH-ABC', 'portrait', now))
})

test('one CRM-first lead, not a second full questionnaire lead, and plain text never enters analytics/messengers', () => {
  const landing = root('components/personal-express-enquiry.tsx')
  const form = root('components/free-express-wizard.tsx')
  const store = root('lib/practitioners/free-express-enquiry.js')
  const route = root('app/api/service-enquiries/route.js')
  assert.match(landing, /<FreeExpressWizard locale=\{locale\}/)
  assert.match(landing, /enableWizard/)
  assert.match(form, /fetch\("\/api\/service-enquiries"/)
  assert.match(form, /fetch\("\/api\/free-express"/)
  assert.match(form, /fetch\("\/api\/free-express\/media"/)
  assert.match(form, /fetch\("\/api\/free-express\/claim"/)
  assert.doesNotMatch(form, /\/api\/coaching-diagnostic/)
  assert.doesNotMatch(store, /insert into app\.public_service_enquiries|insert into app\.crm_contacts/)
  assert.match(store, /update app\.public_service_enquiries/)
  assert.match(store, /withFreeExpressRequest/)
  assert.match(store, /free-express-details-v2/)
  assert.match(route, /response\.cookies\.set\(FREE_EXPRESS_COOKIE/)
  assert.match(route, /createFreeExpressToken/)
  assert.match(route, /maxAge:/)
  assert.match(form, /receipt\.referenceCode/)
  assert.doesNotMatch(form, /sendBeacon|gtag\(|fbq\(|localStorage/)
  assert.match(form, /request: "My free written review request is registered\. " \+ t\.ref/)
  assert.match(FREE_EXPRESS_CONTEXT_MARK, /visitor consent/)
})

test('backend RLS and account claims require verified scope and preserve existing roles', () => {
  const sql = root('supabase/migrations/20261025191500_hh_free_express_guest_continuation_rls.sql')
  assert.match(sql, /hh\.public_enquiry_continuation/)
  assert.match(sql, /created_at > now\(\) - interval '1 hour'/)
  assert.match(sql, /source_path ~/)
  assert.match(sql, /enable row level security/)
  assert.match(sql, /force row level security/)
  assert.match(sql, /revoke\s+all\s+on\s+app_private\.free_express_account_links\s+from\s+public\s*,\s*anon\s*,\s*authenticated\s*,\s*hh_app_inbox\s*;/i)
  assert.doesNotMatch(sql, /grant\s+(select|update).*\s+to\s+(anon|authenticated)/i)
  const guest = root('app/api/free-express/route.js')
  const media = root('app/api/free-express/media/route.js')
  const claim = root('app/api/free-express/claim/route.js')
  for (const r of [guest, media, claim]) assert.match(r, /HH_FREE_EXPRESS_V2_ENABLED/)
  for (const r of [guest, media, claim]) assert.match(r, /requireSameOrigin/)
  assert.match(claim, /actor = await auth\.verified\(\)/)
  assert.match(claim, /freeExpressProof\(request, config\)/)
  const owner = root('lib/practitioners/free-express-owner.js')
  assert.match(owner, /practitionerEmailAllowed\(actor\)/)
  assert.match(owner, /p\.trusted_auth_user_id=\$3/)
  assert.match(root('components/app/practice-workspace.jsx'), /FreeExpressOwnerMedia/)
})

test('private media are never public, decoded, EXIF-stripped and owner-scoped', () => {
  const media = root('lib/practitioners/free-express-media.js')
  const route = root('app/api/app/practice/free-express/[id]/media/[kind]/route.js')
  assert.match(media, /data\.public !== false/)
  assert.match(media, /limitInputPixels: 20_000_000/)
  assert.match(media, /\.rotate\(\)\.resize/)
  assert.match(media, /\.jpeg\(/)
  assert.match(media, /upsert: false/)
  assert.match(media, /consent !== true/)
  assert.doesNotMatch(media, /storage\/v1\/object\/public/)
  assert.match(route, /authorizedFreeExpressOwnerMedia/)
  assert.match(route, /'Cache-Control': 'private, no-store/)
  assert.match(root('app/api/internal/housekeeping/route.js'), /purgeExpiredFreeExpressMedia/)
})

test('client wizard preserves single existing page / details, EN/RU/ES, keyboard and responsive UI', () => {
  const form = root('components/free-express-wizard.tsx')
  const css = root('components/free-express-wizard.module.css')
  for (const key of ['en:', 'ru:', 'es:']) assert.match(form, new RegExp(key))
  for (const key of ['short','detailed','portrait','drawing']) assert.ok(form.includes(key))
  assert.match(form, /COACHING_FIELDS\.filter/)
  assert.match(form, /fieldsShort/)
  assert.match(form, /replyConsent/)
  assert.match(form, /imageConsent/)
  assert.match(form, /data-free-express-complete/)
  assert.match(css, /@media\(max-width:430px\)/)
  assert.match(css, /focus-visible/)
  assert.match(css, /prefers-reduced-motion/)
  assert.match(root('components/personal-express-enquiry.module.css'), /disclosure\[hidden\]/)
})
