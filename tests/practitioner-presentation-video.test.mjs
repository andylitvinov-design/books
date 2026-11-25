import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {normalizeVideoPresentation,publicPresentationUrl,PRESENTATION_BUCKET} from '../lib/practitioners/presentation-contract.js'
import {validateProfile,validateServiceDraft} from '../lib/practitioners/contracts.js'

const asset='11111111-1111-4111-8111-111111111111'
const owner='22222222-2222-4222-8222-222222222222'
function profile(videoPresentation){
 return validateProfile({displayName:'Synthetic',professionalTitle:'Therapist',shortBio:'Synthetic only',
  languages:['en'],formats:['online'],areas:['personal_development'],videoPresentation})
}
function service(videoPresentation){
 return validateServiceDraft({copy:{en:{title:'Synthetic',shortDescription:'Example'},
  ru:{title:'Тест',shortDescription:'Тест'}},areaKey:'personal_development',offeringType:'session',
  deliveryFormat:'online',languages:['en'],pricingMode:'free',videoPresentation})
}
test('safe canonical YouTube and Vimeo video introductions on both profile and service',()=>{
 const youtube='https://youtu.be/DX9zJhDvIWY'
 assert.deepEqual(profile({kind:'external',url:youtube}).videoPresentation,
  {kind:'external',url:'https://www.youtube.com/watch?v=DX9zJhDvIWY'})
 assert.deepEqual(service({kind:'external',url:'https://vimeo.com/12345678'}).videoPresentation,
  {kind:'external',url:'https://vimeo.com/12345678'})
 assert.equal(profile(null).videoPresentation,null)
})
test('reject untrusted URLs, spoofed paths and secret links',()=>{
 for(const url of ['http://youtu.be/DX9zJhDvIWY','https://drive.google.com/file/d/abc',
  'javascript:alert(1)','https://youtube.com.evil.org/watch?v=DX9zJhDvIWY','https://www.youtube.com/watch?v=evil']){
  assert.throws(()=>normalizeVideoPresentation({kind:'external',url}))
 }
 for(const wrong of [{kind:'upload',assetId:asset,path:owner+'/'+owner+'.mp4'},
  {kind:'upload',assetId:asset,path:'../'+asset+'.mp4'},{kind:'external',url:'https://vimeo.com/12345678',script:'x'}])
  assert.throws(()=>normalizeVideoPresentation(wrong))
})
test('verified-looking upload reference has canonical CDN url; DB must verify ownership and ready state',()=>{
 const video={kind:'upload',assetId:asset,path:owner+'/'+asset+'.mp4'}
 assert.deepEqual(service(video).videoPresentation,video)
 assert.equal(publicPresentationUrl(video,'https://sample.supabase.co'),
   'https://sample.supabase.co/storage/v1/object/public/'+PRESENTATION_BUCKET+'/'+owner+'/'+asset+'.mp4')
})
test('public media and upload API preserve moderation, identity and no private video reuse',async()=>{
 const [repo,route,masterPage,servicePage,ui,sql,storage]=await Promise.all([
 'lib/practitioners/repository.js','app/api/app/[...path]/route.js','app/[locale]/masters/[slug]/page.tsx',
 'app/[locale]/services/[practitionerSlug]/[serviceSlug]/page.tsx','components/app/practice-workspace.jsx',
 'supabase/migrations/20261017164000_hh_practitioner_presentation_videos.sql',
 'lib/practitioners/presentation-storage.js'].map(p=>readFile(new URL('../'+p,import.meta.url),'utf8')))
 assert.match(repo,/assertOwnedReadyPresentation/)
 assert.match(repo,/videoPresentation:draft.videoPresentation/)
 assert.match(route,/practice\/video-upload\/intent/)
 assert.match(masterPage,/PractitionerPresentationVideo/)
 assert.match(servicePage,/PractitionerPresentationVideo/)
 assert.match(ui,/PracticeVideoField/)
 assert.match(sql,/app_private.practitioner_presentation_uploads/)
 assert.match(sql,/enable row level security/)
 assert.match(sql,/hh-practitioner-presentations/)
 assert.match(storage,/createSignedUploadUrl/)
 assert.match(storage,/sniffPrivateMedia/)
 assert.doesNotMatch(sql,/hh-client-private-media/)
})
