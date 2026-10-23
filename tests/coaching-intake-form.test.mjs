import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { COACHING_FIELDS, COACHING_FIELD_IDS, COACHING_GROUPS, COACHING_TOPICS, COACHING_INTAKE_VERSION } from '../lib/coaching/intake-model.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const form = read('components/coaching-intake-form.tsx')
const style = read('components/coaching-intake-form.module.css')
const repo = read('lib/app/coaching-intake.js')
const migration = read('supabase/migrations/20261023182500_hh_author_coaching_intake_private.sql')
const api = read('app/api/app/[...path]/route.js')
const page = read('app/[locale]/coaching/page.tsx')
const pageCss = read('app/[locale]/coaching/coaching-page.module.css')

test('author coaching model: pinned identity, valid multilingual groups, no fabricated score', () => {
  assert.match(COACHING_INTAKE_VERSION, /^hh-author-coaching-intake-v1-/)
  assert.equal(COACHING_GROUPS.length, 4)
  assert.equal(COACHING_FIELDS.length, 14)
  assert.equal(new Set(COACHING_FIELD_IDS).size, COACHING_FIELD_IDS.length)
  assert.equal(new Set(COACHING_GROUPS.map(g => g.id)).size, 4)
  assert.equal(new Set(COACHING_TOPICS.map(g => g.id)).size, COACHING_TOPICS.length)
  assert.deepEqual(COACHING_FIELDS.filter(q => q.required).map(q => q.id), ['request', 'idealOutcome', 'priorityQuestion'])
  for (const field of COACHING_FIELDS) {
    assert.ok(COACHING_GROUPS.some(group => group.id === field.group), field.id)
    assert.ok(Number.isInteger(field.max) && field.max >= 600 && field.max <= 1600, field.id)
    for (const locale of ['en', 'ru', 'es']) {
      assert.ok(field.label[locale]?.trim().length >= 18, field.id + ' ' + locale)
    }
  }
  for (const group of COACHING_GROUPS) for (const locale of ['en', 'ru', 'es']) {
    assert.ok(group.title[locale]?.trim())
    assert.ok(group.hint[locale]?.trim())
  }
  for (const topic of COACHING_TOPICS) for (const locale of ['en', 'ru', 'es']) {
    assert.ok(topic.label[locale]?.trim())
  }
})

test('coaching form is one page, text inputs plus up to eight user questions, no score/lead/autosend', () => {
  assert.match(form, /COACHING_GROUPS\.map/)
  assert.match(form, /COACHING_FIELDS\.filter/)
  assert.match(form, /COACHING_TOPICS\.map/)
  assert.match(form, /draft\.questions\.map/)
  assert.match(form, /draft\.questions\.length\s*>=\s*8/)
  assert.match(form, /missing\s*=\s*COACHING_FIELDS\.filter/)
  assert.match(form, /navigator\.clipboard\.writeText/)
  assert.match(form, /URL\.createObjectURL\(new Blob/)
  assert.match(form, /sessionStorage\.setItem/)
  assert.match(form, /sessionStorage\.removeItem/)
  assert.match(form, /continueTo:\s*"coaching-intake"/)
  assert.match(form, /"coaching-intake"/)
  assert.match(form, /consent:\s*true/)
  assert.match(form, /confirm\(t\.deleteConfirm\)/)
  assert.doesNotMatch(form, /fetch\(["']https?:\/\/|gtag\(|dataLayer\.push|whatsappEnquiryUrl|telegramEnquiryUrl|sendMessage|trackEvent/)
  assert.doesNotMatch(form, /autoPlay|autoplay|SpeechRecognition|recordAudio/)
  assert.match(form, /copyFailed/)
  assert.match(form, /accountConflict/)
  for (const locale of ['en', 'ru', 'es']) assert.match(form, new RegExp('^  ' + locale + ': \\{', 'm'))
})

test('server saves only user-approved AES-GCM account data with revision and owner checks', () => {
  assert.match(repo, /import \{ seal, openSealed \}/)
  assert.match(repo, /field:\s*'coaching\.intake'/)
  assert.match(repo, /app_private\.coaching_intakes/)
  assert.match(repo, /assertActive\(db,\s*actor\)/)
  assert.match(repo, /validateAnswers/)
  assert.match(repo, /validateQuestions/)
  assert.match(repo, /input\.consent !== true/)
  assert.match(repo, /COACHING_REQUIRED_ANSWERS/)
  assert.match(repo, /COACHING_REVISION_CONFLICT/)
  assert.match(repo, /input\.confirmed !== true/)
  assert.match(repo, /for update/)
  assert.match(repo, /account_id=\$1/)
  assert.doesNotMatch(repo, /marketing|analytics|client[_-]profiles|sendEmail|sendTelegram|sendWhatsApp/)
})

test('private schema RLS: only hh_app_backend with account ownership, no anonymous grants', () => {
  assert.match(migration, /create table if not exists app_private\.coaching_intakes/)
  assert.match(migration, /enable row level security/)
  assert.match(migration, /revoke all on table app_private\.coaching_intakes from public, anon, authenticated/)
  assert.match(migration, /grant select, insert, update, delete on app_private\.coaching_intakes to hh_app_backend/)
  for (const mode of ['select', 'insert', 'update', 'delete']) assert.match(migration, new RegExp('coaching_intake_owner_' + mode))
  assert.equal((migration.match(/account_id=\(select auth\.uid\(\)\)/g) || []).length, 5)
  assert.equal((migration.match(/app_private\.account_active\(\)/g) || []).length, 5)
  assert.doesNotMatch(migration, /security definer|grant .* on .* to anon|grant .* on .* to authenticated/i)
  assert.match(migration, /references app\.accounts\(id\) on delete cascade/)
})

test('API auth, origin, bounded body and OAuth safe redirect to localized coaching page', () => {
  assert.match(api, /const actor = await auth\.verified\(\)/)
  assert.match(api, /if \(method !== 'GET' && method !== 'HEAD'\) requireSameOrigin/)
  assert.match(api, /if \(joined === 'coaching-intake'\)/)
  assert.match(api, /request\.headers\.get\('x-hh-account-id'\) !== actor\.id/)
  assert.match(api, /readBody\(request, 40000\)/)
  assert.match(api, /op: 'coaching-intake-save'/)
  assert.match(api, /continueTo === 'coaching-intake'/)
  assert.match(api, /\$\{origin\}\/\$\{locale\}\/coaching/)
  assert.match(api, /\['enquiry','coaching-intake'\]/)
  assert.match(api, /'enquiry','coaching-intake'/)
  assert.doesNotMatch(repo, /hh_app_inbox|app\.crm_contacts/)
})

test('localized public entry, service discovery, 320–430 mobile styles and accessibility', () => {
  for (const locale of ['en', 'ru', 'es']) {
    assert.match(page, new RegExp('^  ' + locale + ': \\{', 'm'))
    assert.match(page, new RegExp('\\{ locale: "' + locale + '" \\}'))
    assert.match(page, new RegExp(locale + ': "/' + locale + '/coaching"'))
  }
  assert.match(page, /PublicSiteHeader/)
  assert.match(page, /CoachingIntakeForm/)
  assert.match(page, /metadataBaseFor/)
  assert.match(page, /course-start-heron\.webp/)
  const service = read('components/services-studio-offers.tsx')
  assert.match(service, /data-coaching-intake-link/)
  assert.match(service, /\/coaching/)
  assert.match(service, /freeFooter/)
  assert.match(style, /@media \(max-width: 520px\)/)
  assert.match(style, /@media \(max-width: 350px\)/)
  assert.match(pageCss, /@media \(max-width: 680px\)/)
  assert.match(style, /:focus-visible/)
  assert.match(form, /aria-valuenow/)
  assert.match(form, /aria-required/)
  assert.match(form, /role="alert"/)
  assert.match(style, /prefers-reduced-motion/)
})
