import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import {traditionCourse} from '../lib/personal-coaching/traditions.js'
import * as model from '../lib/academy/coaching-audio-model.js'
import {
  REIKI_INTRO_MIME,reikiIntroCanonicalMime,reikiIntroPublicStorageOrigin,
} from '../lib/academy/reiki-intro-audio-model.js'

/**
 * Deterministic, network-free execution of the real private-audio store:
 * backend storage calls are replaced, but actual validation/manifest/URL
 * logic is not. No real Supabase objects or author recordings are touched.
 * Real iPhone + provider-delivery E2E remains a separate owner-device gate.
 */
function fakeStorage(){
 const data=new Map([
  [model.COACHING_AUDIO_BUCKET,new Map()],
  [model.COACHING_AUDIO_INDEX_BUCKET,new Map()],
 ])
 const project='https://aaaaaaaaaaaaaaaaaaaa.supabase.co'
 const options={
  [model.COACHING_AUDIO_BUCKET]:{public:false,file_size_limit:25000000,
   allowed_mime_types:['audio/mpeg','audio/mp4','audio/wav','audio/x-m4a']},
  [model.COACHING_AUDIO_INDEX_BUCKET]:{public:true,file_size_limit:20000000,
   allowed_mime_types:['application/json','audio/mpeg','audio/mp4','audio/wav']},
 }
 const get=id=>{if(!data.has(id))throw Error('unknown bucket '+id);return data.get(id)}
 const api={
  storage:{
   getBucket:async id=>({data:options[id]||null,error:options[id]?null:{message:'not found'}}),
   from:id=>({
    list:async folder=>({data:[...get(id).entries()]
     .filter(([path,entry])=>entry.kind==='audio'&&path.startsWith(folder+'/'))
     .map(([path,entry])=>({
      id:'object-id',name:path.split('/').at(-1),
      metadata:{size:entry.size,mimetype:entry.mime},
      created_at:'2026-10-24T20:00:00.000Z',
     })),error:null}),
    info:async path=>{
      const found=get(id).get(path)
      return found?.kind==='audio'
       ?{data:{size:found.size,content_type:found.mime},error:null}
       :{data:null,error:{statusCode:'404',message:'Object not found'}}
    },
    createSignedUploadUrl:async path=>({data:{token:'fixture-upload-token',path},error:null}),
    createSignedUrl:async(path,expiresIn)=>{
      const record=get(id).get(path)
      return record?.kind==='audio'
       ?{data:{signedUrl:project+'/storage/v1/object/sign/'+id+'/'+path+
         '?token=fixture-'+expiresIn},error:null}
       :{data:null,error:{statusCode:'404',message:'Object not found'}}
    },
    download:async path=>{
      const record=get(id).get(path)
      return record?.kind==='json'?{data:record.blob,error:null}
       :{data:null,error:{statusCode:'404',message:'Object not found'}}
    },
    upload:async(path,blob,opts)=>{
      if(id!==model.COACHING_AUDIO_INDEX_BUCKET||opts.contentType!=='application/json')
        return {error:{message:'unexpected upload'}}
      get(id).set(path,{kind:'json',blob})
      return {error:null}
    },
   }),
  },
 }
 const source=readFileSync(new URL('../lib/academy/coaching-audio-store.js',import.meta.url),'utf8')
 // Strip module imports, inject their exports explicitly; no production code
 // is altered and no new public server entrypoint is created by the test.
 const functions=source.slice(source.indexOf('function fail(')).replace(/^export\s+/gm,'')
 const dependencies={
  randomUUID,createClient:()=>api,
  ...model,REIKI_INTRO_MIME,reikiIntroCanonicalMime,reikiIntroPublicStorageOrigin,
  traditionCourse,
 }
 const compile=new Function(...Object.keys(dependencies),
  functions+'\nreturn {ownerCoachingAudioRead,prepareCoachingAudio,'+
  'previewCoachingAudio,publishCoachingAudio,unpublishCoachingAudio,learnerCoachingAudio}')
 const store=compile(...Object.values(dependencies))
 const config={supabaseUrl:project,secretKey:'sb_secret_fixture_never_network',
  publishableKey:'sb_publishable_fixture'}
 return {
  store,config,objects:data,
  saveOriginal(path,mime='audio/mp4',size=8000){
   get(model.COACHING_AUDIO_BUCKET).set(path,{kind:'audio',mime,size})
  },
  async approvedIndex(){
   const saved=get(model.COACHING_AUDIO_INDEX_BUCKET).get(model.COACHING_AUDIO_MANIFEST)
   return saved?await saved.blob.text():null
  },
 }
}

test('owner audio: actual store requires real saved bytes and explicit approval before student playback',async()=>{
 const v=fakeStorage()
 const slot={course:'egyptian',question:'egyptian_ka_desire_v1',locale:'ru'}
 const intent=await v.store.prepareCoachingAudio(v.config,
  {...slot,filename:'Моя запись.m4a',mime:'audio/mp4',bytes:8000})
 assert.equal(intent.bucket,model.COACHING_AUDIO_BUCKET)
 assert.match(intent.path,/^coaching\/egyptian\/egyptian_ka_desire_v1\/ru\/[0-9a-f]{32}\.m4a$/)
 assert.equal(intent.token,'fixture-upload-token')
 await assert.rejects(()=>v.store.previewCoachingAudio(v.config,{...slot,path:intent.path}),
  err=>err.code==='COACHING_AUDIO_UPLOAD_NOT_FOUND')
 assert.deepEqual((await v.store.ownerCoachingAudioRead(v.config,slot)).files,[])
 assert.equal((await v.store.learnerCoachingAudio(v.config,
  'hh-egyptian-goal-planning-v1',slot.question,slot.locale)).audio,null)

 v.saveOriginal(intent.path)
 const privateList=await v.store.ownerCoachingAudioRead(v.config,slot)
 assert.equal(privateList.files.length,1)
 assert.equal(privateList.active,null)
 assert.equal((await v.store.previewCoachingAudio(v.config,{...slot,path:intent.path}))
  .expiresInSeconds,300)
 await assert.rejects(()=>v.store.publishCoachingAudio(v.config,{...slot,path:intent.path}),
  err=>err.code==='INVALID_COACHING_AUDIO_FILE')
 assert.equal((await v.store.learnerCoachingAudio(v.config,
  'hh-egyptian-goal-planning-v1',slot.question,slot.locale)).audio,null)

 const publish=await v.store.publishCoachingAudio(v.config,
  {...slot,path:intent.path,confirmed:true})
 assert.equal(publish.active.path,intent.path)
 const learner=await v.store.learnerCoachingAudio(v.config,
  'hh-egyptian-goal-planning-v1',slot.question,slot.locale)
 assert.match(learner.audio.url,/\/storage\/v1\/object\/sign\/hh-practitioner-course-media\//)
 assert.equal(learner.audio.expiresInSeconds,900)
 assert.equal((await v.store.learnerCoachingAudio(v.config,
  'hh-egyptian-goal-planning-v1',slot.question,'en')).audio,null)
 assert.equal((await v.store.learnerCoachingAudio(v.config,
  'hh-greek-goal-planning-v1','greek_logos_order_v1','ru')).audio,null)
 await assert.rejects(()=>v.store.previewCoachingAudio(v.config,{
  course:'greek',question:'greek_logos_order_v1',locale:'ru',path:intent.path}),
  err=>err.code==='INVALID_COACHING_AUDIO_FILE')

 await v.store.unpublishCoachingAudio(v.config,{...slot,confirmed:true})
 assert.equal((await v.store.learnerCoachingAudio(v.config,
  'hh-egyptian-goal-planning-v1',slot.question,slot.locale)).audio,null)
 assert.equal((await v.store.ownerCoachingAudioRead(v.config,slot)).files.length,1)
 const json=await v.approvedIndex()
 assert.ok(json)
 assert.ok(!json.includes('Моя запись')&&!json.includes('token='))
 assert.ok(!json.includes('answer')&&!json.includes('transcript'))
 assert.deepEqual(JSON.parse(json),{version:1,slots:{}})
})

test('owner audio: separate Greek question and ES language can be approved without affecting Egyptian files',async()=>{
 const v=fakeStorage()
 const slot={course:'greek',question:'greek_telos_potential_v1',locale:'es'}
 const intent=await v.store.prepareCoachingAudio(v.config,
  {...slot,filename:'voz final.m4a',mime:'audio/x-m4a',bytes:10000})
 // Browser storage metadata can use audio/x-m4a; server normalizes it.
 v.saveOriginal(intent.path,'audio/x-m4a',10000)
 assert.equal((await v.store.ownerCoachingAudioRead(v.config,slot)).files.length,1)
 assert.equal((await v.store.publishCoachingAudio(v.config,{...slot,path:intent.path,confirmed:true})).active.bytes,10000)
 assert.equal((await v.store.learnerCoachingAudio(v.config,
  'hh-greek-goal-planning-v1','greek_telos_potential_v1','es')).audio.expiresInSeconds,900)
 assert.equal((await v.store.learnerCoachingAudio(v.config,
  'hh-greek-goal-planning-v1','greek_telos_potential_v1','ru')).audio,null)
 assert.equal((await v.store.learnerCoachingAudio(v.config,
  'hh-egyptian-goal-planning-v1','goal','es')).audio,null)
 await assert.rejects(()=>v.store.prepareCoachingAudio(v.config,{
  ...slot,question:'forged',filename:'voice.mp3',mime:'audio/mpeg',bytes:10000}),
  err=>err.code==='INVALID_COACHING_AUDIO_SLOT')
})
