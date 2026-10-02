import assert from 'node:assert/strict'
import test from 'node:test'

import {
  SITE_VIDEO_SLOTS, SiteVideoError, isSiteVideoRecord, parseYouTubeId, parseSiteVideoSource,
  prepareVideoChange, siteVideoWatchUrl, toPublishedSiteVideo, videoKey, videoPagePath,
} from '../lib/site-videos/model.js'
import {
  createMemorySiteVideoStore, createSiteVideoStore, getSiteVideoStore,
} from '../lib/site-videos/store.js'

const firstId = 'OkLEN8Zb-sY'
const secondId = 'ELhK96TJALg'
const heygenId = 'fd5fcead9b067f9a0649862675a38771'
const timestamp = '2026-09-30T00:00:00.000Z'
const draftInput = {
  slot: 'home-intro', locale: 'en', intent: 'draft',
  youtubeUrl: `https://youtu.be/${firstId}?si=discard-tracker&t=12&list=discard-list`,
  title: 'Welcome to Holistic House',
  description: 'A short introduction.', transcript: 'Hello.\nWelcome to this space.',
  driveUrl: 'https://drive.google.com/file/d/example-master-archive/view',
  durationSeconds: 42, youtubeVisibility: 'unlisted',
}
const draft = (change = {}) => prepareVideoChange(null, { ...draftInput, ...change }, timestamp)
const published = (change = {}) => draft({ ...change, intent: 'publish', reviewed: true })
const codeIs = code => error => error instanceof SiteVideoError && error.code === code
const environment = {
  NODE_ENV: 'production', VERCEL_ENV: 'production',
  PRESCRIPTIONS_KV_REST_API_URL: 'https://example-video-store.invalid',
  PRESCRIPTIONS_KV_REST_API_TOKEN: 'synthetic-test-token',
}

test('YouTube URLs reduce to the same video ID and discard share, time and playlist parameters', () => {
  for (const source of [
    firstId, ` https://youtu.be/${firstId}?si=abc&t=10 `,
    `https://www.youtube.com/watch?v=${firstId}&list=PL-test&t=15`,
    `http://youtube.com/watch?v=${firstId}`,
    `https://m.youtube.com/watch?v=${firstId}`,
    `https://www.youtube.com/embed/${firstId}`,
    `https://www.youtube-nocookie.com/embed/${firstId}`,
    `https://youtube-nocookie.com/embed/${firstId}/`,
    `https://youtube.com/shorts/${firstId}?si=abc`,
    `https://youtube.com/live/${firstId}?feature=share`,
  ]) assert.equal(parseYouTubeId(source), firstId, source)
})

test('YouTube parsing rejects spoof hosts, credentials, ambiguous paths, scripts and non-video URLs', () => {
  for (const source of [
    '', null, {}, 12345678901, `${firstId}extra`, 'abcdefghijkl',
    `https://youtube.com.evil.example/watch?v=${firstId}`,
    `https://evil.example/youtube.com/watch?v=${firstId}`,
    `https://youtube.com@evil.example/watch?v=${firstId}`,
    `https://evil@example.youtube.com/watch?v=${firstId}`,
    `https://user:password@youtube.com/watch?v=${firstId}`,
    `https://@youtube.com/watch?v=${firstId}`,
    `https://%79outube.com/watch?v=${firstId}`,
    `https://youtube.com./watch?v=${firstId}`,
    `https://youtube.com:444/watch?v=${firstId}`,
    `javascript:alert('${firstId}')`, `data:text/html,${firstId}`,
    `ftp://youtube.com/watch?v=${firstId}`, `//youtube.com/watch?v=${firstId}`,
    `https:\\youtube.com/watch?v=${firstId}`,
    `https://you\ntube.com/watch?v=${firstId}`,
    `https://youtube.com/watch?v=${firstId}&si=\u0000`,
    `https://youtu.be/${firstId}/extra`,
    `https://youtube.com/embed/${firstId}/extra`,
    `https://youtube.com/shorts/${firstId}/extra`,
    `https://youtube.com/extra/../watch?v=${firstId}`,
    `https://youtube.com/extra/%2e%2e/watch?v=${firstId}`,
    `https://youtube.com/watch?v=${firstId}&v=${secondId}`,
    `https://youtube.com/playlist?list=${firstId}`,
    `https://youtube.com/@channel/${firstId}`,
    `https://youtube.com/channel/${firstId}`, 'https://youtube.com/watch?list=PL-example',
    `https://youtube-nocookie.com/watch?v=${firstId}`,
    `https://youtu.be/watch?v=${firstId}`,
    `https://youtube.com/watch?v=${firstId}${'x'.repeat(2050)}`,
  ]) assert.equal(parseYouTubeId(source), null, String(source))
})

test('stable HeyGen share/embed links normalize to one provider without changing YouTube parsing', () => {
  for (const source of [
    `https://app.heygen.com/share/${heygenId}`,
    `https://app.heygen.com/embeds/${heygenId}`,
    ` https://app.heygen.com/share/${heygenId}/ `,
    `https://app.heygen.com/embeds/${heygenId.toUpperCase()}`,
  ]) {
    const parsed = parseSiteVideoSource(source)
    assert.deepEqual(parsed, { youtubeId: '', heygenId })
    assert.equal(siteVideoWatchUrl(parsed), `https://app.heygen.com/share/${heygenId}`)
    assert.equal(parseYouTubeId(source), null)
  }
  assert.deepEqual(parseSiteVideoSource(draftInput.youtubeUrl), { youtubeId: firstId })
  assert.equal(siteVideoWatchUrl({ youtubeId: firstId }), `https://www.youtube.com/watch?v=${firstId}`)
})

test('HeyGen parsing rejects signed files, archive links, host/port tricks and ambiguous query paths', () => {
  for (const source of [
    heygenId,
    `http://app.heygen.com/share/${heygenId}`,
    `https://app.heygen.com.evil.example/share/${heygenId}`,
    `https://heygen.com/share/${heygenId}`,
    `https://www.app.heygen.com/share/${heygenId}`,
    `https://app.heygen.com./share/${heygenId}`,
    `https://user:password@app.heygen.com/share/${heygenId}`,
    `https://@app.heygen.com/share/${heygenId}`,
    `https://app.heygen.com@evil.example/share/${heygenId}`,
    `https://app.heygen.com:443/share/${heygenId}`,
    `https://app.heygen.com:444/share/${heygenId}`,
    `https://%61pp.heygen.com/share/${heygenId}`,
    `https://app.heygen.com/share/${heygenId}?token=private`,
    `https://app.heygen.com/share/${heygenId}?redirect=https://evil.example`,
    `https://app.heygen.com/share/${heygenId}#private`,
    `https://app.heygen.com/share/${heygenId}/extra`,
    `https://app.heygen.com/extra/../share/${heygenId}`,
    `https://app.heygen.com/%73hare/${heygenId}`,
    `https://app.heygen.com/videos/${heygenId}`,
    `https://app.heygen.com/share/${heygenId.slice(1)}`,
    `https://app.heygen.com/share/${heygenId}0`,
    `https://app.heygen.com/share/${heygenId}.mp4`,
    `https://resource.heygen.ai/video/${heygenId}.mp4?Expires=123&Signature=secret`,
    `https://drive.google.com/file/d/${heygenId}/view`,
    `data:video/mp4;base64,${heygenId}`,
  ]) {
    assert.equal(parseSiteVideoSource(source), null, source)
    assert.throws(() => draft({ youtubeUrl: source }), codeIs('validation'))
  }
})

test('mixed or malformed provider IDs fail closed and HeyGen public output keeps only display fields', () => {
  const record = published({ youtubeUrl: `https://app.heygen.com/embeds/${heygenId}` })
  const visible = toPublishedSiteVideo(record)
  assert.equal(record.draft.youtubeUrl, `https://app.heygen.com/share/${heygenId}`)
  assert.equal(visible.youtubeId, '')
  assert.equal(visible.heygenId, heygenId)
  assert.equal(visible.driveUrl, undefined)
  assert.equal(visible.youtubeUrl, undefined)
  for (const source of [
    { youtubeId: firstId, heygenId },
    { youtubeId: firstId, heygenId: '' },
    { youtubeId: '', heygenId: 'https://evil.example' },
    { youtubeId: '', heygenId: heygenId.toUpperCase() },
    { youtubeId: '', heygenId: null },
    { youtubeId: '' },
  ]) {
    assert.equal(siteVideoWatchUrl(source), '')
    const malformed = structuredClone(record)
    delete malformed.published.heygenId
    Object.assign(malformed.published, source)
    assert.equal(toPublishedSiteVideo(malformed), undefined)
    assert.equal(isSiteVideoRecord(malformed), false)
  }
  const mixedDraft = structuredClone(record)
  mixedDraft.draft.youtubeId = firstId
  assert.equal(isSiteVideoRecord(mixedDraft), false)
  for (const location of ['draft', 'published']) {
    const privateRecord = structuredClone(record)
    privateRecord[location].clientId = 'synthetic-client'
    assert.equal(toPublishedSiteVideo(privateRecord), undefined)
    assert.equal(isSiteVideoRecord(privateRecord), false)
  }
  assert.throws(() => draft({ youtubeUrl: record.draft.youtubeUrl, intent: 'publish', reviewed: false }), codeIs('approval'))
})

test('slots, locales and entities have isolated, validated keys and real public page paths', () => {
  assert.equal(SITE_VIDEO_SLOTS.length, 15)
  assert.ok(Object.isFrozen(SITE_VIDEO_SLOTS))
  for (const slot of SITE_VIDEO_SLOTS) {
    for (const locale of ['en', 'ru']) {
      const entity = slot.entityType ? 'valid-entity-2' : ''
      assert.equal(videoKey(slot.id, locale, entity), `${slot.id}:${locale}${entity ? `:${entity}` : ''}`)
      assert.match(videoPagePath(slot.id, locale, entity), /^\//)
    }
  }
  assert.notEqual(videoKey('home-intro', 'en'), videoKey('home-intro', 'ru'))
  assert.notEqual(videoKey('remedy-detail', 'en', 'arsenicum-album'), videoKey('remedy-detail', 'en', 'natrum-muriaticum'))
  assert.equal(videoPagePath('home-intro', 'en'), '/?lang=en')
  assert.equal(videoPagePath('service-business', 'ru'), '/ru/services#business')
  assert.equal(videoPagePath('method-hypnotherapy', 'en'), '/en/services#methods')
  assert.equal(videoPagePath('method-constellations', 'ru'), '/ru/services#methods')
  assert.equal(videoPagePath('consultation', 'en'), '/en/services#consultation')
  assert.equal(videoPagePath('remedy-detail', 'ru', 'arsenicum-album'), '/ru/homeopathy/remedies/arsenicum-album')
  assert.equal(videoPagePath('book-detail', 'en', 'example-book'), '/books/example-book?lang=en')
  for (const args of [
    ['unknown', 'en'], ['client-detail', 'en', 'client-1'], ['home-intro', 'de'],
    ['home-intro', 'EN'], ['home-intro', 'en', 'stray-entity'], ['remedy-detail', 'en'],
    ['book-detail', 'ru', '../private'], ['book-detail', 'en', 'a:b'],
    ['remedy-detail', 'en', '__proto__'], ['book-detail', 'en', 'Uppercase'],
    ['book-detail', 'en', '-leading'], ['book-detail', 'en', 'trailing-'],
    ['book-detail', 'en', 'a'.repeat(121)],
  ]) assert.throws(() => videoKey(...args), codeIs('validation'))
})

test('incomplete drafts save invisibly while nonempty malformed links are rejected', () => {
  const empty = draft({ youtubeUrl: '', title: '', driveUrl: '', durationSeconds: '' })
  assert.equal(empty.draft.youtubeId, '')
  assert.equal(empty.draft.youtubeUrl, '')
  assert.equal(empty.draft.title, '')
  assert.equal(empty.published, null)
  assert.equal(toPublishedSiteVideo(empty), undefined)
  assert.ok(isSiteVideoRecord(empty))
  const prepared = draft({ durationSeconds: '42' })
  assert.equal(prepared.draft.youtubeUrl, `https://www.youtube.com/watch?v=${firstId}`)
  assert.equal(prepared.draft.durationSeconds, 42)
  for (const url of ['not a video URL', 'https://evil.example/video', 'javascript:alert(1)']) {
    assert.throws(() => draft({ youtubeUrl: url }), codeIs('validation'))
  }
})

test('publish requires deliberate review plus a valid title and YouTube video', () => {
  for (const reviewed of [false, undefined, null, 'on', 'true', 1]) {
    assert.throws(() => draft({ intent: 'publish', reviewed }), codeIs('approval'))
  }
  assert.throws(() => published({ title: '  ' }), codeIs('validation'))
  assert.throws(() => published({ youtubeUrl: '' }), codeIs('validation'))
  const record = published()
  assert.equal(record.published.scope, 'public')
  assert.equal(record.published.status, 'published')
  assert.equal(record.published.visibility, 'public')
  assert.equal(record.draft.youtubeVisibility, 'unlisted')
  assert.equal(record.published.driveUrl, undefined)
  assert.equal(record.published.youtubeUrl, undefined)
  assert.ok(isSiteVideoRecord(record))
})

test('draft editing preserves the existing live snapshot; hide removes only publication', () => {
  const live = published()
  const edited = prepareVideoChange(live, { ...draftInput, youtubeUrl: secondId, title: 'A new draft' }, timestamp)
  assert.equal(edited.revision, 2)
  assert.equal(edited.draft.youtubeId, secondId)
  assert.deepEqual(edited.published, live.published)
  assert.notEqual(edited.published, live.published)
  assert.equal(toPublishedSiteVideo(edited).youtubeId, firstId)
  const hidden = prepareVideoChange(edited, { slot: 'home-intro', locale: 'en', intent: 'hide' }, timestamp)
  assert.equal(hidden.revision, 3)
  assert.deepEqual(hidden.draft, edited.draft)
  assert.notEqual(hidden.draft, edited.draft)
  assert.equal(hidden.published, null)
  assert.equal(toPublishedSiteVideo(hidden), undefined)
  assert.ok(isSiteVideoRecord(hidden))
  const republished = prepareVideoChange(hidden, { ...draftInput, youtubeUrl: secondId, title: 'Approved replacement', intent: 'publish', reviewed: true }, timestamp)
  assert.equal(republished.revision, 4)
  assert.equal(toPublishedSiteVideo(republished).youtubeId, secondId)
})

test('EN, RU and detail records cannot be moved to a different destination through an edit', () => {
  const english = published()
  const russian = published({ locale: 'ru', title: 'Добро пожаловать' })
  assert.equal(toPublishedSiteVideo(russian).language, 'ru')
  assert.throws(() => prepareVideoChange(english, { ...draftInput, locale: 'ru' }), codeIs('validation'))
  const remedy = published({ slot: 'remedy-detail', entityId: 'arsenicum-album' })
  assert.throws(() => prepareVideoChange(remedy, { ...draftInput, slot: 'remedy-detail', entityId: 'natrum-muriaticum' }), codeIs('validation'))
  assert.throws(() => draft({ language: 'ru' }), codeIs('validation'))
})

test('only public editorial fields can enter the change model, with bounded values', () => {
  for (const change of [
    { scope: 'public' }, { scope: 'private' }, { clientId: 'client-123' },
    { followUp: true }, { youtubeVisibility: 'private' }, { intent: 'client' },
    { published: { youtubeId: firstId } }, { status: 'published' },
    { title: 'a'.repeat(181) }, { description: 'a'.repeat(2001) },
    { transcript: 'a'.repeat(20001) }, { title: 'Title\u0000' },
    { driveUrl: 'https://drive.google.com.evil.example/file' },
    { driveUrl: 'http://drive.google.com/file/d/test/view' },
    { driveUrl: 'https://user@drive.google.com/file/d/test/view' },
    { durationSeconds: 0 }, { durationSeconds: 7201 }, { durationSeconds: -1 },
    { durationSeconds: 1.5 }, { durationSeconds: '1e2' }, { durationSeconds: Number.NaN },
  ]) assert.throws(() => draft(change), codeIs('validation'), JSON.stringify(change))
  const record = published({ title: '  Welcome  ', transcript: 'First line\r\nSecond line' })
  assert.equal(record.published.title, 'Welcome')
  assert.equal(record.published.transcript, 'First line\nSecond line')
})

test('public projection contains only display fields and never exposes drafts or Drive archives', () => {
  const record = published()
  record.internalNote = 'Only for the editor'
  record.published.driveUrl = draftInput.driveUrl
  record.published.youtubeUrl = draftInput.youtubeUrl
  const visible = toPublishedSiteVideo(record)
  assert.deepEqual(visible, {
    youtubeId: firstId, title: draftInput.title, description: draftInput.description,
    transcript: draftInput.transcript, language: 'en', durationSeconds: 42,
  })
  assert.doesNotMatch(JSON.stringify(visible), /drive\.google|archive|draft|editor|scope|visibility/)
  assert.equal(toPublishedSiteVideo(published({ transcript: 'You may ask about a private consultation.' })).transcript,
    'You may ask about a private consultation.')
})

test('public projection fails closed for private/client/follow-up markers and invalid envelopes', () => {
  const mutations = [
    record => { record.clientId = 'synthetic-client' },
    record => { record.scope = 'private' },
    record => { record.followUp = true },
    record => { record.draft.patientId = 'synthetic-patient' },
    record => { record.published.clientId = 'synthetic-client' },
    record => { record.published.audience = 'client-specific' },
    record => { record.published.kind = 'follow-up' },
    record => { record.published.scope = 'private' },
    record => { record.published.visibility = 'private' },
    record => { record.published.status = 'draft' },
    record => { record.published.youtubeId = 'https://evil.example/video' },
    record => { record.published.youtubeId = 12345678901 },
    record => { record.published.language = 'ru' },
    record => { record.published.durationSeconds = '42' },
    record => { record.key = 'home-intro:ru' },
    record => { record.slot = 'unknown' },
    record => { record.entityId = 'unexpected' },
    record => { record.revision = -1 },
    record => { record.updatedAt = 'yesterday' },
    record => { record.updatedAt = '2026-02-31T00:00:00.000Z' },
  ]
  for (const mutate of mutations) {
    const record = published()
    mutate(record)
    assert.equal(toPublishedSiteVideo(record), undefined)
    assert.equal(isSiteVideoRecord(record), false)
  }
  for (const record of [null, undefined, [], 'private', {}, draft()]) assert.equal(toPublishedSiteVideo(record), undefined)
})

test('memory storage is an explicit test dependency, clones values and enforces atomic revision conflicts', async () => {
  const store = createMemorySiteVideoStore()
  const initial = published()
  await store.save(initial, 0)
  initial.draft.title = 'Mutating the caller does not mutate the store'
  assert.equal((await store.get(initial.key)).draft.title, draftInput.title)
  const read = await store.get(initial.key)
  read.draft.title = 'Mutating a read does not mutate the store'
  assert.equal((await store.get(initial.key)).draft.title, draftInput.title)
  const previous = await store.get(initial.key)
  const firstChange = prepareVideoChange(previous, { ...draftInput, title: 'First editor' }, timestamp)
  const secondChange = prepareVideoChange(previous, { ...draftInput, title: 'Second editor' }, timestamp)
  const results = await Promise.allSettled([store.save(firstChange, 1), store.save(secondChange, 1)])
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'conflict')
  assert.equal((await store.get(initial.key)).draft.title, 'First editor')
  assert.equal((await store.list()).length, 1)
  assert.equal(await store.get(videoKey('home-intro', 'ru')), null)
  await assert.rejects(store.save(published({ locale: 'ru' }), 1), codeIs('validation'))
  await assert.rejects(store.get('prescription:record:client-1'), codeIs('validation'))
})

function fakeRestDatabase() {
  const hash = new Map()
  const commands = []
  const fetchFn = async (url, options) => {
    assert.equal(url, environment.PRESCRIPTIONS_KV_REST_API_URL)
    assert.equal(options.method, 'POST')
    assert.equal(options.headers.Authorization, `Bearer ${environment.PRESCRIPTIONS_KV_REST_API_TOKEN}`)
    assert.equal(options.cache, 'no-store')
    assert.equal(options.redirect, 'error')
    assert.equal(options.credentials, 'omit')
    assert.ok(options.signal instanceof AbortSignal)
    const command = JSON.parse(options.body)
    commands.push(command)
    let result
    if (command[0] === 'HGETALL') {
      assert.equal(command[1], 'holistic-house:site-videos:v1')
      result = [...hash.entries()].flat()
    } else if (command[0] === 'HGET') {
      assert.equal(command[1], 'holistic-house:site-videos:v1')
      result = hash.get(command[2]) ?? null
    } else if (command[0] === 'EVAL') {
      const [, script, keyCount, key, field, expectedRevision, serialized] = command
      assert.equal(keyCount, 1)
      assert.equal(key, 'holistic-house:site-videos:v1')
      assert.match(script, /redis\.call\('HGET'/)
      assert.match(script, /redis\.call\('HSET'/)
      const previous = hash.has(field) ? JSON.parse(hash.get(field)) : null
      result = (previous?.revision ?? 0) === expectedRevision ? 1 : 0
      if (result === 1) hash.set(field, serialized)
    } else assert.fail('Unexpected command; public video storage must use only its own hash')
    return { ok: true, json: async () => ({ result }) }
  }
  return { hash, commands, fetchFn }
}

test('HeyGen publications round-trip durably and switching providers never leaves mixed source IDs', async () => {
  const database = fakeRestDatabase()
  const store = createSiteVideoStore({ environment, fetchFn: database.fetchFn })
  const original = published({ youtubeUrl: `https://app.heygen.com/embeds/${heygenId}` })
  await store.save(original, 0)
  assert.deepEqual(await store.get(original.key), original)
  assert.deepEqual(await store.list(), [original])
  const youtubeDraft = prepareVideoChange(original, draftInput, timestamp)
  assert.equal(youtubeDraft.draft.heygenId, undefined)
  assert.equal(youtubeDraft.draft.youtubeId, firstId)
  assert.equal(toPublishedSiteVideo(youtubeDraft).heygenId, heygenId)
  await store.save(youtubeDraft, 1)
  const youtubePublished = prepareVideoChange(youtubeDraft, { ...draftInput, intent: 'publish', reviewed: true }, timestamp)
  await store.save(youtubePublished, 2)
  assert.equal(toPublishedSiteVideo(await store.get(original.key)).heygenId, undefined)
  assert.equal(toPublishedSiteVideo(await store.get(original.key)).youtubeId, firstId)
  const heygenPublished = prepareVideoChange(youtubePublished, {
    ...draftInput, youtubeUrl: `https://app.heygen.com/share/${heygenId}`, intent: 'publish', reviewed: true,
  }, timestamp)
  await store.save(heygenPublished, 3)
  assert.equal(toPublishedSiteVideo(await store.get(original.key)).youtubeId, '')
  assert.equal(toPublishedSiteVideo(await store.get(original.key)).heygenId, heygenId)
})

test('a virtual revision-zero existing publication can be drafted or hidden with a first durable revision-one save', async () => {
  const existing = {
    ...published({ slot: 'about-intro', youtubeUrl: `https://app.heygen.com/share/${heygenId}` }),
    revision: 0,
  }
  assert.ok(isSiteVideoRecord(existing))
  assert.equal(toPublishedSiteVideo(existing).heygenId, heygenId)
  const drafted = prepareVideoChange(existing, { ...draftInput, slot: 'about-intro' }, timestamp)
  assert.equal(drafted.revision, 1)
  assert.equal(drafted.draft.youtubeId, firstId)
  assert.equal(toPublishedSiteVideo(drafted).heygenId, heygenId)
  const database = fakeRestDatabase()
  const store = createSiteVideoStore({ environment, fetchFn: database.fetchFn })
  await assert.rejects(store.save(existing, 0), codeIs('validation'))
  await store.save(drafted, 0)
  assert.deepEqual(await store.get(existing.key), drafted)
  const hidden = prepareVideoChange(existing, { slot: 'about-intro', locale: 'en', intent: 'hide' }, timestamp)
  assert.equal(hidden.revision, 1)
  assert.equal(hidden.published, null)
  assert.deepEqual(hidden.draft, existing.draft)
  const anotherDatabase = fakeRestDatabase()
  const anotherStore = createSiteVideoStore({ environment, fetchFn: anotherDatabase.fetchFn })
  await anotherStore.save(hidden, 0)
  assert.equal(toPublishedSiteVideo(await anotherStore.get(existing.key)), undefined)
})

test('durable stores survive recreation and atomically protect publish/hide from concurrent editors', async () => {
  const database = fakeRestDatabase()
  const firstProcess = createSiteVideoStore({ environment, fetchFn: database.fetchFn })
  const record = published()
  assert.equal(await firstProcess.get(record.key), null)
  await firstProcess.save(record, 0)
  const secondProcess = createSiteVideoStore({ environment, fetchFn: database.fetchFn })
  assert.deepEqual(await secondProcess.get(record.key), record)
  assert.deepEqual(await secondProcess.list(), [record])
  const hide = prepareVideoChange(record, { slot: 'home-intro', locale: 'en', intent: 'hide' }, timestamp)
  const replace = prepareVideoChange(record, { ...draftInput, youtubeUrl: secondId, intent: 'publish', reviewed: true }, timestamp)
  const results = await Promise.allSettled([firstProcess.save(hide, 1), secondProcess.save(replace, 1)])
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'conflict')
  const thirdProcess = createSiteVideoStore({ environment, fetchFn: database.fetchFn })
  assert.equal(toPublishedSiteVideo(await thirdProcess.get(record.key)), undefined)
  const russian = published({ locale: 'ru', title: 'Русское видео' })
  await thirdProcess.save(russian, 0)
  assert.equal((await thirdProcess.list()).length, 2)
  assert.equal(toPublishedSiteVideo(await thirdProcess.get(russian.key)).language, 'ru')
  const writes = database.commands.filter(command => command[0] === 'EVAL')
  assert.equal(writes.length, 4)
  assert.ok(database.commands.every(command => !JSON.stringify(command).includes('prescription:record:')))
})

test('invalid stored rows stay hidden and cannot be mistaken for a missing record during edits', async () => {
  const database = fakeRestDatabase()
  const valid = published()
  const privateRecord = published({ locale: 'ru' })
  privateRecord.clientId = 'synthetic-client'
  database.hash.set(valid.key, JSON.stringify(valid))
  database.hash.set(privateRecord.key, JSON.stringify(privateRecord))
  database.hash.set('about-intro:en', '{broken json')
  database.hash.set('about-intro:ru', JSON.stringify(valid))
  const store = createSiteVideoStore({ environment, fetchFn: database.fetchFn })
  assert.deepEqual(await store.list(), [valid])
  await assert.rejects(store.get(privateRecord.key), codeIs('storage'))
  await assert.rejects(store.get('about-intro:en'), codeIs('storage'))
  await assert.rejects(store.get('about-intro:ru'), codeIs('storage'))
  await assert.rejects(store.save(privateRecord, 0), codeIs('validation'))
  assert.equal(database.commands.filter(command => command[0] === 'EVAL').length, 0)
})

test('maximum escaped transcripts round-trip durably with separate draft and published snapshots', async () => {
  const database = fakeRestDatabase()
  const store = createSiteVideoStore({ environment, fetchFn: database.fetchFn })
  const liveTranscript = 'Line: "a"\n'.repeat(2000)
  const draftTranscript = 'Line: "b"\n'.repeat(2000)
  assert.equal(liveTranscript.length, 20000)
  const live = published({ transcript: liveTranscript })
  assert.ok(JSON.stringify(live).length > 50000)
  await store.save(live, 0)
  const edited = prepareVideoChange(live, { ...draftInput, transcript: draftTranscript }, timestamp)
  await store.save(edited, 1)
  const newProcess = createSiteVideoStore({ environment, fetchFn: database.fetchFn })
  assert.deepEqual(await newProcess.get(edited.key), edited)
  assert.deepEqual(await newProcess.list(), [edited])
  assert.equal((await newProcess.get(edited.key)).draft.transcript, draftTranscript.trim())
  assert.equal(toPublishedSiteVideo(await newProcess.get(edited.key)).transcript, liveTranscript.trim())
})

test('missing or unsafe server configuration never creates an in-memory production or preview fallback', () => {
  for (const env of [
    {}, { NODE_ENV: 'production' }, { NODE_ENV: 'development' }, { NODE_ENV: 'test' },
    { VERCEL_ENV: 'preview' }, { ...environment, PRESCRIPTIONS_KV_REST_API_TOKEN: '' },
    { ...environment, PRESCRIPTIONS_KV_REST_API_URL: '' },
    { ...environment, PRESCRIPTIONS_KV_REST_API_URL: 'http://example-video-store.invalid' },
    { ...environment, PRESCRIPTIONS_KV_REST_API_URL: 'https://user:pass@example-video-store.invalid' },
    { ...environment, PRESCRIPTIONS_KV_REST_API_URL: 'https://example-video-store.invalid?token=secret' },
    { ...environment, PRESCRIPTIONS_KV_REST_API_URL: 'https://example-video-store.invalid#fragment' },
    { ...environment, PRESCRIPTIONS_KV_REST_API_URL: 'https://example-video-store.invalid:444' },
    { ...environment, PRESCRIPTIONS_KV_REST_API_TOKEN: 'invalid\r\nheader' },
  ]) assert.equal(createSiteVideoStore({ environment: env }), undefined)
  assert.ok(createSiteVideoStore({ environment }))
  // Video editorial storage reuses only the connection, not client encryption
  // keys, client namespaces, or a second unconfigured persistence provider.
  assert.equal(environment.PRESCRIPTIONS_DATA_ENCRYPTION_KEY, undefined)
})

test('browser contexts cannot acquire the server-configured store', () => {
  const existing = Object.getOwnPropertyDescriptor(globalThis, 'window')
  try {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {} })
    assert.equal(createSiteVideoStore({ environment }), undefined)
    assert.equal(getSiteVideoStore(), undefined)
  } finally {
    if (existing) Object.defineProperty(globalThis, 'window', existing)
    else delete globalThis.window
  }
})

test('runtime configuration can recover after a missing store without caching undefined', () => {
  const symbol = Symbol.for('holistic-house.site-videos.store.v1')
  const priorStore = globalThis[symbol]
  const url = process.env.PRESCRIPTIONS_KV_REST_API_URL
  const token = process.env.PRESCRIPTIONS_KV_REST_API_TOKEN
  try {
    delete globalThis[symbol]
    delete process.env.PRESCRIPTIONS_KV_REST_API_URL
    delete process.env.PRESCRIPTIONS_KV_REST_API_TOKEN
    assert.equal(getSiteVideoStore(), undefined)
    process.env.PRESCRIPTIONS_KV_REST_API_URL = environment.PRESCRIPTIONS_KV_REST_API_URL
    process.env.PRESCRIPTIONS_KV_REST_API_TOKEN = environment.PRESCRIPTIONS_KV_REST_API_TOKEN
    const configured = getSiteVideoStore()
    assert.ok(configured)
    assert.equal(getSiteVideoStore(), configured)
  } finally {
    if (priorStore) globalThis[symbol] = priorStore
    else delete globalThis[symbol]
    if (url === undefined) delete process.env.PRESCRIPTIONS_KV_REST_API_URL
    else process.env.PRESCRIPTIONS_KV_REST_API_URL = url
    if (token === undefined) delete process.env.PRESCRIPTIONS_KV_REST_API_TOKEN
    else process.env.PRESCRIPTIONS_KV_REST_API_TOKEN = token
  }
})

test('storage errors expose neither upstream details nor credentials or video contents', async () => {
  for (const fetchFn of [
    async () => { throw new Error('private endpoint and synthetic-test-token') },
    async () => ({ ok: false, status: 403 }),
    async () => ({ ok: true, json: async () => ({ error: 'synthetic-test-token and record data' }) }),
    async () => ({ ok: true, json: async () => { throw new Error('private JSON body') } }),
  ]) {
    const store = createSiteVideoStore({ environment, fetchFn })
    await assert.rejects(store.list(), error => {
      assert.ok(codeIs('storage')(error))
      assert.doesNotMatch(error.message, /synthetic|endpoint|record|JSON|403/)
      assert.equal(error.cause, undefined)
      return true
    })
  }
})

test('a hung storage request is aborted after the bounded timeout', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let signal
  const store = createSiteVideoStore({
    environment,
    fetchFn: async (_url, options) => {
      signal = options.signal
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('upstream request aborted')), { once: true })
      })
    },
  })
  const pending = store.list()
  assert.equal(signal.aborted, false)
  t.mock.timers.tick(5000)
  assert.equal(signal.aborted, true)
  await assert.rejects(pending, codeIs('storage'))
})

test('Spanish is enabled only for its public About video, never private or unwired placements', () => {
  assert.equal(videoKey('about-intro', 'es'), 'about-intro:es')
  assert.equal(videoPagePath('about-intro', 'es'), '/es/about')
  for (const slot of SITE_VIDEO_SLOTS.filter(slot => slot.id !== 'about-intro')) {
    assert.throws(() => videoKey(slot.id, 'es', slot.entityType ? 'valid' : ''), codeIs('validation'))
  }
  const record = published({ slot: 'about-intro', locale: 'es' })
  assert.equal(toPublishedSiteVideo(record).language, 'es')
  record.published.language = 'en'
  assert.equal(toPublishedSiteVideo(record), undefined)
})
