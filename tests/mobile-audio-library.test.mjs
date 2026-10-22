import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {normalizePhoneAudioFile} from '../lib/clients/phone-audio-file.js'
import {normalizeClientPlan,SESSION_MEDIA_TYPES} from '../lib/clients/delivery-model.js'
import {COURSE_MEDIA_TYPES} from '../lib/practitioners/course-contracts.js'
import {saveRecording} from '../lib/clients/recording-upload.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const id='d7a9c2de-667e-43c2-9e16-134bbf000001'
class TestFile{
 constructor(chunks,name,options={}){
  this.name=name
  this.type=options.type||''
  this.size=chunks.reduce((n,part)=>n+Number(part?.size||part?.length||0),0)
  this.lastModified=options.lastModified||0
 }
}
const formats=[
 ['memo.m4a','audio/x-m4a','audio/mp4'],
 ['speech.MP3','application/octet-stream','audio/mpeg'],
 ['session.wav','audio/x-wav','audio/wav'],
 ['voice.wave','audio/vnd.wave','audio/wav'],
 ['browser.webm','','audio/webm'],
 ['podcast.oga','application/ogg','audio/ogg'],
 ['message.opus','audio/opus','audio/ogg'],
 ['meditation.flac','audio/x-flac','audio/flac'],
 ['sound.aac','audio/x-aac','audio/aac'],
]
test('iPhone Files, Android, and third-party voice MIME aliases normalize by safe extension',()=>{
 for(const [name,declared,canonical] of formats){
  const result=normalizePhoneAudioFile({name,type:declared,size:142,lastModified:123},TestFile)
  assert.equal(result.type,canonical,name)
  assert.equal(result.name,name)
  assert.equal(result.size,142)
  assert.equal(result.lastModified,123)
 }
})
test('a mismatched MIME is not silently converted into an audio file',()=>{
 const invalid={name:'not-a-wav.wav',type:'text/html',size:142}
 assert.equal(normalizePhoneAudioFile(invalid,TestFile),invalid)
 const unknown={name:'legacy.caf',type:'application/octet-stream',size:1000}
 assert.equal(normalizePhoneAudioFile(unknown,TestFile),unknown)
})
test('all accepted phone audio types share the same private <=20MB size and MIME boundaries',()=>{
 for(const mime of ['audio/mpeg','audio/mp4','audio/x-m4a','audio/webm',
  'audio/wav','audio/x-wav','audio/ogg','audio/flac','audio/aac']){
  assert.deepEqual(SESSION_MEDIA_TYPES[mime].kind,'audio')
  assert.equal(SESSION_MEDIA_TYPES[mime].max,20_000_000)
  assert.equal(COURSE_MEDIA_TYPES[mime].kind,'audio')
  assert.equal(COURSE_MEDIA_TYPES[mime].max,20_000_000)
 }
})
test('session report snapshot accepts ONLY approved audio material metadata',()=>{
 const snap={id,kind:'audio',title:'Grounding practice',description:'Listen after session',mime:'audio/wav'}
 const p=normalizeClientPlan({materialIds:[id],materials:[snap]})
 assert.deepEqual(p.materials,[snap])
 for(const unsafe of [
  {...snap,url:'https://external.example/secret'},
  {...snap,kind:'youtube'},
  {...snap,mime:'text/html'},
  {...snap,clientId:'private'},
 ]){
  assert.throws(()=>normalizeClientPlan({materialIds:[id],materials:[unsafe]}))
 }
})
test('recorded or imported WAV is accepted only via pinned consultation intent and explicit attach',async()=>{
 const calls=[]
 const job={file:{name:'voice.wav',type:'audio/wav',size:1024},clientId:id,sessionId:id,
  scope:'client',durationSeconds:29,intentId:id,intent:null,uploaded:false}
 await saveRecording(job,{
  post:async(_url,body)=>{calls.push(body);return body.action==='intent'?{assetId:id}:{}},
  upload:async(_intent,_file,mime)=>{assert.equal(mime,'audio/wav')},
 })
 assert.equal(calls[0].bytes,1024)
 assert.equal(calls[0].kind,'audio')
 assert.equal(calls[0].scope,'client')
 assert.equal(calls[1].action,'complete')
})
test('existing private signed-upload and media sniff protect audio content, never public Storage URLs',()=>{
 const storage=read('lib/clients/session-delivery-storage.js')
 const library=read('lib/clients/material-library.js')
 const picker=read('components/session-material-picker.jsx')
 const report=read('components/client-session-page.jsx')
 const owner=read('components/practitioner-materials-cabinet.jsx')
 const route=read('app/api/admin/materials/route.js')
 assert.match(storage,/RIFF/)
 assert.match(storage,/WAVE/)
 assert.match(storage,/OggS/)
 assert.match(storage,/fLaC/)
 assert.match(storage,/MEDIA_TYPE_NOT_ALLOWED/)
 assert.match(library,/sniffPrivateMedia/)
 assert.match(library,/streamReadyMaterial/)
 assert.match(library,/\['image','video','audio'\]/)
 assert.match(picker,/item.kind==='audio'/)
 assert.match(report,/kind:item.kind,mime:item.mime/)
 assert.match(report,/<audio ref=\{player\}/)
 assert.match(owner,/normalizePhoneAudioFile/)
 assert.match(owner,/item.kind==='audio'\?<audio/)
 assert.match(route,/ownerMaterialRequest/)
})
test('reuse from saved audio to a course is owner-only, quota-bound and separately authorized',()=>{
 const route=read('app/api/app/practice/courses/route.js')
 const repository=read('lib/practitioners/course-repository.js')
 const builder=read('components/app/practitioner-course-builder.jsx')
 const practice=read('components/app/practice-materials.jsx')
 assert.match(route,/import-library-audio/)
 assert.match(route,/requireAdminRequest\(\)/)
 assert.match(repository,/material.kind!=='audio'/)
 assert.match(repository,/source.copy\(/)
 assert.match(repository,/destinationBucket:COURSE_BUCKET/)
 assert.match(repository,/this.mediaIntent\(actor/)
 assert.match(repository,/this.mediaComplete\(actor/)
 assert.match(builder,/import-library-audio/)
 assert.match(builder,/isOwner&&/)
 assert.match(practice,/data-general-audio-library/)
})
test('storage migration broadens two private buckets, not public Reiki media',()=>{
 const migration=read('supabase/migrations/20261022141000_hh_private_phone_audio_materials.sql')
 assert.match(migration,/practitioner_materials_payload/)
 assert.match(migration,/kind IN \('image','video','audio'\)/)
 assert.match(migration,/20000000/)
 assert.match(migration,/hh-client-private-media/)
 assert.match(migration,/hh-practitioner-course-media/)
 assert.match(migration,/b.public IS FALSE/)
 assert.doesNotMatch(migration,/hh-reiki-course-audio/)
})
