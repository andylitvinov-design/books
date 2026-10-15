import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeDraft,clientPayload,emptySessionDraft,validSelector,validSecret,
  SESSION_MEDIA_TYPES, PRIVATE_MEDIA_BUCKET,deliveryEnabled } from '../lib/clients/delivery-model.js'
const AUDIO='29e2a748-ea4c-4cb4-9561-5224482f9b44'
const VIDEO='09a8c81b-93c4-4a89-adb0-084e293bdacc'
const make=()=>({title:'Consultation',summary:'Private care plan',reportDocumentId:null,
  media:[{assetId:AUDIO,title:'Client audio',scope:'client',transcript:'Hello'},
  {assetId:VIDEO,title:'Private note',scope:'practitioner',transcript:'Owner only'}]})
test('delivery stays disabled without explicit opt-in',()=>{
  assert.equal(deliveryEnabled({}),false)
  assert.equal(deliveryEnabled({HH_CLIENT_DELIVERY_ENABLED:'false'}),false)
  assert.equal(deliveryEnabled({HH_CLIENT_DELIVERY_ENABLED:'true'}),true)
})
test('private storage MIME and size restrictions',()=>{
  assert.equal(PRIVATE_MEDIA_BUCKET,'hh-client-private-media')
  assert.equal(SESSION_MEDIA_TYPES['audio/mp4'].kind,'audio')
  assert.equal(SESSION_MEDIA_TYPES['video/mp4'].kind,'video')
  assert.equal(SESSION_MEDIA_TYPES['video/mp4'].max,45_000_000)
  assert.equal(SESSION_MEDIA_TYPES['audio/mp4'].max,20_000_000)
  assert.ok(SESSION_MEDIA_TYPES['audio/mp4'].max<SESSION_MEDIA_TYPES['video/mp4'].max)
  assert.equal(SESSION_MEDIA_TYPES['image/svg+xml'],undefined)
})
test('session share token and asset references are strictly validated',()=>{
  assert.equal(validSelector('x'.repeat(22)),true)
  assert.equal(validSelector('x'.repeat(23)),false)
  assert.equal(validSecret('x'.repeat(43)),true)
  assert.equal(validSecret('x'.repeat(22)),false)
  assert.throws(()=>normalizeDraft({...make(),media:[{...make().media[0],assetId:'../unsafe'}]}))
})
test('normalization records ordered media and rejects duplicates',()=>{
  const draft=normalizeDraft(make())
  assert.equal(draft.media[1].sortOrder,1)
  assert.throws(()=>normalizeDraft({...make(),media:[make().media[0],make().media[0]]}))
  assert.throws(()=>normalizeDraft({...make(),media:[{...make().media[0],scope:'everyone'}]}))
})
test('owner-only voice notes never enter published snapshot',()=>{
  const payload=clientPayload(normalizeDraft(make()))
  assert.deepEqual(payload.media.map(x=>x.assetId),[AUDIO])
  assert.equal(JSON.stringify(payload).includes('Owner only'),false)
  assert.equal(JSON.stringify(payload).includes('Private note'),false)
})
test('empty session drafts are isolated and contain no media',()=>{
  const first=emptySessionDraft()
  const second=emptySessionDraft()
  first.media.push({assetId:AUDIO})
  assert.equal(second.media.length,0)
})
test('transcript fields require strings and titles have length limits',()=>{
  assert.throws(()=>normalizeDraft({...make(),media:[{...make().media[0],transcript:null}]}))
  assert.throws(()=>normalizeDraft({...make(),title:'x'.repeat(161)}))
  assert.throws(()=>normalizeDraft({...make(),media:Array.from({length:31},()=>make().media[0])}))
})
