import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeDraft,clientPayload,emptySessionDraft,validSelector,validSecret,
  SESSION_MEDIA_TYPES, PRIVATE_MEDIA_BUCKET,deliveryEnabled,guestSessionProjection,normalizeClientPlan } from '../lib/clients/delivery-model.js'
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

test('guest session projection excludes cabinet identity and internal access metadata',()=>{
  const guest=guestSessionProjection({
    id:'246aa1a3-a371-5a83-9f4b-cd23ff027a76',
    clientId:'246aa1a3-a371-5a83-9f4b-cd23ff027a77',
    sourceConsultationId:'246aa1a3-a371-5a83-9f4b-cd23ff027a78',
    occurredOn:'2026-10-15',title:'Session A',summary:'Only A',
    draftRevision:3,publishedRevision:2,status:'published',
    report:{id:'246aa1a3-a371-5a83-9f4b-cd23ff027a79',kind:'recommendation'},
    media:[
      {assetId:'246aa1a3-a371-5a83-9f4b-cd23ff027a80',title:'Client A',kind:'audio',scope:'client',transcript:'Hello'},
      {assetId:'246aa1a3-a371-5a83-9f4b-cd23ff027a81',title:'Secret practitioner note',kind:'audio',scope:'practitioner',transcript:'Private'}
    ]
  })
  assert.equal(guest.title,'Session A')
  assert.equal(guest.report.kind,'recommendation')
  assert.equal(guest.media.length,1)
  assert.equal(guest.media[0].title,'Client A')
  const encoded=JSON.stringify(guest)
  for(const forbidden of ['clientId','sourceConsultationId','draftRevision','publishedRevision','Secret practitioner note','Private','246aa1a3-a371-5a83-9f4b-cd23ff027a79'])
    assert.equal(encoded.includes(forbidden),false,forbidden)
})


test('client session plan is small, human-authored and isolated per published snapshot',()=>{
  const plan={
    focus:'Inner support',nextStep:'Listen to the practice once',
    takeaways:['Notice your breathing','Rest after the meeting'],
    practices:[{title:'Grounding',instructions:'Spend 3 minutes noticing contact with the floor'}]
  }
  const a=normalizeDraft({...make(),plan}),b=normalizeDraft(make())
  assert.deepEqual(a.plan,normalizeClientPlan(plan))
  assert.deepEqual(b.plan,normalizeClientPlan())
  const published=clientPayload(a)
  assert.deepEqual(published.plan,normalizeClientPlan(plan))
  assert.equal(guestSessionProjection({...published,id:AUDIO,occurredOn:'2026-10-15'}).plan.focus,'Inner support')
  assert.equal(guestSessionProjection({...published,id:AUDIO,occurredOn:'2026-10-15',internalNotes:'Owner secret'}).internalNotes,undefined)
})

test('client plan rejects overlong or malformed instructions and never creates plan content',()=>{
  for(const plan of [
    {focus:'x'.repeat(301)}, {takeaways:Array(4).fill('a')},
    {takeaways:[42]}, {practices:[{title:'',instructions:'x'}]},
    {practices:[{title:'Okay',instructions:'x',secret:'bad'}]},
    {focus:'hello\0world'}, {nextStep:25}
  ])assert.throws(()=>normalizeClientPlan(plan))
  const first=emptySessionDraft(),second=emptySessionDraft()
  first.plan.takeaways.push('Unique to first')
  assert.deepEqual(second.plan.takeaways,[])
})


test('session layout sections accept practitioner-approved links and private media roles',()=>{
 const plan={additionalRecommendations:'Practitioner-approved extra notes',resources:[
   {title:'Approved public meditation',description:'Optional',url:'https://holistichouse.vercel.app/en/academy'}
 ]}
 const sample=normalizeDraft({...make(),plan,media:[{assetId:VIDEO,title:'How to take remedies',scope:'client',transcript:'',role:'instruction'}]})
 assert.equal(sample.plan.additionalRecommendations,'Practitioner-approved extra notes')
 assert.equal(sample.plan.resources.length,1)
 assert.equal(sample.media[0].role,'instruction')
 assert.equal(guestSessionProjection({...clientPayload(sample),occurredOn:'2026-10-15'}).media[0].role,'instruction')
 assert.equal(normalizeClientPlan().resources.length,0)
})

test('private session resource links disallow private network, tokens and Drive sharing',()=>{
 for(const url of ['http://example.com','https://localhost/secret','https://127.0.0.1/file',
   'https://drive.google.com/file/d/abc/view','https://foo.local/foo','https://10.0.0.1/internal',
   'https://example.com/?token=private','https://example.com/#secret']){
   assert.throws(()=>normalizeClientPlan({resources:[{title:'Bad',url}]}),url)
 }
 assert.throws(()=>normalizeClientPlan({resources:Array.from({length:9},(_,i)=>({title:'x'+i,url:'https://example.com/public'}))}))
 assert.throws(()=>normalizeClientPlan({additionalRecommendations:'x'.repeat(4001)}))
 assert.throws(()=>normalizeDraft({...make(),media:[{assetId:AUDIO,title:'x',scope:'client',transcript:'',role:'private-note'}]}))
 assert.equal(SESSION_MEDIA_TYPES['application/pdf'].kind,'pdf')
 assert.equal(SESSION_MEDIA_TYPES['application/pdf'].max,15_000_000)
})
