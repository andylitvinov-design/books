import 'server-only'
import {randomUUID} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
import {
  COACHING_AUDIO_BUCKET,COACHING_AUDIO_INDEX_BUCKET,COACHING_AUDIO_MANIFEST,
  COACHING_AUDIO_MAX_BYTES,coachingAudioSlot,coachingAudioFolder,coachingAudioPath,
  validCoachingAudioPath,validCoachingAudioEntry,cleanCoachingAudioManifest,coachingAudioMime,
} from './coaching-audio-model.js'
import {REIKI_INTRO_MIME,reikiIntroCanonicalMime,reikiIntroPublicStorageOrigin} from './reiki-intro-audio-model.js'
import {traditionCourse} from '../personal-coaching/traditions.js'

function fail(code='COACHING_AUDIO_STORAGE_UNAVAILABLE'){
  const error=new Error(code);error.code=code;throw error
}
function service(config){
  if(!reikiIntroPublicStorageOrigin(config?.supabaseUrl)||!config?.secretKey) fail('COACHING_AUDIO_NOT_CONFIGURED')
  return createClient(config.supabaseUrl,config.secretKey,{
    auth:{persistSession:false,autoRefreshToken:false},
    global:{headers:{'x-client-info':'hh-coaching-audio/1'},
      fetch:(input,init)=>{
        const headers=new Headers(init?.headers)
        if(config.secretKey.startsWith('sb_secret_')&&
          headers.get('authorization')==='Bearer '+config.secretKey) headers.delete('authorization')
        const url=new URL(typeof input==='string'?input:input.url||String(input))
        if(url.origin!==config.supabaseUrl)fail()
        return fetch(input,{...init,headers,redirect:'error'})
      }},
  })
}
const missing=error=>String(error?.statusCode||error?.status||'')==='404'||
  /object not found|not found/i.test(String(error?.message||''))
async function checked(config,name,publicExpected){
  const client=service(config)
  const {data,error}=await client.storage.getBucket(name)
  if(error||!data||data.public!==publicExpected||
    Number(data.file_size_limit)<COACHING_AUDIO_MAX_BYTES)fail()
  const needed=publicExpected?['application/json']:['audio/mpeg','audio/mp4','audio/wav']
  if(!Array.isArray(data.allowed_mime_types)||needed.some(t=>!data.allowed_mime_types.includes(t)))fail()
  return client.storage.from(name)
}
function details(info,path){
  const bytes=Number(info?.size??info?.metadata?.size)
  const mime=reikiIntroCanonicalMime(String(info?.content_type||info?.contentType||
    info?.mimetype||info?.metadata?.mimetype||''))
  return Number.isSafeInteger(bytes)&&bytes>=512&&bytes<=COACHING_AUDIO_MAX_BYTES&&
    REIKI_INTRO_MIME[mime]&&path.endsWith('.'+REIKI_INTRO_MIME[mime])
    ? {bytes,mime}:null
}
async function readManifest(config){
  const index=await checked(config,COACHING_AUDIO_INDEX_BUCKET,true)
  const {data,error}=await index.download(COACHING_AUDIO_MANIFEST)
  if(error){if(missing(error))return {version:1,slots:{}};fail()}
  if(!data||data.size>40000)fail()
  try{return cleanCoachingAudioManifest(JSON.parse(await data.text()))}catch{fail()}
}
async function writeManifest(config,manifest){
  const index=await checked(config,COACHING_AUDIO_INDEX_BUCKET,true)
  const value=cleanCoachingAudioManifest(manifest)
  const payload=JSON.stringify(value)
  const {error}=await index.upload(COACHING_AUDIO_MANIFEST,
    new Blob([payload],{type:'application/json'}),
    {contentType:'application/json',cacheControl:'0',upsert:true})
  if(error)fail()
  if(JSON.stringify(await readManifest(config))!==payload)fail('COACHING_AUDIO_VERIFY_FAILED')
  return value
}
function requireSlot(input){
  const {course,question,locale}=input||{}
  if(!coachingAudioSlot(course,question,locale))fail('INVALID_COACHING_AUDIO_SLOT')
  return {course,question,locale,key:coachingAudioSlot(course,question,locale)}
}
export async function ownerCoachingAudioRead(config,input){
  const {course,question,locale,key}=requireSlot(input)
  const folder=coachingAudioFolder(course,question,locale)
  const storage=await checked(config,COACHING_AUDIO_BUCKET,false)
  const [{data,error},manifest]=await Promise.all([
    storage.list(folder,{limit:100,offset:0,sortBy:{column:'name',order:'desc'}}),
    readManifest(config),
  ])
  if(error||!Array.isArray(data))fail()
  const files=data.map(item=>{
    if(!item?.id||typeof item.name!=='string')return null
    const path=folder+'/'+item.name
    if(!validCoachingAudioPath(path,course,question,locale))return null
    const info=details(item,path)
    if(!info)return null
    return {path,...info,createdAt:item.created_at||null}
  }).filter(Boolean)
  return {files,active:manifest.slots[key]||null,truncated:data.length>=100}
}
export async function prepareCoachingAudio(config,input){
  const {course,question,locale}=requireSlot(input)
  const mime=coachingAudioMime(input.mime,input.filename)
  if(!mime||!Number.isSafeInteger(input.bytes)||
    input.bytes<512||input.bytes>COACHING_AUDIO_MAX_BYTES)fail('INVALID_COACHING_AUDIO_FILE')
  const storage=await checked(config,COACHING_AUDIO_BUCKET,false)
  const path=coachingAudioPath(course,question,locale,randomUUID().replaceAll('-',''),mime)
  const {data,error}=await storage.createSignedUploadUrl(path)
  if(error||!data?.token)fail()
  return {course,question,locale,bytes:input.bytes,path,mime,
    token:data.token,bucket:COACHING_AUDIO_BUCKET,
    supabaseUrl:config.supabaseUrl,publishableKey:config.publishableKey}
}
export async function previewCoachingAudio(config,input){
  const {course,question,locale}=requireSlot(input)
  if(!validCoachingAudioPath(input.path,course,question,locale))fail('INVALID_COACHING_AUDIO_FILE')
  const storage=await checked(config,COACHING_AUDIO_BUCKET,false)
  const {data:info,error}=await storage.info(input.path)
  if(error||!details(info,input.path))fail('COACHING_AUDIO_UPLOAD_NOT_FOUND')
  const {data, error:signError}=await storage.createSignedUrl(input.path,300)
  if(signError||!data?.signedUrl)fail()
  const url=new URL(data.signedUrl,config.supabaseUrl)
  if(url.origin!==config.supabaseUrl||
    !url.pathname.startsWith('/storage/v1/object/sign/'+COACHING_AUDIO_BUCKET+'/')||
    !url.searchParams.has('token'))fail()
  return {previewUrl:url.toString(),expiresInSeconds:300}
}
export async function publishCoachingAudio(config,input){
  const {course,question,locale,key}=requireSlot(input)
  if(input.confirmed!==true||!validCoachingAudioPath(input.path,course,question,locale))
    fail('INVALID_COACHING_AUDIO_FILE')
  const storage=await checked(config,COACHING_AUDIO_BUCKET,false)
  const {data,error}=await storage.info(input.path)
  const info=error?null:details(data,input.path)
  if(!info)fail('COACHING_AUDIO_UPLOAD_NOT_FOUND')
  const manifest=await readManifest(config)
  manifest.slots[key]={path:input.path,...info,publishedAt:new Date().toISOString()}
  const saved=await writeManifest(config,manifest)
  return {active:saved.slots[key]}
}
export async function unpublishCoachingAudio(config,input){
  const {key}=requireSlot(input)
  if(input.confirmed!==true)fail('INVALID_COACHING_AUDIO_ACTION')
  const manifest=await readManifest(config)
  delete manifest.slots[key]
  const saved=await writeManifest(config,manifest)
  return {active:saved.slots[key]||null}
}
// Authenticated personal-coaching students only. Never return draft inventory or
// answer data. The object stays in private course storage even after "publish".
export async function learnerCoachingAudio(config,template,question,locale){
  const def=traditionCourse(template)
  if(!def||!coachingAudioSlot(def.slug,question,locale))fail('INVALID_COACHING_AUDIO_SLOT')
  const manifest=await readManifest(config)
  const entry=manifest.slots[coachingAudioSlot(def.slug,question,locale)]
  if(!validCoachingAudioEntry(entry,def.slug,question,locale))return {audio:null}
  const storage=service(config).storage.from(COACHING_AUDIO_BUCKET)
  const {data,error}=await storage.createSignedUrl(entry.path,900)
  if(error||!data?.signedUrl)fail()
  const url=new URL(data.signedUrl,config.supabaseUrl)
  if(url.origin!==config.supabaseUrl||
    !url.pathname.startsWith('/storage/v1/object/sign/'+COACHING_AUDIO_BUCKET+'/')||
    !url.searchParams.get('token'))fail()
  return {audio:{url:url.toString(),expiresInSeconds:900}}
}
