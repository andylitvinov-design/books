import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { serviceCopy } from '../lib/practitioners/contracts.js'

// Exercise the real resolver and canonical copy contract without loading a
// database driver. The transaction wrapper is deliberately unusable in this suite.
const source = readFileSync(new URL('../lib/practitioners/telegram-service-offering.js', import.meta.url), 'utf8')
const isolated = source
  .replace(/^import 'server-only'\n/m, '')
  .replace(/^import \{ transaction \} from '\.\.\/app\/database\.js'\n/m,
    "const transaction = () => { throw new Error('NO_DATABASE_IN_UNIT_TEST') }\n")
  .replace("from './contracts.js'",
    `from ${JSON.stringify(new URL('../lib/practitioners/contracts.js', import.meta.url).href)}`)
const { findPublishedTelegramOffering } = await import(
  'data:text/javascript;base64,' + Buffer.from(isolated).toString('base64'))

const serviceId = '81a7a777-b789-4f06-a4e7-e54a55df053e'
const otherId = '22222222-2222-4222-8222-222222222222'
const fixture = {
  id: serviceId, practitioner_id: '99999999-9999-4999-8999-999999999999',
  slug: 'synthetic-service', practitioner_slug: 'synthetic-practitioner',
  trusted_auth_user_id: '11111111-1111-4111-8111-111111111111',
  public_profile: { displayName: 'Synthetic practitioner' },
  localized_copy: { en: { title: 'Synthetic service' } },
  discovery_metadata: { displayLocales: ['en', 'ru', 'es'] },
  active: true, status: 'published', practitioner_active: true, practitioner_status: 'approved',
}
const normalizeSql = sql => sql.replace(/\s+/g, ' ').trim()
const expectedSql = normalizeSql(`
  select s.id, s.practitioner_id, s.slug, s.localized_copy, s.discovery_metadata,
    p.slug as practitioner_slug, p.trusted_auth_user_id, p.public_profile
  from app.service_offerings s
  join app.practitioners p on p.id = s.practitioner_id
  where s.id = $1 and s.active and s.status = 'published'
    and s.localized_copy <> '{}'::jsonb
    and p.active and p.status = 'approved'
    and p.public_profile <> '{}'::jsonb
    and p.trusted_auth_user_id is not null
  limit 1`)

function fakeDatabase(row) {
  const calls = []
  return {
    calls,
    async query(sql, args) {
      calls.push({ sql, args })
      // This is a query-contract check, not a claim of live PostgreSQL/RLS proof.
      // Keep every existing eligibility predicate and parameterized service ID.
      assert.equal(normalizeSql(sql), expectedSql)
      assert.equal(args.length, 1)
      const eligible = row && row.id === args[0] && row.active && row.status === 'published' &&
        row.practitioner_active && row.practitioner_status === 'approved' &&
        row.trusted_auth_user_id != null && Object.keys(row.localized_copy || {}).length > 0 &&
        Object.keys(row.public_profile || {}).length > 0
      return { rows: eligible ? [row] : [] }
    },
  }
}

const fallbackCases = [
  ['empty RU object', { ru: {}, en: { title: 'English fixture' } }, 'ru', 'English fixture'],
  ['missing EN', { ru: { title: 'Русский пример' } }, 'en', 'Русский пример'],
  ['empty ES object', { es: {}, en: { title: 'English fixture' } }, 'es', 'English fixture'],
  ['empty local title', { ru: { title: '' }, en: { title: 'English fixture' } }, 'ru', 'English fixture'],
  ['RU before ES fallback', { ru: { title: 'Русский пример' }, es: { title: 'Ejemplo' } }, 'en', 'Русский пример'],
  ['ES-only fallback', { en: {}, ru: {}, es: { title: 'Ejemplo' } }, 'ru', 'Ejemplo'],
  ['EN before RU fallback', { en: { title: 'English fixture' }, ru: { title: 'Русский пример' } }, 'es', 'English fixture'],
]
for (const [label, localized_copy, locale, expectedTitle] of fallbackCases) {
  test(`Telegram uses canonical title-aware fallback: ${label}`, async () => {
    const row = { ...fixture, localized_copy }
    const db = fakeDatabase(row)
    const result = await findPublishedTelegramOffering(db, serviceId, locale)
    assert.equal(serviceCopy(row, locale).title, expectedTitle)
    assert.ok(result)
    assert.equal(result.title, expectedTitle)
    assert.equal(result.id, row.id)
    assert.equal(result.practitionerId, row.practitioner_id)
    assert.equal(result.ownerId, row.trusted_auth_user_id)
    assert.equal(result.practitionerSlug, row.practitioner_slug)
    assert.equal(result.serviceSlug, row.slug)
    assert.equal(result.practitionerName, row.public_profile.displayName)
    assert.equal(db.calls.length, 1)
    assert.deepEqual(db.calls[0].args, [serviceId])
  })
}

test('requested title takes precedence in EN/RU/ES; default stays EN and trimming stays intact', async () => {
  const row = { ...fixture, localized_copy: {
    en: { title: ' English ' }, ru: { title: ' Русский ' }, es: { title: ' Español ' },
  } }
  for (const locale of ['en', 'ru', 'es']) {
    const result = await findPublishedTelegramOffering(fakeDatabase(row), serviceId, locale)
    assert.equal(result.title, serviceCopy(row, locale).title.trim())
  }
  assert.equal((await findPublishedTelegramOffering(fakeDatabase(row), serviceId)).title, 'English')
})

test('malformed IDs and unsupported locales fail before any query', async () => {
  const db = fakeDatabase(fixture)
  for (const id of ['', null, undefined, 'not-a-uuid', serviceId + '?owner=' + otherId]) {
    assert.equal(await findPublishedTelegramOffering(db, id, 'en'), null)
  }
  for (const locale of ['fr', 'EN', '', null, '../ru']) {
    assert.equal(await findPublishedTelegramOffering(db, serviceId, locale), null)
  }
  assert.equal(db.calls.length, 0)
})

test('fallback does not widen published/approved eligibility or change the selected recipient', async () => {
  const unavailable = [
    null, { ...fixture, id: otherId }, { ...fixture, active: false },
    ...['draft', 'submitted', 'changes_requested', 'paused', 'suspended', 'archived']
      .map(status => ({ ...fixture, status })),
    { ...fixture, practitioner_active: false },
    ...['draft', 'submitted', 'changes_requested', 'suspended', 'rejected', 'archived']
      .map(practitioner_status => ({ ...fixture, practitioner_status })),
    { ...fixture, trusted_auth_user_id: null },
    { ...fixture, public_profile: {} }, { ...fixture, localized_copy: {} },
  ]
  for (const row of unavailable) {
    const db = fakeDatabase(row)
    assert.equal(await findPublishedTelegramOffering(db, serviceId, 'ru'), null)
    assert.equal(db.calls.length, 1)
  }
  const row = { ...fixture, practitioner_id: otherId, trusted_auth_user_id: otherId,
    localized_copy: { ru: {}, en: { title: 'English fixture' } } }
  const result = await findPublishedTelegramOffering(fakeDatabase(row), serviceId, 'ru')
  assert.equal(result.practitionerId, otherId)
  assert.equal(result.ownerId, otherId)
})

test('ES discovery exclusion remains terminal even when fallback has a valid title', async () => {
  for (const discovery_metadata of [{ displayLocales: ['en', 'ru'] }, { displayLocales: [] }, { other: true }]) {
    const row = { ...fixture, discovery_metadata, localized_copy: { es: {}, en: { title: 'English fixture' } } }
    assert.equal(await findPublishedTelegramOffering(fakeDatabase(row), serviceId, 'es'), null)
    assert.equal((await findPublishedTelegramOffering(fakeDatabase(row), serviceId, 'ru')).title, 'English fixture')
  }
  // Existing legacy behavior for absent/empty discovery metadata is unchanged.
  for (const discovery_metadata of [null, undefined, {}]) {
    assert.equal((await findPublishedTelegramOffering(fakeDatabase({ ...fixture, discovery_metadata }), serviceId, 'es')).title,
      'Synthetic service')
  }
})

test('missing, malformed, control-containing and oversized selected titles still fail closed', async () => {
  for (const title of [undefined, null, '', '   ', 42, {}, 'x'.repeat(161), 'bad\u0000title', 'bad\ntitle', 'bad\u007ftitle']) {
    const row = { ...fixture, localized_copy: { en: { title } } }
    assert.equal(await findPublishedTelegramOffering(fakeDatabase(row), serviceId, 'ru'), null)
  }
  // Do not silently replace an invalid, truthy selected title with another locale.
  for (const title of ['   ', 42, 'x'.repeat(161), 'bad\ntitle']) {
    const row = { ...fixture, localized_copy: { ru: { title }, en: { title: 'Valid English' } } }
    assert.equal(await findPublishedTelegramOffering(fakeDatabase(row), serviceId, 'ru'), null)
  }
  const row = { ...fixture, localized_copy: { ru: {}, en: { title: 'x'.repeat(160) } } }
  assert.equal((await findPublishedTelegramOffering(fakeDatabase(row), serviceId, 'ru')).title.length, 160)
})
