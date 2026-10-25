import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {TRADITION_COURSES} from '../lib/personal-coaching/traditions.js'
import {
 COACHING_AUDIO_BUCKET,COACHING_AUDIO_INDEX_BUCKET,COACHING_AUDIO_MAX_BYTES,
 COACHING_AUDIO_LANGUAGES,COACHING_AUDIO_COURSES,coachingAudioMime,
 coachingAudioQuestions,coachingAudioSlot,coachingAudioFolder,coachingAudioPath,
 validCoachingAudioPath,validCoachingAudioEntry,cleanCoachingAudioManifest,
} from '../lib/academy/coaching-audio-model.js'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('exact course questions and independent stage folders match the existing 11/10 steps',()=>{
 assert.deepEqual(COACHING_AUDIO_COURSES,['egyptian','greek'])
 assert.deepEqual(COACHING_AUDIO_LANGUAGES,['en','ru','es'])
 for(const course of TRADITION_COURSES){
  const slots=coachingAudioQuestions(course.slug)
  assert.equal(slots.length,course.totalScreens)
  assert.equal(slots[0].id,'goal')
  assert.equal(slots.at(-1).id,'action_24h')
  assert.equal(new Set(slots.map(i=>i.id)).size,slots.length)
  for(const slot of slots)for(const language of COACHING_AUDIO_LANGUAGES){
    assert.equal(coachingAudioSlot(course.slug,slot.id,language),[course.slug,slot.id,language].join(':'))
    assert.ok(coachingAudioFolder(course.slug,slot.id,language).includes('/'+language))
    assert.ok((slot.title[language]||slot.title.en).length>1)
  }
 }
 assert.deepEqual(coachingAudioQuestions('forged'),[])
 assert.equal(coachingAudioSlot('greek','egyptian_ka_desire_v1','ru'),null)
 assert.equal(coachingAudioSlot('egyptian','greek_logos_order_v1','en'),null)
 assert.equal(coachingAudioSlot('egyptian','ka','en'),null)
 assert.equal(coachingAudioSlot('egyptian','goal','fr'),null)
 assert.equal(coachingAudioSlot('__proto__','goal','ru'),null)
})
test('random immutable private paths are verified against course question and locale',()=>{
 const id='a'.repeat(32)
 const egypt=coachingAudioPath('egyptian','egyptian_ka_desire_v1','ru',id,'audio/mp4')
 assert.equal(egypt,'coaching/egyptian/egyptian_ka_desire_v1/ru/'+id+'.m4a')
 assert.ok(validCoachingAudioPath(egypt,'egyptian','egyptian_ka_desire_v1','ru'))
 assert.equal(validCoachingAudioPath(egypt,'egyptian','egyptian_ka_desire_v1','en'),false)
 assert.equal(validCoachingAudioPath(egypt,'greek','greek_logos_order_v1','ru'),false)
 assert.equal(validCoachingAudioPath(egypt+'?token=spoof','egyptian','egyptian_ka_desire_v1','ru'),false)
 assert.equal(validCoachingAudioPath(egypt.replace(id,'../'), 'egyptian','egyptian_ka_desire_v1','ru'),false)
 assert.equal(coachingAudioPath('egyptian','goal','en','../../../', 'audio/mpeg'),null)
 assert.equal(coachingAudioPath('egyptian','goal','en',id,'audio/html'),null)
 assert.equal(coachingAudioMime('audio/mp4','voice.m4a'),'audio/mp4')
 assert.equal(coachingAudioMime('','voice.m4a'),'audio/mp4')
 assert.equal(coachingAudioMime('','voice.exe'),null)
 assert.equal(coachingAudioMime('text/html','voice.m4a'),null)
 assert.equal(COACHING_AUDIO_MAX_BYTES,20000000)
 assert.equal(COACHING_AUDIO_BUCKET,'hh-practitioner-course-media')
 assert.equal(COACHING_AUDIO_INDEX_BUCKET,'hh-reiki-course-audio')
})
test('only approved manifest entries survive and no student answers or unexpected object keys leak',()=>{
 const id='b'.repeat(32),path=coachingAudioPath('greek','greek_logos_order_v1','es',id,'audio/mpeg')
 const key=coachingAudioSlot('greek','greek_logos_order_v1','es')
 const entry={path,mime:'audio/mpeg',bytes:5312,publishedAt:'2026-10-24T20:00:00.000Z'}
 assert.ok(validCoachingAudioEntry(entry,'greek','greek_logos_order_v1','es'))
 assert.equal(validCoachingAudioEntry({...entry,bytes:20000001},'greek','greek_logos_order_v1','es'),false)
 assert.equal(validCoachingAudioEntry({...entry,mime:'text/html'},'greek','greek_logos_order_v1','es'),false)
 assert.equal(validCoachingAudioEntry({...entry,path:entry.path.replace('/es/','/ru/')},'greek','greek_logos_order_v1','es'),false)
 const data=cleanCoachingAudioManifest({version:1,slots:{
    [key]:{...entry,answers:'PRIVATE_ANSWER',url:'https://attacker.test'},
    'greek:unknown:es':entry,'__proto__:goal:en':entry,
  },transcript:'SECRET'})
 assert.deepEqual(data,{version:1,slots:{[key]:entry}})
 assert.deepEqual(cleanCoachingAudioManifest({version:2,slots:{[key]:entry}}),{version:1,slots:{}})
})
test('server-only owner upload and signed student playback use distinct scopes and explicit approval',()=>{
 const api=read('app/admin/coaching-audio/data/route.js')
 const store=read('lib/academy/coaching-audio-store.js')
 const client=read('components/admin-coaching-audio.jsx')
 const appApi=read('app/api/app/[...path]/route.js')
 const learner=read('components/app/tradition-coaching-audio.jsx')
 const course=read('components/app/tradition-coaching.jsx')
 assert.match(api,/requireAdminRequest\(\)/)
 assert.match(api,/requireSameOrigin\(request,config\)/)
 assert.match(api,/input\.length>1500/)
 assert.match(api,/confirmed===true/)
 assert.match(store,/createSignedUploadUrl\(path\)/)
 assert.match(store,/storage\.info\(input\.path\)/)
 assert.match(store,/createSignedUrl\(entry\.path,900\)/)
 assert.match(store,/COACHING_AUDIO_INDEX_BUCKET,true/)
 assert.match(store,/COACHING_AUDIO_BUCKET,false/)
 assert.doesNotMatch(store,/storage\.getPublicUrl|storage\.getPublicUrl\(|\.remove\(|answers|transcript|client-private-media/)
 assert.match(client,/MediaRecorder/)
 assert.match(client,/getUserMedia\(\{audio:true\}\)/)
 assert.match(client,/type="file"/)
 assert.match(client,/uploadToSignedUrl/)
 assert.match(client,/window\.confirm\(t\.approval\)/)
 assert.match(client,/window\.confirm\(t\.detach\)/)
 assert.match(client,/data-coaching-mobile-file/)
 assert.match(appApi,/joined === 'tradition-coaching-audio'/)
 assert.match(appApi,/request\.headers\.get\('x-hh-account-id'\) !== actor\.id/)
 assert.match(appApi,/learnerCoachingAudio\(config/)
 assert.match(learner,/appFetch\(route,undefined,'GET',\{accountId\}\)/)
 assert.match(learner,/preload="none"/)
 assert.match(course,/TraditionCoachingAudio template=\{template\} question=\{question\.id\}/)
})
test('owner folders discoverable; signed storage allowed only by scoped CSP; friendly mobile UI',()=>{
 const index=read('app/admin/materials/page.js'),folder=read('app/admin/materials/coaching/page.jsx')
 const detail=read('app/admin/materials/coaching/[tradition]/page.jsx')
 const middleware=read('middleware.ts')
 const css=read('components/admin-coaching-audio.module.css')
 assert.match(index,/data-owner-coaching-folder-link/)
 assert.match(index,/\/admin\/materials\/coaching/)
 assert.match(folder,/if\(!await requireAdminRequest\(\)\)redirect/)
 assert.match(folder,/egyptian/)
 assert.match(folder,/greek/)
 assert.match(detail,/if\(!await requireAdminRequest\(\)\)redirect/)
 assert.match(detail,/coachingAudioQuestions\(course\.slug\)/)
 assert.match(middleware,/coachingOwnerAudioManager/)
 assert.match(middleware,/coachingLearnerAudioPlayer/)
 assert.match(middleware,/reikiIntroAudioOrigin/)
 assert.match(css,/@media\(max-width:460px\)/)
 assert.match(css,/focus-visible/)
})
