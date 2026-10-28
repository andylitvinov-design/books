import 'server-only'
import { AppError, onlyKeys, requireUUID } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'

const PUBLIC_SERVICE = [
  'select s.id, s.slug, s.area_key, p.trusted_auth_user_id as owner_id',
  'from app.service_offerings s join app.practitioners p on p.id=s.practitioner_id',
  "where s.id=$1 and s.active and s.localized_copy<>'{}'::jsonb",
  "and s.status in ('published','submitted','changes_requested')",
  "and p.active and p.public_profile<>'{}'::jsonb",
  "and p.status in ('approved','submitted','changes_requested')",
].join(' ')
// Public master ratings are a projection of existing published service reviews.
const MASTER_PUBLIC_REVIEWS = [
  'from app.service_reviews r',
  'join app.service_offerings s on s.id=r.service_id',
  'join app.practitioners p on p.id=s.practitioner_id',
  "where r.status='published' and s.active and s.localized_copy<>'{}'::jsonb",
  "and s.status in ('published','submitted','changes_requested')",
  "and p.active and p.public_profile<>'{}'::jsonb",
  "and p.status in ('approved','submitted','changes_requested')",
].join(' ')
const validMasterSlug = slug => typeof slug==='string' && slug.length<=90 &&
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
const iso = value => value instanceof Date ? value.toISOString() : value
const view = row => ({
  id:row.id, displayName:row.display_name, rating:Number(row.rating),
  body:row.body, createdAt:iso(row.created_at), updatedAt:iso(row.updated_at),
})
function notFound(){ throw new AppError('NOT_FOUND',404) }
async function target(db,serviceId){
  const row=(await db.query(PUBLIC_SERVICE,[serviceId])).rows[0]
  if(!row)notFound()
  return row
}
async function account(db,actor){
  const row=(await db.query(
    "select display_name from app.accounts where id=$1 and status='active' and onboarding_state='active'",
    [actor.id],
  )).rows[0]
  if(!row)throw new AppError('ACCOUNT_REQUIRED',401)
  return row
}
export function checkReviewInput(input){
  if(!input || typeof input!=='object' || Array.isArray(input))throw new AppError('INVALID_REVIEW',400)
  onlyKeys(input,['serviceId','displayName','rating','body'])
  requireUUID(input.serviceId)
  if(!Number.isInteger(input.rating)||input.rating<1||input.rating>5)throw new AppError('INVALID_RATING',400)
  if(typeof input.displayName!=='string'||typeof input.body!=='string')throw new AppError('INVALID_REVIEW',400)
  const displayName=input.displayName.replace(/\s+/g,' ').trim()
  const body=input.body.replace(/\r\n?/g,'\n').trim()
  if(displayName.length<2||displayName.length>60||Array.from(body).length<50||body.length>1200)throw new AppError('INVALID_REVIEW',400)
  if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(body) ||
    /\S+@\S+\.\S+/.test(body) || /(?:\+?\d[\d ()-]{8,}\d)/.test(body))
    throw new AppError('REVIEW_PERSONAL_DATA',422)
  return {serviceId:input.serviceId,displayName,rating:input.rating,body}
}
export function createServiceReviewRepository(config){
  return {
    async listPublic(serviceId,page=1){
      requireUUID(serviceId)
      if(!Number.isSafeInteger(page)||page<1||page>50)throw new AppError('INVALID_PAGE',400)
      return transaction(config,null,async db=>{
        const service=await target(db,serviceId)
        const summary=(await db.query(
          "select count(*)::int as count,coalesce(round(avg(rating)::numeric,1),0) as average from app.service_reviews where service_id=$1 and status='published'",
          [serviceId],
        )).rows[0]
        const rows=(await db.query(
          "select id,display_name,rating,body,created_at,updated_at from app.service_reviews where service_id=$1 and status='published' order by created_at desc,id desc limit 10 offset $2",
          [serviceId,(page-1)*10],
        )).rows
        return {
          summary:{count:Number(summary.count),average:Number(summary.average)},
          reviews:rows.map(view),page,hasMore:Number(summary.count)>page*10,
          ownerId:service.owner_id,
        }
      },{server:true})
    },
    async listPublicForPractitioner(practitionerSlug,page=1){
      if(!validMasterSlug(practitionerSlug))throw new AppError('INVALID_SLUG',400)
      if(!Number.isSafeInteger(page)||page<1||page>50)throw new AppError('INVALID_PAGE',400)
      return transaction(config,null,async db=>{
        // Check the public master independently: zero reviews must return an honest empty state.
        const master=(await db.query(
          "select id from app.practitioners where slug=$1 and active and public_profile<>'{}'::jsonb and status in ('approved','submitted','changes_requested')",
          [practitionerSlug],
        )).rows[0]
        if(!master)notFound()
        const from=MASTER_PUBLIC_REVIEWS+' and p.id=$1'
        const summary=(await db.query(
          'select count(*)::int as count,coalesce(round(avg(r.rating)::numeric,1),0) as average '+from,
          [master.id],
        )).rows[0]
        const rows=(await db.query(
          'select r.id,r.display_name,r.rating,r.body,r.created_at,r.updated_at,r.service_id,s.slug as service_slug '+
            from+' order by r.created_at desc,r.id desc limit 10 offset $2',
          [master.id,(page-1)*10],
        )).rows
        return {
          summary:{count:Number(summary.count),average:Number(summary.average)},
          reviews:rows.map(row=>({...view(row),serviceId:row.service_id,serviceSlug:row.service_slug})),
          page,hasMore:Number(summary.count)>page*10,
        }
      },{server:true})
    },
    async listPublicSummariesForPractitioners(ids){
      if(!Array.isArray(ids)||ids.length>200)throw new AppError('INVALID_REVIEW',400)
      ids.forEach(requireUUID)
      if(!ids.length)return []
      return transaction(config,null,async db=>{
        const rows=(await db.query(
          'select s.practitioner_id,count(*)::int as count,round(avg(r.rating)::numeric,1) as average '+
            MASTER_PUBLIC_REVIEWS+' and s.practitioner_id=any($1::uuid[]) group by s.practitioner_id',
          [ids],
        )).rows
        return rows.map(row=>({practitionerId:row.practitioner_id,count:Number(row.count),average:Number(row.average)}))
      },{server:true})
    },
    async viewer(serviceId,ownerId,actor){
      requireUUID(serviceId)
      return transaction(config,actor,async db=>{
        const active=await account(db,actor)
        const service=await target(db,serviceId)
        let completed=true
        if(service.slug==='remote-energy-support'){
          completed=Boolean((await db.query(
            "select 1 from app.consultation_requests where service_offering_id=$1 and account_id=$2 and status='completed' and remote_booking is not null limit 1",
            [serviceId,actor.id],
          )).rowCount)
        }
        const mine=(await db.query(
          'select id,display_name,rating,body,status,created_at,updated_at from app.service_reviews where service_id=$1 and reviewer_account_id=$2',
          [serviceId,actor.id],
        )).rows[0]
        return {
          signedIn:true,canReview:ownerId!==actor.id&&completed,
          suggestedName:String(active.display_name||actor.displayName||'').slice(0,60),
          mine:mine?{...view(mine),status:mine.status}:null,
        }
      })
    },
    async save(actor,input){
      const value=checkReviewInput(input)
      return transaction(config,actor,async db=>{
        await account(db,actor)
        const service=await target(db,value.serviceId)
        if(service.owner_id===actor.id)throw new AppError('SELF_REVIEW_NOT_ALLOWED',403)
        const remote=service.slug==='remote-energy-support'
        if(remote){
          const completed=(await db.query(
            "select 1 from app.consultation_requests where service_offering_id=$1 and account_id=$2 and status='completed' and remote_booking is not null limit 1",
            [value.serviceId,actor.id],
          )).rowCount
          if(!completed)throw new AppError('COMPLETED_SESSION_REQUIRED',403)
        }
        const existing=(await db.query(
          'select status from app.service_reviews where service_id=$1 and reviewer_account_id=$2',
          [value.serviceId,actor.id],
        )).rows[0]
        if(existing&&existing.status!=='published')throw new AppError('REVIEW_MODERATED',403)
        const row=(await db.query(
          [
            'insert into app.service_reviews(service_id,reviewer_account_id,display_name,rating,body,status)',
            'values($1,$2,$3,$4,$5,$6)',
            'on conflict(service_id,reviewer_account_id) do update set',
            'display_name=excluded.display_name,rating=excluded.rating,body=excluded.body,updated_at=now()',
            "where app.service_reviews.status='published'",
            'returning id,display_name,rating,body,created_at,updated_at',
          ].join(' '),
          [value.serviceId,actor.id,value.displayName,value.rating,value.body,remote?'hidden':'published'],
        )).rows[0]
        if(!row)throw new AppError('REVIEW_MODERATED',403)
        // Keep the original public narrative review and the aggregate rating
        // in the same transaction so one member never counts twice.
        if (!remote) await db.query(
          'insert into app.catalog_star_ratings(kind,item_key,account_id,stars) values($1,$2,$3,$4) on conflict(kind,item_key,account_id) do update set stars=excluded.stars,updated_at=now()',
          ['service',value.serviceId,actor.id,value.rating],
        )
        return view(row)
      })
    },
    async remove(actor,serviceId){
      requireUUID(serviceId)
      return transaction(config,actor,async db=>{
        await account(db,actor)
        const deleted=(await db.query(
          "delete from app.service_reviews where service_id=$1 and reviewer_account_id=$2 returning id",
          [serviceId,actor.id],
        )).rowCount
        if(!deleted)notFound()
        await db.query("delete from app.catalog_star_ratings where kind='service' and item_key=$1 and account_id=$2",[serviceId,actor.id])
        return true
      })
    },
  }
}
