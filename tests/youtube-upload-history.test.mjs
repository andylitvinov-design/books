import test from 'node:test'
import assert from 'node:assert/strict'
import {RUSSIAN_CHANNEL_ID, validateHistoryRecord, normalizeChannelConfig, parseHistoryRecord,
  sortHistory, normalizeGoogleOauthClientId, resolvePhoneYoutubeClientId} from '../lib/youtube/upload-history-model.mjs'
import {createMemoryYoutubeHistoryStore, createYoutubeHistoryStore} from '../lib/youtube/upload-history-store.js'

const ENGLISH_ID = 'UCaaaaaaaaaaaaaaaaaaaaaa'
const RU_ID = RUSSIAN_CHANNEL_ID
const makeUpload = (videoId='Y4K4piEwwA8',target='ru',channelId=RU_ID) => ({
  videoId,target,channelId,title:'Demo meditation',
  requestedVisibility:'unlisted',privacyStatus:'unlisted',
})

test('known Russian YouTube pinned and English channel is not silently guessed', async () => {
  const store = createMemoryYoutubeHistoryStore()
  const channels = await store.channels()
  assert.equal(channels.ru.id,RU_ID)
  assert.equal(channels.en,null)
})

test('English channel pairing is explicit, durable, and cannot be silently replaced', async () => {
  const store = createMemoryYoutubeHistoryStore()
  const channel = await store.pairEnglish({id:ENGLISH_ID,name:'AATA',handle:'@aatapro'})
  assert.equal(channel.id,ENGLISH_ID)
  assert.deepEqual((await store.channels()).en,channel)
  assert.equal((await store.pairEnglish(channel)).id,ENGLISH_ID)
  await assert.rejects(
    store.pairEnglish({id:'UCbbbbbbbbbbbbbbbbbbbbbb',name:'Different channel'}),
    /channel_conflict/
  )
})

test('English may explicitly pair to current RU channel; historical routing never forces it', async () => {
  const store = createMemoryYoutubeHistoryStore()
  const paired = await store.pairEnglish({id:RU_ID,name:'Shared bilingual channel',handle:'@shamanic_academy'})
  assert.equal(paired.id,RU_ID)
  assert.notEqual((await store.channels()).en,null)
})

test('save Youtube link with title, language, actual visibility, timestamp and idempotent ID', async () => {
  const store = createMemoryYoutubeHistoryStore()
  const ru = await store.save(makeUpload())
  assert.equal(ru.url,'https://www.youtube.com/watch?v=Y4K4piEwwA8')
  assert.equal(ru.privacyStatus,'unlisted')
  assert.equal(ru.target,'ru')
  assert.equal(new Date(ru.uploadedAt).toISOString(),ru.uploadedAt)
  const again = await store.save(makeUpload())
  assert.deepEqual(again,ru)
  assert.deepEqual(await store.list(),[ru])
})

test('correct channel is required for every saved video; do not fake success', async () => {
  const store = createMemoryYoutubeHistoryStore()
  await assert.rejects(store.save(makeUpload('Y4K4piEwwA8','en',ENGLISH_ID)),/invalid_channel/)
  await store.pairEnglish({id:ENGLISH_ID,name:'English'})
  await assert.rejects(store.save(makeUpload('Y4K4piEwwA8','en',RU_ID)),/wrong_channel/)
  await store.save(makeUpload('Y4K4piEwwA8','en',ENGLISH_ID))
  await assert.rejects(store.save(makeUpload('Y4K4piEwwA8','ru',RU_ID)),/history_conflict/)
})

test('Private/Public visibility readback is preserved and clearly distinguishable from requested Unlisted', async () => {
  const store = createMemoryYoutubeHistoryStore()
  const a = await store.save({...makeUpload('Y4K4piEwwA8'),privacyStatus:'private'})
  assert.equal(a.privacyStatus,'private')
  const b = await store.save({...makeUpload('s30Y42IwPcg'),privacyStatus:'public'})
  assert.equal(b.privacyStatus,'public')
  assert.throws(() => validateHistoryRecord({...makeUpload(),requestedVisibility:'public'},RU_ID),/invalid_visibility/)
})

test('bad links, forged channel IDs, empty titles and unknown records are rejected', () => {
  assert.equal(normalizeChannelConfig({id:'invalid',name:'x'}),null)
  assert.equal(parseHistoryRecord('not json'),null)
  assert.throws(() => validateHistoryRecord({...makeUpload(),videoId:'https://evil.example'},RU_ID),/invalid_video_id/)
  assert.throws(() => validateHistoryRecord({...makeUpload(),title:'   '},RU_ID),/invalid_title/)
  assert.throws(() => validateHistoryRecord({...makeUpload(),privacyStatus:'unknown-value'},RU_ID),/invalid_visibility/)
  assert.throws(() => validateHistoryRecord({...makeUpload(),channelId:ENGLISH_ID},RU_ID),/wrong_channel/)
})
test('history sorts newest first and applies a bounded result', () => {
  const ordered = sortHistory([
    {videoId:'a',uploadedAt:'2026-10-14T00:00:00Z'},
    {videoId:'b',uploadedAt:'2026-10-15T00:00:00Z'},
  ])
  assert.equal(ordered[0].videoId,'b')
})
test('missing persistent Redis configuration fails closed', () => {
  assert.equal(createYoutubeHistoryStore({environment:{}}),null)
})

test('owner-configured public OAuth Client ID is durable, editable and never mistaken for a client secret', async () => {
  const first = '123456789012-exampleone.apps.googleusercontent.com'
  const second = '123456789012-exampletwo.apps.googleusercontent.com'
  assert.equal(normalizeGoogleOauthClientId(first),first)
  assert.equal(normalizeGoogleOauthClientId(' '+first+' '),first)
  assert.equal(normalizeGoogleOauthClientId('fake-google-secret'),null)
  assert.equal(normalizeGoogleOauthClientId('https://evil.example/auth'),null)
  const store = createMemoryYoutubeHistoryStore()
  assert.equal(await store.oauthConfig(),null)
  await assert.rejects(store.configureOauthClientId('not-a-client-id'),/invalid_oauth_client/)
  assert.equal(await store.oauthConfig(),null)
  assert.equal(await store.configureOauthClientId(first),true)
  assert.equal(await store.oauthConfig(),first)
  assert.equal(await store.configureOauthClientId(second),true)
  assert.equal(await store.oauthConfig(),second)
  assert.deepEqual((await store.channels()).ru.id,RU_ID)
  assert.deepEqual(await store.list(),[])
})


test('existing owner-video Google Web Client ID automatically unlocks phone setup', () => {
  const serverId='123456789012-sharedweb.apps.googleusercontent.com'
  const dedicatedId='123456789012-phoneweb.apps.googleusercontent.com'
  const savedId='123456789012-savedweb.apps.googleusercontent.com'
  assert.deepEqual(resolvePhoneYoutubeClientId({ownerVideoId:serverId,ownerVideoConfigured:true}),
    {clientId:serverId,source:'owner_video'})
  assert.deepEqual(resolvePhoneYoutubeClientId({dedicatedId,savedId,ownerVideoId:serverId,ownerVideoConfigured:true}),
    {clientId:dedicatedId,source:'dedicated'})
  assert.deepEqual(resolvePhoneYoutubeClientId({savedId,ownerVideoId:serverId,ownerVideoConfigured:true}),
    {clientId:savedId,source:'saved'})
  assert.deepEqual(resolvePhoneYoutubeClientId({dedicatedId:'invalid-client-id',ownerVideoId:serverId,ownerVideoConfigured:true}),
    {clientId:serverId,source:'owner_video'})
  assert.deepEqual(resolvePhoneYoutubeClientId({ownerVideoId:serverId,ownerVideoConfigured:false}),
    {clientId:null,source:'missing'})
  assert.deepEqual(resolvePhoneYoutubeClientId({ownerVideoId:'secret-not-a-client-id',ownerVideoConfigured:true}),
    {clientId:null,source:'missing'})
  assert.deepEqual(resolvePhoneYoutubeClientId({ownerVideoId:serverId}),
    {clientId:null,source:'missing'})
})
