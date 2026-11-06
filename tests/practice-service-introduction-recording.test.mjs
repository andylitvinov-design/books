import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {normalizeServiceIntroductions,normalizeVideoPresentation,publicPresentationUrl} from '../lib/practitioners/presentation-contract.js'
import {validateServiceDraft} from '../lib/practitioners/contracts.js'
const owner='22222222-2222-4222-8222-222222222222'
const asset='11111111-1111-4111-8111-111111111111'
const uploaded=ext=>({kind:'upload',assetId:asset,path:owner+'/'+asset+'.'+ext})
const service=serviceIntroductions=>validateServiceDraft({
  copy:{en:{title:'Test service',shortDescription:'Test service description'}},
  areaKey:'personal_development',offeringType:'session',deliveryFormat:'online',
  pricingMode:'contact',languages:['en'],serviceIntroductions,
},{complete:true})

test('English video + Russian audio are accepted with canonical media URLs',()=>{
 const intros=[
  {language:'en',type:'video',media:{kind:'external',url:'https://youtu.be/DX9zJhDvIWY'}},
  {language:'ru',type:'audio',media:uploaded('m4a')},
 ]
 const validated=service(intros).serviceIntroductions
 assert.equal(validated.length,2)
 assert.equal(validated[0].media.url,'https://www.youtube.com/watch?v=DX9zJhDvIWY')
 assert.deepEqual(validated[1],intros[1])
 assert.equal(publicPresentationUrl(uploaded('m4a'),'https://example.supabase.co','audio'),
  'https://example.supabase.co/storage/v1/object/public/hh-practitioner-presentations/'+owner+'/'+asset+'.m4a')
})
test('accept iPhone M4A, MP3 and Android/WebM audio; video WebM, MOV and MP4',()=>{
 for(const ext of ['m4a','mp3','webm'])assert.equal(normalizeVideoPresentation(uploaded(ext),'audio').kind,'upload')
 for(const ext of ['mp4','mov','webm'])assert.equal(normalizeVideoPresentation(uploaded(ext),'video').kind,'upload')
})
test('reject duplicate languages, too many messages, audio links and mismatched MIME paths',()=>{
 const audio={language:'ru',type:'audio',media:uploaded('m4a')}
 assert.throws(()=>normalizeServiceIntroductions([audio,audio]))
 assert.throws(()=>normalizeServiceIntroductions([audio,
   {language:'en',type:'video',media:uploaded('mp4')},
   {language:'es',type:'video',media:uploaded('mov')}]))
 assert.throws(()=>normalizeServiceIntroductions([{language:'es',type:'audio',
   media:{kind:'external',url:'https://vimeo.com/12345678'}}]))
 assert.throws(()=>normalizeServiceIntroductions([{language:'en',type:'audio',media:uploaded('mp4')}]))
 assert.throws(()=>normalizeServiceIntroductions([{language:'en',type:'video',media:uploaded('m4a')}]))
 assert.throws(()=>normalizeServiceIntroductions([{language:'fr',type:'audio',media:uploaded('m4a')}]))
 assert.throws(()=>normalizeServiceIntroductions([{language:'ru',type:'audio',media:uploaded('m4a'),secret:true}]))
 assert.deepEqual(service([]).serviceIntroductions,[])
})
test('browser captures are uploaded only through owner signed-intent/complete flow, never direct service URL',async()=>{
 const [component,editor,repo,route,player,page,sql]=await Promise.all([
  'components/app/service-introduction-editor.jsx','components/app/simple-service-editor.jsx','lib/practitioners/repository.js',
  'app/api/app/[...path]/route.js','components/practitioner-presentation-video.tsx',
  'app/[locale]/services/[practitionerSlug]/[serviceSlug]/page.tsx',
  'supabase/migrations/20261025170000_hh_service_introductions_audio_video.sql',
 ].map(path=>readFile(new URL('../'+path,import.meta.url),'utf8')))
 assert.match(component,/getUserMedia/)
 assert.match(component,/MediaRecorder/)
 assert.match(component,/recording/)
 assert.match(component,/uploadPractitionerPresentationFile\(take.file,take.type\)/)
 assert.match(component,/onChange/)
 assert.match(editor,/onIntroductionsChange/)
 assert.match(repo,/assertOwnedReadyPresentation\(db,actor,intro.media,intro.type\)/)
 assert.match(repo,/serviceIntroductions:draft.serviceIntroductions/)
 assert.match(route,/practice\/video-upload\/complete/)
 assert.match(player,/audio controls autoPlay/)
 assert.match(player,/selectedLanguage/)
 assert.match(page,/id="request-service"/)
 assert.match(page,/service\.serviceIntroductions\?\.length/)
 assert.match(sql,/audio\/mp4/)
 assert.doesNotMatch(sql,/hh-client-private-media/)
})
