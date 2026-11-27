import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFileSync,readdirSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
import {NextRequest,NextResponse} from 'next/server.js'
import {personalVideoStorageCsp} from '../lib/app/personal-video-storage-csp.mjs'
import * as publicHomeDocument from '../lib/public-home-document-request.mjs'
import {inspectPersonalVideoFile,personalVideoDuration,validPersonalVideoDuration} from '../lib/app/personal-video-file-contract.mjs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const server=read('lib/app/personal-videos.js')
const list=read('app/api/app/personal-videos/route.js')
const item=read('app/api/app/personal-videos/[id]/route.js')
const schema=read('supabase/migrations/20261028161029_hh_account_personal_videos_private_20261028.sql')
const consentMigration=read('supabase/migrations/20261028165914_hh_personal_video_consent_purpose_20261028.sql')
const gallery=read('components/app/my-personal-videos.jsx')
const uploader=read('lib/mandala/signed-private-video-upload.mjs')
const shell=read('components/app/app-workspace.jsx')
const route=read('app/[locale]/app/[[...path]]/page.jsx')

test('ordinary short client clips keep their duration instead of requiring a generator preset',()=>{
  for(const seconds of [0.25,1,8,8.5,15,23,45,59.4,60]){
    const stored=personalVideoDuration(seconds)
    assert.equal(stored,Math.ceil(seconds))
    assert.equal(validPersonalVideoDuration(stored),true)
  }
  for(const seconds of [0,-1,60.1,Infinity,NaN,'45'])
    assert.throws(()=>personalVideoDuration(seconds),{code:'VIDEO_DURATION_NOT_ALLOWED'})
  for(const seconds of [0,61,1.5,'45',null])assert.equal(validPersonalVideoDuration(seconds),false)
  assert.match(server,/validPersonalVideoDuration\(input\.duration\)/)
  const durationMigration=read('supabase/migrations/20261123225621_hh_client_video_upload_duration_20261124.sql')
  assert.match(durationMigration,/check \(duration_seconds between 1 and 60\) not valid/)
  assert.match(durationMigration,/validate constraint personal_videos_duration_seconds_check/)
  assert.doesNotMatch(durationMigration.replace(/^--.*$/gm,''),/delete from|update app_private|disable row level security|grant /i)
})
test('iPhone MP4 with an omitted MIME still needs the extension and actual MP4 signature',async()=>{
  const bytes=new Uint8Array(2048)
  bytes.set(new TextEncoder().encode('ftypisom'),4)
  for(const mime of ['video/mp4','','application/octet-stream'])
    await inspectPersonalVideoFile(new File([bytes],'clip.MP4',{type:mime}))
  for(const file of [
    new File([bytes],'clip.mov',{type:''}),
    new File([bytes],'clip.mp4',{type:'video/quicktime'}),
    new File([bytes],'clip.mp4',{type:'image/jpeg'}),
    new File([new Uint8Array(2048)],'clip.mp4',{type:'video/mp4'}),
  ])await assert.rejects(()=>inspectPersonalVideoFile(file),{code:'INVALID_VIDEO_FILE'})
  for(const brand of ['qt  ','heic']){
    const renamed=bytes.slice();renamed.set(new TextEncoder().encode(brand),8)
    await assert.rejects(()=>inspectPersonalVideoFile(new File([renamed],'renamed.mp4')),
      {code:'INVALID_VIDEO_FILE'})
  }
  await assert.rejects(()=>inspectPersonalVideoFile({size:12_000_001,slice(){throw new Error('must not read')}}),
    {code:'VIDEO_TOO_LARGE'})
})

// Run the actual document middleware: an API can authorize a private upload
// while the delivered browser CSP still blocks its upload or photo preview.
function mediaMiddleware(env){
  const modules={
    'next/server':{NextResponse},
    './lib/canonical-redirect':{canonicalRedirectTarget:()=>null,privateMigrationBridge:()=>null},
    './lib/app/admin-auth-refresh':{refreshAdminAuth:async()=>[]},
    './lib/app/personal-video-storage-csp.mjs':{personalVideoStorageCsp},
    './lib/instant-home-policy.mjs':{instantHomeLocale:()=>null},
    './lib/public-home-document-request.mjs':publicHomeDocument,
  }
  const runtime={exports:{},Headers,URL,crypto:globalThis.crypto,process:{env:{...env,HH_HAVE_PUBLIC_HOME_DOCUMENTS:'1'}},
    require(name){assert.ok(Object.hasOwn(modules,name),name);return modules[name]}}
  runInNewContext(ts.transpileModule(read('middleware.ts'),{compilerOptions:{
    module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
  }}).outputText,runtime)
  return runtime.exports.middleware
}
async function browserPolicy(middleware,path){
  const response=await middleware(new NextRequest('https://holistichouse.vercel.app'+path))
  assert.equal(response.status,200)
  assert.equal(response.headers.get('x-middleware-rewrite'),null,'Private and Studio routes must not enter the compiled public document')
  assert.equal(response.headers.get('x-middleware-request-x-hh-public-home-encoding'),null,'Public HTML encoding must not reach private media routes')
  assert.match(response.headers.get('content-security-policy'),/script-src[^;]*'nonce-[a-f0-9]{32}'/)
  return Object.fromEntries(response.headers.get('content-security-policy').split('; ')
    .map(directive=>{const [name,...values]=directive.split(' ');return [name,values]}))
}
test('actual cabinet and Studio policies allow private images and signed uploads without the retired hosting flag',async()=>{
  const api='https://abcdefghijklmnopqrst.supabase.co'
  const tus='https://abcdefghijklmnopqrst.storage.supabase.co'
  const middleware=mediaMiddleware({HH_APP_SUPABASE_URL:api,NODE_ENV:'production'})
  for(const locale of ['en','ru','es']){
    for(const path of ['/'+locale+'/app/videos','/'+locale+'/holistic-support/mandala']){
      const csp=await browserPolicy(middleware,path)
      assert.ok(csp['connect-src'].includes(api),path+' signed PUT and photo reuse')
      assert.ok(csp['connect-src'].includes(tus),path+' resumable MP4 upload')
      assert.ok(csp['img-src'].includes(api),path+' saved photo preview')
      assert.ok(csp['media-src'].includes(api),path+' saved media playback')
      assert.ok(csp['frame-ancestors'].includes("'none'"),path+' framing restriction preserved')
      assert.ok(!csp['connect-src'].includes('*'))
    }
  }
})
test('private media CSP retains exact-route and configured-project boundaries',async()=>{
  const api='https://abcdefghijklmnopqrst.supabase.co'
  const middleware=mediaMiddleware({HH_APP_SUPABASE_URL:api,NODE_ENV:'production'})
  for(const path of ['/en/app','/ru/app/videos/other','/api/app/personal-videos','/admin/videos']){
    const csp=await browserPolicy(middleware,path)
    for(const directive of ['connect-src','img-src','media-src'])
      assert.ok(!csp[directive].some(value=>value.includes('.supabase.co')),path+' '+directive)
  }
  const unconfigured=mediaMiddleware({NODE_ENV:'production'})
  const csp=await browserPolicy(unconfigured,'/ru/app/videos')
  assert.ok(!csp['connect-src'].some(value=>value.includes('.supabase.co')))
})

test('the private upload checkpoint uses the single migration recorded by Supabase',()=>{
  const migrations=readdirSync(new URL('../supabase/migrations/',import.meta.url))
  assert.deepEqual(
    migrations.filter(name=>name.endsWith('_hh_personal_video_resumable_checkpoint.sql')).sort(),
    ['20261122193053_hh_personal_video_resumable_checkpoint.sql'],
  )
})
test('personal videos have separate private account-scoped RLS and zero anonymous grants',()=>{
  assert.match(schema,/app_private\.personal_videos/)
  assert.match(schema,/enable row level security/)
  assert.match(schema,/revoke all on app_private\.personal_videos from public,anon,authenticated,hh_app_inbox/)
  assert.match(schema,/using\(account_id=\(select auth\.uid\(\)\) and \(select app_private\.account_active\(\)\)\)/)
  assert.match(schema,/with check\(account_id=\(select auth\.uid\(\)\) and \(select app_private\.account_active\(\)\)\)/)
  assert.doesNotMatch(schema,/grant.*on app_private\.personal_videos to (?:anon|authenticated|public)/i)
})
test('private Supabase uploads require verified session, consent and bounded quotas',()=>{
  assert.doesNotMatch(read('lib/app/personal-video-cloud-policy.mjs'),/HH_PERSONAL_VIDEO_CLOUD_SAVE_ENABLED|VERCEL_ENV|HH_PERSONAL_VIDEO_CLOUD_GLOBAL_APPROVED/)
  assert.match(server,/input\.consent!==true/)
  assert.match(server,/MAX_VIDEO_BYTES=12_000_000/)
  assert.match(server,/MAX_GLOBAL_BYTES=180_000_000/)
  assert.match(server,/MAX_USER_VIDEOS=3/)
  assert.match(server,/pg_advisory_xact_lock/)
  assert.match(server,/app\.consent_events/)
  assert.match(server,/personal_video_cloud_save_v1/)
  assert.match(list,/const actor=await auth\.verified\(\)/)
  assert.match(list,/requireSameOrigin\(request,config\)/)
  assert.match(item,/const actor=await auth\.verified\(\)/)
  assert.match(item,/requireSameOrigin\(request,config\)/)
  assert.match(item,/checkpointPersonalVideoUpload\(config,actor,id,await readBody\(request,8192\)\)/)
  for(const value of [server,list,item,gallery])
    assert.doesNotMatch(value,/HH_APP_SUPABASE_SECRET_KEY\s*=|service_role.*in.*client|NEXT_PUBLIC_.*SECRET/)
})
test('private storage availability depends on verified account identity only',async()=>{
  assert.equal((server.match(/^  requireEnabled\(actor\)$/gm)||[]).length,6)
  assert.match(read('lib/app/personal-video-messenger.js'),/cloudAvailable:personalVideoCloudEnabled\(actor\)/)
  const {personalVideoCloudEnabled}=await import('../lib/app/personal-video-cloud-policy.mjs')
  const account={id:'11111111-1111-4111-8111-111111111111'}
  assert.equal(personalVideoCloudEnabled(account),true)
  assert.equal(personalVideoCloudEnabled(account,{VERCEL_ENV:'production'}),true)
  assert.equal(personalVideoCloudEnabled(account,{HH_PERSONAL_VIDEO_CLOUD_SAVE_ENABLED:'false'}),true)
  for(const actor of [null,{}, {id:'invalid'}, {id:'11111111-1111-4111-8111-111111111111@evil'}])
    assert.equal(personalVideoCloudEnabled(actor),false)
})
test('uploaded MP4 is verified by exact bytes, MIME and ftyp before ready status',()=>{
  assert.match(server,/mime!=='video\/mp4'/)
  assert.match(server,/size!==row\.bytes/)
  assert.match(server,/String\.fromCharCode\(\.\.\.bytes\.slice\(4,8\)\)!=='ftyp'/)
  assert.match(server,/status='ready',ready_at=now\(\)/)
  assert.match(server,/status='pending'/)
})
test('signed read only owner video and bounded TTL, no public bucket',()=>{
  assert.match(server,/const row=await owned\(config,actor,id\)/)
  assert.match(server,/row\.status!=='ready'/)
  assert.match(server,/createSignedUrl\(row\.object_key,60,options\)/)
  assert.match(server,/BUCKET='hh-client-private-media'/)
  assert.match(server,/status='deleting'/)
  assert.match(server,/status='deleted',deleted_at=now\(\)/)
  assert.doesNotMatch(server,/\.getPublicUrl\(/)
})
test('private video item routes use shared UUID validation with a uniform not-found response',()=>{
  assert.match(server,/import \{AppError,requireUUID\} from '\.\.\/assessments\/contracts\.js'/)
  assert.match(server,/try\{requireUUID\(id\)\}catch\{deny\(\)\}/)
})
test('a finalization race reuses only the same owner’s committed ready row',()=>{
  const finalize=server.split('export async function completePersonalVideoUpload')[1]
    .split('export async function personalVideoReadUrl')[0]
  assert.match(finalize,/status='pending' returning \*/)
  assert.match(finalize,/select \* from app_private\.personal_videos where id=\$1 and account_id=\$2 and status='ready'/)
  assert.match(finalize,/if\(!committed\)deny\(\)/)
})
test('My Videos requests a signed attachment separately from inline playback',()=>{
  assert.match(gallery,/appFetch\('personal-videos\/'\+id\+'\?download=1',undefined,'GET',\{accountId\}\)/)
  assert.match(gallery,/appFetch\('personal-videos\/'\+id,undefined,'GET',\{accountId\}\).*setPlay/)
  assert.match(item,/download:new URL\(request\.url\)\.searchParams\.get\('download'\)==='1'/)
  assert.match(server,/download:\s*'holistic-house-personal\.mp4'/)
})
test('gallery is lazy in same signed-in cabinet with account switch guard and real file upload',()=>{
  assert.match(route,/'videos'\]\.includes\(path\[0\]\)/)
  assert.match(shell,/const MyPersonalVideos = dynamic/)
  assert.match(shell,/page === 'videos' && <MyPersonalVideos/)
  assert.match(gallery,/data-my-personal-videos/)
  assert.match(gallery,/savePrivateMp4/)
  assert.match(uploader,/uploadToSignedUrl/)
  assert.match(uploader,/uploadSignedPrivateVideoChunks/)
  assert.match(gallery,/video\/mp4/)
  assert.match(gallery,/accountId/)
  assert.match(gallery,/setFile\(null\);setConsent\(false\)/)
  assert.match(gallery,/confirm\(t\.confirm\)/)
  assert.doesNotMatch(gallery,/localStorage|sessionStorage|Kling|HeyGen/i)
})
test('canceled 2h signed uploads keep their storage quota until safe cleanup',()=>{
  assert.match(schema,/released_at timestamptz/)
  assert.match(server,/reapOwnExpiredUploads/)
  assert.match(server,/created_at<now\(\)-interval '3 hours'/)
  assert.match(server,/status<>'deleted' or released_at is null/)
  assert.match(server,/daily\.n>=6/)
  assert.match(server,/storage\.remove\(\[file\.object_key\]\)/)
  assert.match(server,/set status='deleted',deleted_at=now\(\),released_at=null/)
})
test('no client image or wish in personal videos API input or storage schema',()=>{
  assert.doesNotMatch(server,/photoUrl|wishText|clientMessage|rawPrompt|faceImage/i)
  assert.doesNotMatch(schema,/photo_url|raw_photo|client_wish|test_result|health_history/i)
  assert.match(server,/\['theme','sceneId','aspect','duration','bytes','consent','fingerprint'\]/)
})

test('Ready and the delivery drawer require an unchecked cloud consent for the finished MP4',()=>{
  const ready=read('components/mandala-video-ready.tsx')
  const delivery=read('components/mandala-video-delivery.tsx')
  const studio=read('components/mandala-free-video-studio.tsx')
  assert.match(ready,/cloudConsentUrl===video\.url/)
  assert.match(ready,/type="checkbox" checked=\{cloudConsent\}/)
  assert.match(ready,/if\(cloudConsent\)onSaveDirect\(true\)/)
  assert.match(studio,/saveToLibrary\(consentApproved\)/)
  assert.match(delivery,/if\(consentApproved!==true\)return;/)
  assert.match(delivery,/const \[cloudConsent,setCloudConsent\]=useState\(false\)/)
  assert.match(delivery,/saveToLibrary\(cloudConsent\)/)
  assert.match(delivery,/privateUpload\(accountId\)/)
  assert.match(delivery,/appFetch\(path,body,method,\{accountId\}\)/)
})

test('video save consent has a valid purpose while preserving all previous purposes',()=>{
  for(const old of ['necessary_app_processing','adult_attestation','marketing','practitioner_sharing']){
    assert.match(consentMigration,new RegExp(old));
  }
  assert.match(consentMigration,/personal_video_cloud_save_v1/)
  assert.match(consentMigration,/drop constraint if exists consent_events_purpose_check/)
  assert.match(consentMigration,/add constraint consent_events_purpose_check/)
})
test('deleted ready masters also keep reservation until token expiration and re-delete',()=>{
  assert.match(server,/status='deleted' and released_at is null and created_at<now\(\)-interval '3 hours'/)
  assert.doesNotMatch(server,/status='deleted' and ready_at is null and released_at is null/)
  assert.match(server,/released_at=null where id=\$1 and account_id=\$2 and status='deleting'/)
})

test('Supabase private save is host-independent but capped and consented',async()=>{
  const {personalVideoCloudEnabled}=await import('../lib/app/personal-video-cloud-policy.mjs')
  const owner={id:'22222222-2222-4222-8222-222222222222'}
  assert.equal(personalVideoCloudEnabled(owner),true)
  assert.equal(personalVideoCloudEnabled(owner,{VERCEL_ENV:'production'}),true)
  assert.match(server,/MAX_GLOBAL_BYTES=180_000_000/)
  assert.match(server,/MAX_USER_VIDEOS=3/)
  assert.match(server,/MAX_VIDEO_BYTES=12_000_000/)
  assert.match(server,/input\.consent!==true/)
  assert.match(list,/const actor=await auth\.verified\(\)/)
  assert.match(item,/const actor=await auth\.verified\(\)/)
})
