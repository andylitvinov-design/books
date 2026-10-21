import 'server-only'
import {randomUUID} from 'node:crypto'
import {AppError,requireUUID} from '../assessments/contracts.js'
import {transaction} from '../app/database.js'
import {privateStorageClient,sniffPrivateMedia} from '../clients/session-delivery-storage.js'
import {COURSE_MEDIA_TYPES,normalizeCourseDraft,assertPublishableCourse,makeCourseSlug} from './course-contracts.js'

export const COURSE_BUCKET='hh-practitioner-course-media'
const fail=(code,status=400)=>{throw new AppError(code,status)}
const notFound=()=>fail('COURSE_NOT_FOUND',404)
const view=row=>({id:row.id,slug:row.slug,status:row.status,revision:row.revision,
 draft:row.draft,published:row.published,publishedAt:row.published_at,updatedAt:row.updated_at})
const publicView=row=>({id:row.id,slug:row.slug,course:row.published,
 publishedAt:row.published_at,practitionerSlug:row.practitioner_slug,
 practitionerName:row.public_profile?.displayName||''})
async function own(db,actor){
 const account=(await db.query('select status,onboarding_state from app.accounts where id=$1',[actor.id])).rows[0]
 if(account?.status!=='active'||account?.onboarding_state!=='active')fail('ACCOUNT_REQUIRED',401)
 const p=(await db.query('select id,status from app.practitioners where trusted_auth_user_id=$1',[actor.id])).rows[0]
 if(!p||['suspended','rejected','archived'].includes(p.status))fail('PRACTITIONER_REQUIRED',403)
 return p
}
async function ownedCourse(db,actor,id,locked=false){
 requireUUID(id)
 const p=await own(db,actor)
 const row=(await db.query('select * from app.practitioner_courses where id=$1 and practitioner_id=$2 '+(locked?'for update':''),[id,p.id])).rows[0]
 if(!row)notFound()
 return {p,row}
}
async function storageBucket(config){
 const s=privateStorageClient(config).storage
 const {data,error}=await s.getBucket(COURSE_BUCKET)
 if(error||!data||data.public!==false)fail('COURSE_STORAGE_UNAVAILABLE',503)
 return s.from(COURSE_BUCKET)
}
function ensureRevision(row,expected){
 if(!Number.isSafeInteger(expected)||expected<0||row.revision!==expected)
   fail('REVISION_CONFLICT',409)
}
export function createPractitionerCourseRepository(config){
 return {
  async mine(actor){
   return transaction(config,actor,async db=>{
    const p=await own(db,actor)
    const rows=(await db.query('select * from app.practitioner_courses where practitioner_id=$1 order by updated_at desc limit 40',[p.id])).rows
    return rows.map(view)
   })
  },
  async create(actor,input){
   const draft=normalizeCourseDraft(input)
   return transaction(config,actor,async db=>{
    const p=await own(db,actor)
    const count=(await db.query("select count(*)::integer as n from app.practitioner_courses where practitioner_id=$1 and status<>'archived'",[p.id])).rows[0]?.n||0
    if(count>=30)fail('COURSE_LIMIT',429)
    const id=randomUUID(),slug=makeCourseSlug(draft.title)
    const row=(await db.query("insert into app.practitioner_courses(id,practitioner_id,slug,draft) values($1,$2,$3,$4) returning *",
      [id,p.id,slug,JSON.stringify(draft)])).rows[0]
    return view(row)
   })
  },
  async save(actor,id,expectedRevision,input){
   const draft=normalizeCourseDraft(input)
   return transaction(config,actor,async db=>{
    const {row}=await ownedCourse(db,actor,id,true)
    ensureRevision(row,expectedRevision)
    if(row.status==='archived')fail('COURSE_ARCHIVED',409)
    const saved=(await db.query("update app.practitioner_courses set draft=$2,revision=revision+1,updated_at=now() where id=$1 returning *",
      [id,JSON.stringify(draft)])).rows[0]
    return view(saved)
   })
  },
  async changePublication(actor,id,expectedRevision,action,reviewed=false){
   if(!['publish','unpublish','archive'].includes(action))fail('INVALID_ACTION')
   return transaction(config,actor,async db=>{
    const {p,row}=await ownedCourse(db,actor,id,true)
    ensureRevision(row,expectedRevision)
    if(row.status==='archived')fail('COURSE_ARCHIVED',409)
    if(action==='publish'){
      if(p.status!=='approved')fail('PRACTITIONER_REVIEW_REQUIRED',409)
      if(reviewed!==true)fail('PUBLICATION_CONFIRMATION_REQUIRED')
      const draft=assertPublishableCourse(normalizeCourseDraft(row.draft))
      const ids=[...new Set(draft.slides.map(s=>s.assetId).filter(Boolean))]
      if(ids.length){
        const assets=(await db.query("select id,kind from app.practitioner_course_assets where course_id=$1 and practitioner_id=$2 and status='ready' and id=any($3::uuid[])",
          [id,p.id,ids])).rows
        const found=new Map(assets.map(a=>[a.id,a.kind]))
        for(const slide of draft.slides)if(slide.assetId&&!found.has(slide.assetId))fail('COURSE_MEDIA_NOT_READY',409)
        else if(slide.assetId&&found.get(slide.assetId)!==slide.kind)fail('COURSE_MEDIA_KIND_MISMATCH')
      }
      const published=(await db.query("update app.practitioner_courses set status='published',published=$2,published_at=now(),revision=revision+1,updated_at=now() where id=$1 returning *",
        [id,JSON.stringify(draft)])).rows[0]
      return view(published)
    }
    const updated=(await db.query("update app.practitioner_courses set status=$2,revision=revision+1,updated_at=now() where id=$1 returning *",
      [id,action==='archive'?'archived':'draft'])).rows[0]
    return view(updated)
   })
  },
  async catalog(){
   return transaction(config,null,async db=>{
    const rows=(await db.query("select c.id,c.slug,c.published,c.published_at,p.slug practitioner_slug,p.public_profile from app.practitioner_courses c join app.practitioners p on p.id=c.practitioner_id where c.status='published' and c.published<>'{}'::jsonb and p.status='approved' and p.active order by c.published_at desc limit 150")).rows
    return rows.map(publicView)
   },{server:true})
  },
  async publicBySlug(slug){
   if(!/^[a-z0-9][a-z0-9-]{2,119}$/.test(slug))return null
   return transaction(config,null,async db=>{
    const row=(await db.query("select c.id,c.slug,c.published,c.published_at,p.slug practitioner_slug,p.public_profile from app.practitioner_courses c join app.practitioners p on p.id=c.practitioner_id where c.slug=$1 and c.status='published' and c.published<>'{}'::jsonb and p.status='approved' and p.active limit 1",[slug])).rows[0]
    return row?publicView(row):null
   },{server:true})
  },
  async mediaIntent(actor,{courseId,mime,bytes}){
   const info=COURSE_MEDIA_TYPES[mime]
   if(!info)fail('MEDIA_TYPE_NOT_ALLOWED',415)
   if(!Number.isSafeInteger(bytes)||bytes<128||bytes>info.max)fail('MEDIA_SIZE_NOT_ALLOWED',413)
   const storage=await storageBucket(config)
   return transaction(config,actor,async db=>{
    const {p,row}=await ownedCourse(db,actor,courseId,true)
    if(row.status==='archived')fail('COURSE_ARCHIVED',409)
    // Lock the owner so concurrent uploads to different courses cannot bypass
    // the shared free-tier storage budget.
    await db.query('select id from app.practitioners where id=$1 for update',[p.id])
    const totals=(await db.query("select count(*) filter(where status='ready')::integer as complete,count(*) filter(where status='pending' and created_at>now()-interval '2 hours')::integer as pending,coalesce(sum(expected_bytes) filter(where status='ready'),0)::bigint as total from app.practitioner_course_assets where course_id=$1",[courseId])).rows[0]
    const master=(await db.query("select count(*) filter(where status='pending' and created_at>now()-interval '2 hours')::integer as pending,coalesce(sum(expected_bytes) filter(where status='ready'),0)::bigint as total from app.practitioner_course_assets where practitioner_id=$1",[p.id])).rows[0]
    if(totals.complete>=80||totals.pending>=4||Number(totals.total)+bytes>120000000||
      master.pending>=4||Number(master.total)+bytes>250000000)fail('COURSE_MEDIA_LIMIT',429)
    const id=randomUUID(),objectKey=actor.id+'/'+courseId+'/'+id+'.'+info.ext
    const {data,error}=await storage.createSignedUploadUrl(objectKey)
    if(error||!data?.token)fail('COURSE_STORAGE_UNAVAILABLE',503)
    await db.query("insert into app.practitioner_course_assets(id,practitioner_id,course_id,object_key,kind,mime,expected_bytes) values($1,$2,$3,$4,$5,$6,$7)",
      [id,p.id,courseId,objectKey,info.kind,mime,bytes])
    return {assetId:id,kind:info.kind,token:data.token,objectKey,bucket:COURSE_BUCKET,
      supabaseUrl:config.supabaseUrl,publishableKey:config.publishableKey}
   })
  },
  async mediaComplete(actor,assetId){
   requireUUID(assetId)
   const record=await transaction(config,actor,async db=>{
    const p=await own(db,actor)
    return (await db.query("select * from app.practitioner_course_assets where id=$1 and practitioner_id=$2",[assetId,p.id])).rows[0]
   })
   if(!record)fail('COURSE_MEDIA_NOT_FOUND',404)
   if(record.status==='ready')return {assetId:record.id,kind:record.kind}
   const storage=await storageBucket(config)
   const {data,error}=await storage.info(record.object_key)
   if(error||!data)fail('COURSE_MEDIA_UPLOAD_MISSING',409)
   const bytes=Number(data.size??data.metadata?.size)
   const mime=(data.content_type||data.contentType||data.mimetype||data.metadata?.mimetype||'').split(';')[0].toLowerCase()
   if(!Number.isSafeInteger(bytes)||bytes!==record.expected_bytes)fail('MEDIA_SIZE_NOT_ALLOWED',413)
   if(mime!==record.mime&&!(record.mime==='audio/x-m4a'&&mime==='audio/mp4'))fail('MEDIA_TYPE_NOT_ALLOWED',415)
   await sniffPrivateMedia(storage,record.object_key,record.mime,config.supabaseUrl)
   await transaction(config,actor,async db=>{
    const p=await own(db,actor)
    await db.query("update app.practitioner_course_assets set status='ready',ready_at=now() where id=$1 and practitioner_id=$2 and course_id=$3 and status='pending'",
      [assetId,p.id,record.course_id])
   })
   return {assetId:record.id,kind:record.kind}
  },
  async publicAsset(assetId){
   requireUUID(assetId)
   return transaction(config,null,async db=>(await db.query(
     "select a.id,a.object_key,a.mime,true as published from app.practitioner_course_assets a join app.practitioner_courses c on c.id=a.course_id join app.practitioners p on p.id=c.practitioner_id where a.id=$1 and a.status='ready' and c.status='published' and p.status='approved' and p.active and p.public_profile<>'{}'::jsonb and c.published->'slides' @> jsonb_build_array(jsonb_build_object('assetId',a.id::text))",
     [assetId])).rows[0]||null,{server:true})
  },
  async ownAsset(actor,assetId){
   requireUUID(assetId)
   return transaction(config,actor,async db=>{
    const p=await own(db,actor)
    return (await db.query("select id,object_key,mime from app.practitioner_course_assets where id=$1 and practitioner_id=$2 and status='ready'",
      [assetId,p.id])).rows[0]||null
   })
  },
  async signedAssetUrl(asset){
   const storage=await storageBucket(config)
   const {data,error}=await storage.createSignedUrl(asset.object_key,asset.published===true?3600:120)
   if(error||!data?.signedUrl)fail('COURSE_MEDIA_UNAVAILABLE',503)
   const url=new URL(data.signedUrl)
   if(url.protocol!=='https:'||url.origin!==new URL(config.supabaseUrl).origin)fail('COURSE_MEDIA_UNAVAILABLE',503)
   return url.href
  }
 }
}
