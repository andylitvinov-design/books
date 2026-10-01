import assert from 'node:assert/strict'
import test from 'node:test'

import { builtInSiteVideoRecords, existingAboutIntroVideo, existingAboutIntroVideoRu, existingAboutIntroVideoEs, existingHomeIntroVideoEn, existingServicesIntroVideoEn, existingHomeopathyIntroVideoEn } from '../lib/site-videos/defaults.js'
import { SiteVideoError, isSiteVideoRecord, prepareVideoChange, toPublishedSiteVideo } from '../lib/site-videos/model.js'
import { createSiteVideoStore } from '../lib/site-videos/store.js'

const namespace = 'holistic-house:site-videos:v1'
const aboutKey = 'about-intro:en'
const ruAboutKey = 'about-intro:ru'
const esAboutKey = 'about-intro:es'
const homeKey = 'home-intro:en'
const servicesKey = 'services-intro:en'
const homeopathyKey = 'homeopathy-intro:en'
const defaultKeys = [aboutKey, esAboutKey, ruAboutKey, homeKey, servicesKey, homeopathyKey].sort()
const youtubeId = 'OkLEN8Zb-sY'
const timestamp = '2026-09-30T01:00:00.000Z'
const environment = {
  NODE_ENV: 'production',
  PRESCRIPTIONS_KV_REST_API_URL: 'https://video-defaults-test.invalid',
  PRESCRIPTIONS_KV_REST_API_TOKEN: 'synthetic-defaults-test-token',
}
const errorCode = code => error => error instanceof SiteVideoError && error.code === code
const change = {
  slot: 'about-intro', locale: 'en', intent: 'publish',
  youtubeUrl: `https://youtu.be/${youtubeId}`, title: 'An approved replacement', reviewed: true,
}

function restFixture({ objectResult = false } = {}) {
  const hash = new Map()
  const commands = []
  const fetchFn = async (url, options) => {
    assert.equal(url, environment.PRESCRIPTIONS_KV_REST_API_URL)
    assert.equal(options.method, 'POST')
    assert.equal(options.cache, 'no-store')
    assert.equal(options.redirect, 'error')
    assert.equal(options.headers.Authorization, `Bearer ${environment.PRESCRIPTIONS_KV_REST_API_TOKEN}`)
    const command = JSON.parse(options.body)
    commands.push(command)
    let result
    if (command[0] === 'HGETALL') {
      assert.equal(command[1], namespace)
      result = objectResult ? Object.fromEntries(hash) : [...hash.entries()].flat()
    } else if (command[0] === 'HGET') {
      assert.equal(command[1], namespace)
      result = hash.get(command[2]) ?? null
    } else if (command[0] === 'EVAL') {
      const [, script, count, key, field, expectedRevision, serialized] = command
      assert.equal(count, 1)
      assert.equal(key, namespace)
      assert.match(script, /redis\.call\('HGET'/)
      assert.match(script, /redis\.call\('HSET'/)
      let previous
      try { previous = hash.has(field) ? JSON.parse(hash.get(field)) : undefined } catch { previous = null }
      const matches = hash.has(field)
        ? previous?.key === field && Number.isInteger(previous.revision) && previous.revision >= 1 && previous.revision === expectedRevision
        : expectedRevision === 0
      result = matches ? 1 : 0
      if (matches) hash.set(field, serialized)
    } else assert.fail('Unexpected storage command')
    return { ok: true, json: async () => ({ result }) }
  }
  return { hash, commands, fetchFn }
}

function configuredStore(database) {
  return createSiteVideoStore({ environment, fetchFn: database.fetchFn, initialRecords: builtInSiteVideoRecords() })
}

test('the built-in publications include independent English, Russian and Spanish About intros', async () => {
  const defaults = builtInSiteVideoRecords()
  assert.equal(defaults.length, 6)
  assert.deepEqual(defaults.map(record => record.key).sort(), defaultKeys)
  assert.ok(defaults.every(record => record.revision === 0 && isSiteVideoRecord(record)))
  assert.deepEqual(toPublishedSiteVideo(defaults[0]), existingAboutIntroVideo)
  assert.deepEqual(toPublishedSiteVideo(defaults[1]), existingAboutIntroVideoRu)
  assert.deepEqual(toPublishedSiteVideo(defaults[2]), existingAboutIntroVideoEs)
  assert.equal(existingAboutIntroVideo.heygenId, 'fd5fcead9b067f9a0649862675a38771')
  assert.equal(existingAboutIntroVideoRu.heygenId, 'd4e55c984e54b40fbeb8a21f81d27694')
  assert.equal(existingHomeIntroVideoEn.heygenId, 'ed202847a43a96b918308aa972177b34')
  assert.equal(existingServicesIntroVideoEn.heygenId, '48105a2f2228e7cb3a67391e97acaf8b')
  assert.equal(existingHomeopathyIntroVideoEn.heygenId, '34df311e461509433b45929908a9097a')
  const database = restFixture()
  const store = configuredStore(database)
  assert.deepEqual(toPublishedSiteVideo(await store.get(ruAboutKey)), existingAboutIntroVideoRu)
  assert.deepEqual(toPublishedSiteVideo(await store.get(homeKey)), existingHomeIntroVideoEn)
  assert.deepEqual((await store.list()).map(record => record.key).sort(), defaultKeys)
  assert.equal(database.hash.size, 0)
  assert.equal(database.commands.filter(command => command[0] === 'EVAL').length, 0)
})

test('reading a missing override returns independent virtual records without persisting them', async () => {
  const database = restFixture()
  const store = configuredStore(database)
  const first = await store.get(aboutKey)
  first.draft.title = 'Mutation of an editor response'
  first.published.title = 'Mutation of public response'
  assert.equal((await store.get(aboutKey)).published.title, existingAboutIntroVideo.title)
  const list = await store.list()
  list[0].published.title = 'Mutation of a list response'
  assert.equal((await store.list())[0].published.title, existingAboutIntroVideo.title)
  assert.equal(builtInSiteVideoRecords()[0].published.title, existingAboutIntroVideo.title)
  assert.equal(database.hash.size, 0)
})

test('the first approved change persists revision one and takes precedence after process recreation', async () => {
  const database = restFixture()
  const firstProcess = configuredStore(database)
  const previous = await firstProcess.get(aboutKey)
  const next = prepareVideoChange(previous, change, timestamp)
  assert.equal(previous.revision, 0)
  assert.equal(next.revision, 1)
  await firstProcess.save(next, previous.revision)
  const secondProcess = configuredStore(database)
  assert.deepEqual(await secondProcess.get(aboutKey), next)
  assert.deepEqual((await secondProcess.list()).map(record => record.key), [aboutKey, esAboutKey, ruAboutKey])
  const video = toPublishedSiteVideo(await secondProcess.get(aboutKey))
  assert.equal(video.youtubeId, youtubeId)
  assert.equal(video.heygenId, undefined)
  assert.equal(JSON.parse(database.hash.get(aboutKey)).revision, 1)
})

test('saving the first draft preserves the existing live intro through durable reload', async () => {
  const database = restFixture()
  const store = configuredStore(database)
  const previous = await store.get(aboutKey)
  const edited = prepareVideoChange(previous, { ...change, intent: 'draft', reviewed: false }, timestamp)
  await store.save(edited, 0)
  const reloaded = await configuredStore(database).get(aboutKey)
  assert.equal(reloaded.revision, 1)
  assert.equal(reloaded.draft.youtubeId, youtubeId)
  assert.equal(reloaded.draft.heygenId, undefined)
  assert.deepEqual(toPublishedSiteVideo(reloaded), existingAboutIntroVideo)
  assert.deepEqual(reloaded.published, previous.published)
})

test('a persisted hide overrides the built-in on both list and get after reload', async () => {
  for (const objectResult of [false, true]) {
    const database = restFixture({ objectResult })
    const store = configuredStore(database)
    const previous = await store.get(aboutKey)
    const hidden = prepareVideoChange(previous, { slot: 'about-intro', locale: 'en', intent: 'hide' }, timestamp)
    await store.save(hidden, 0)
    const reloaded = configuredStore(database)
    assert.deepEqual(await reloaded.get(aboutKey), hidden)
    assert.deepEqual((await reloaded.list()).map(record => record.key), [aboutKey, esAboutKey, ruAboutKey])
    assert.equal(toPublishedSiteVideo(await reloaded.get(aboutKey)), undefined)
    assert.deepEqual((await reloaded.list()).map(toPublishedSiteVideo).filter(Boolean), [existingAboutIntroVideoEs, existingAboutIntroVideoRu])
    assert.deepEqual(hidden.draft, previous.draft)
  }
})

test('malformed, private and invalid-revision overrides suppress the built-in instead of resurrecting it', async () => {
  const initial = builtInSiteVideoRecords()[0]
  const otherwiseValid = prepareVideoChange(initial, change, timestamp)
  const corruptValues = [
    '{broken JSON', 'null', '[]',
    JSON.stringify(initial),
    JSON.stringify({ ...otherwiseValid, revision: -1 }),
    JSON.stringify({ ...otherwiseValid, key: 'about-intro:ru' }),
    JSON.stringify({ ...otherwiseValid, clientId: 'synthetic-private-client' }),
    JSON.stringify({ ...otherwiseValid, published: { ...otherwiseValid.published, visibility: 'private' } }),
  ]
  for (const objectResult of [false, true]) {
    for (const raw of corruptValues) {
      const database = restFixture({ objectResult })
      database.hash.set(aboutKey, raw)
      const unrelated = prepareVideoChange(null, { ...change, slot: 'home-intro' }, timestamp)
      database.hash.set(unrelated.key, JSON.stringify(unrelated))
      const store = configuredStore(database)
      assert.deepEqual((await store.list()).map(record => record.key).sort(), [...defaultKeys.filter(key => key !== aboutKey), unrelated.key].sort())
      await assert.rejects(store.get(aboutKey), errorCode('storage'))
      assert.equal(database.hash.get(aboutKey), raw)
      assert.equal(database.commands.filter(command => command[0] === 'EVAL').length, 0)
    }
  }
})

test('virtual revision zero cannot be persisted, and seeded revision-one records are not accepted as defaults', async () => {
  const database = restFixture()
  const store = configuredStore(database)
  const initial = builtInSiteVideoRecords()[0]
  await assert.rejects(store.save(initial, 0), errorCode('validation'))
  assert.equal(database.commands.length, 0)
  assert.equal(database.hash.size, 0)
  const persisted = prepareVideoChange(initial, change, timestamp)
  assert.throws(() => createSiteVideoStore({
    environment, fetchFn: database.fetchFn, initialRecords: [persisted],
  }), errorCode('validation'))
})

test('two first editors cannot overwrite a persisted hide by reusing the virtual revision', async () => {
  const database = restFixture()
  const first = configuredStore(database)
  const second = configuredStore(database)
  const firstView = await first.get(aboutKey)
  const secondView = await second.get(aboutKey)
  const hidden = prepareVideoChange(firstView, { slot: 'about-intro', locale: 'en', intent: 'hide' }, timestamp)
  const replacement = prepareVideoChange(secondView, change, timestamp)
  await first.save(hidden, 0)
  await assert.rejects(second.save(replacement, 0), errorCode('conflict'))
  assert.equal(toPublishedSiteVideo(await configuredStore(database).get(aboutKey)), undefined)
})

test('configured-store read errors propagate instead of substituting a potentially hidden built-in', async () => {
  const store = createSiteVideoStore({
    environment, initialRecords: builtInSiteVideoRecords(),
    fetchFn: async () => { throw new Error('synthetic connection failure') },
  })
  await assert.rejects(store.list(), errorCode('storage'))
  await assert.rejects(store.get(aboutKey), errorCode('storage'))
})

// Spanish follows the same persisted override/approval rules, with no EN fallback.
test('Spanish hide and replacement persist independently of English and Russian', async () => {
  const database = restFixture(), store = configuredStore(database)
  const initial = await store.get(esAboutKey)
  assert.equal(initial.published.language, 'es')
  assert.equal(initial.published.heygenId, '2c251709aba74fd96ae8be43257a080b')
  assert.equal(toPublishedSiteVideo(initial).driveUrl, undefined)
  assert.ok(initial.draft.driveUrl.startsWith('https://drive.google.com/file/d/'))
  const hidden = prepareVideoChange(initial, { slot: 'about-intro', locale: 'es', intent: 'hide' }, timestamp)
  await store.save(hidden, 0)
  const reloaded = configuredStore(database)
  assert.equal(toPublishedSiteVideo(await reloaded.get(esAboutKey)), undefined)
  assert.deepEqual(toPublishedSiteVideo(await reloaded.get(aboutKey)), existingAboutIntroVideo)
  assert.deepEqual(toPublishedSiteVideo(await reloaded.get(ruAboutKey)), existingAboutIntroVideoRu)
  const replacement = prepareVideoChange(hidden, { ...change, locale: 'es' }, timestamp)
  await reloaded.save(replacement, 1)
  assert.equal(toPublishedSiteVideo(await configuredStore(database).get(esAboutKey)).youtubeId, youtubeId)
})
