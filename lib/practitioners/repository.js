import 'server-only'
import { randomUUID } from 'node:crypto'
import { AppError, onlyKeys, requireUUID, revision, text } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import { openSealed, operationHash } from '../app/crypto.js'
import { validateCredential, validateProfile, validateServiceDraft, slugify, publicProfile, serviceCopy } from './contracts.js'
import { summarizeServiceAnalytics } from './service-analytics.js'
import { HOBBY_SERVICE_LIMIT, getHobbyServiceQuota } from './service-quota.js'
import { assertOwnedReadyPresentation } from './presentation-storage.js'
import { listPublicServiceEnquiries, updatePublicServiceEnquiry } from './public-service-enquiry.js'

const iso=value=>value instanceof Date?value.toISOString():value
const enc=(accountId,recordId,field)=>({accountId,recordId,field})
const notFound=()=>{throw new AppError('NOT_FOUND',404)}
// A profile or service may only attach a photo uploaded by its actual owner.
// Legacy site-local practitioner portraits remain readable.
function assertOwnedMarketingPhotos(actor,config,profile=null,service=null){
  const prefix=config.supabaseUrl+'/storage/v1/object/public/hh-service-photos/'+actor.id+'/'
  const urls=[...(service?.photos||[])]
  if(profile?.photoPath&&!profile.photoPath.startsWith('/'))urls.push(profile.photoPath)
  for(const url of urls){
    const name=String(url).slice(prefix.length)
    if(!String(url).startsWith(prefix)||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.jpg$/.test(name))
      throw new AppError('INVALID_IMAGE',400)
  }
}
async function readyAccount(db,actor){
  const row=(await db.query("select id,status,onboarding_state from app.accounts where id=$1",[actor.id])).rows[0]
  if(!row||row.status!=='active'||row.onboarding_state!=='active')throw new AppError('ACCOUNT_REQUIRED',401)
  return row
}
async function ownedPractitioner(db,actor,lock=false){
  return (await db.query(`select * from app.practitioners where trusted_auth_user_id=$1 ${lock?'for update':''}`,[actor.id])).rows[0]||null
}
function credentialView(row){
  return {id:row.id,title:row.title,issuer:row.issuer||'',jurisdiction:row.jurisdiction||'',reference:row.reference||'',public:row.public,verificationStatus:row.verification_status,expiresOn:row.expires_on?String(row.expires_on).slice(0,10):null,verifiedAt:iso(row.verified_at),createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)}
}
function practitionerView(row){
  if(!row)return null
  return {id:row.id,slug:row.slug,status:row.status,isPartner:row.is_partner,revision:row.revision,profile:publicProfile(row.public_profile||{}),draftProfile:row.draft_profile||row.public_profile||{},reviewNote:row.review_note||'',submittedAt:iso(row.submitted_at),reviewedAt:iso(row.reviewed_at),updatedAt:iso(row.updated_at)}
}
function serviceView(row,practitioner=null,locale='en'){
  const copy=serviceCopy(row,locale)
  return {id:row.id,practitionerId:row.practitioner_id,practitionerSlug:practitioner?.slug||row.practitioner_slug||'',practitionerName:practitioner?.profile?.displayName||row.practitioner_name||'',professionalTitle:practitioner?.profile?.professionalTitle||row.professional_title||'',slug:row.slug,status:row.status,active:row.active,offeringType:row.offering_type,areaKey:row.area_key,deliveryFormat:row.delivery_format,locationLabel:row.location_label||'',languages:row.languages||[],pricingMode:row.pricing_mode,confirmedPrice:row.confirmed_price==null?null:Number(row.confirmed_price),currency:row.currency||'',durationMinutes:row.duration_minutes,imagePath:row.image_path||'',photos:row.photos||[],practitionerPhoto:practitioner?.profile?.photoPath||'',goals:row.discovery_metadata?.goals||[],methods:row.discovery_metadata?.methods||[],benefits:row.discovery_metadata?.benefits||[],faq:row.discovery_metadata?.faq||[],displayLocales:row.discovery_metadata?.displayLocales||['en','ru'],whatsapp:row.discovery_metadata?.whatsapp||'',telegram:row.discovery_metadata?.telegram||'',videoPresentation:row.discovery_metadata?.videoPresentation||null,copy,localizedCopy:row.localized_copy||{},draftCopy:row.draft_copy||{},revision:row.revision,reviewNote:row.review_note||'',submittedAt:iso(row.submitted_at),reviewedAt:iso(row.reviewed_at),updatedAt:iso(row.updated_at)}
}
function requestView(row,config){
  return {id:row.id,serviceId:row.service_offering_id,practitionerId:row.recipient_practitioner_id,
    // HMAC groups only service requests from the SAME verified client account
    // for the SAME practitioner. Never merge clients by their typed name/email.
    clientKey:operationHash({scope:'practitioner-client',accountId:row.account_id,
      practitionerId:row.recipient_practitioner_id},config),
    status:row.status,revision:row.revision,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at),
    contact:openSealed(row.contact_ciphertext,enc(row.account_id,row.id,'request.contact'),config),
    message:openSealed(row.message_ciphertext,enc(row.account_id,row.id,'request.message'),config),
    sharedExcerpt:openSealed(row.shared_excerpt_ciphertext,enc(row.account_id,row.id,'request.excerpt'),config)}
}
function suggestedProfile(actor){
  return {displayName:actor.displayName||'',languages:['en'],formats:['online'],areas:['personal_development']}
}
// The caller locks the practitioner row when creating a service. This makes the
// count-and-insert limit atomic across concurrent requests by the same account.
async function ensureHobbyServiceSlot(db,practitionerId){
  const result=await db.query("select count(*)::int as used from app.service_offerings where practitioner_id=$1 and status <> 'archived'",[practitionerId])
  if(Number(result.rows[0]?.used||0)>=HOBBY_SERVICE_LIMIT)throw new AppError('SERVICE_LIMIT_REACHED',409)
}
async function uniquePractitionerSlug(db,name,id){
  const base=slugify(name,'practitioner'),suffix=id.slice(0,8)
  for(const candidate of [base,`${base}-${suffix}`,`practitioner-${suffix}`]){
    if(!(await db.query('select 1 from app.practitioners where slug=$1',[candidate])).rowCount)return candidate
  }
  return `practitioner-${id}`
}
async function uniqueServiceSlug(db,practitionerId,title,id){
  const base=slugify(title,'service'),suffix=id.slice(0,8)
  for(const candidate of [base,`${base}-${suffix}`,`service-${suffix}`]){
    if(!(await db.query('select 1 from app.service_offerings where practitioner_id=$1 and slug=$2',[practitionerId,candidate])).rowCount)return candidate
  }
  return `service-${id}`
}
function publicStatusSql(alias='p'){return `${alias}.active and ${alias}.public_profile<>'{}'::jsonb and ${alias}.status in('approved','submitted','changes_requested')`}
function serviceStatusSql(alias='s'){return `${alias}.active and ${alias}.localized_copy<>'{}'::jsonb and ${alias}.status in('published','submitted','changes_requested')`}

export function createPractitionerRepository(config){
  return {
    async recordPublicServiceEvent(serviceId,event){
      requireUUID(serviceId)
      if(!['impression','order','whatsapp','telegram'].includes(event))throw new AppError('INVALID_EVENT',400)
      return transaction(config,null,async db=>{
        const result=await db.query(`
          insert into app_private.service_funnel_daily
            (service_id,day,impressions,order_clicks,whatsapp_clicks,telegram_clicks)
          select s.id,(now() at time zone 'America/Toronto')::date,
            case when $2='impression' then 1 else 0 end,
            case when $2='order' then 1 else 0 end,
            case when $2='whatsapp' then 1 else 0 end,
            case when $2='telegram' then 1 else 0 end
          from app.service_offerings s
          join app.practitioners p on p.id=s.practitioner_id
          where s.id=$1 and ${serviceStatusSql('s')} and ${publicStatusSql('p')}
          on conflict(service_id,day) do update set
            impressions=app_private.service_funnel_daily.impressions+excluded.impressions,
            order_clicks=app_private.service_funnel_daily.order_clicks+excluded.order_clicks,
            whatsapp_clicks=app_private.service_funnel_daily.whatsapp_clicks+excluded.whatsapp_clicks,
            telegram_clicks=app_private.service_funnel_daily.telegram_clicks+excluded.telegram_clicks,
            updated_at=now()
          returning service_id`,[serviceId,event])
        if(!result.rowCount)notFound()
        return true
      },{server:true})
    },
    // Site-wide submission counts are aggregates; only approved public titles are exposed.
    async getMarketplaceNewServices(){
      return transaction(config,null,async db=>{
        const metrics=(await db.query(`
          select
            count(*) filter (where s.submitted_at >= now()-interval '7 days'
              and s.status not in ('draft','archived'))::int as "submitted7d",
            count(*) filter (where s.status='submitted')::int as "pendingNow",
            count(*) filter (where s.status='published'
              and s.reviewed_at >= now()-interval '7 days'
              and ${serviceStatusSql('s')} and ${publicStatusSql('p')})::int as "published7d",
            count(*) filter (where ${serviceStatusSql('s')} and ${publicStatusSql('p')})::int as "availableNow"
          from app.service_offerings s
          join app.practitioners p on p.id=s.practitioner_id
        `)).rows[0]||{}
        const recent=(await db.query(`
          select s.slug,s.localized_copy,s.discovery_metadata,
            s.image_path,s.area_key,s.pricing_mode,s.confirmed_price,s.currency,
            p.slug practitioner_slug,p.public_profile->>'displayName' practitioner_name
          from app.service_offerings s
          join app.practitioners p on p.id=s.practitioner_id
          where s.status='published' and ${serviceStatusSql('s')} and ${publicStatusSql('p')}
          order by coalesce(s.reviewed_at,s.created_at) desc,s.id desc
          limit 12
        `)).rows.map(row=>({
          slug:row.slug,
          practitionerSlug:row.practitioner_slug,
          practitionerName:row.practitioner_name||'',
          imagePath:row.image_path||'',
          areaKey:row.area_key,
          pricingMode:row.pricing_mode,
          confirmedPrice:row.confirmed_price==null?null:Number(row.confirmed_price),
          currency:row.currency||'',
          titles:{
            en:serviceCopy(row,'en').title,
            ru:serviceCopy(row,'ru').title,
            es:serviceCopy(row,'es').title,
          },
          shortDescriptions:{
            en:serviceCopy(row,'en').shortDescription,
            ru:serviceCopy(row,'ru').shortDescription,
            es:serviceCopy(row,'es').shortDescription,
          },
          displayLocales:row.discovery_metadata?.displayLocales||['en','ru'],
        }))
        return {
          submitted7d:Number(metrics.submitted7d||0),
          pendingNow:Number(metrics.pendingNow||0),
          published7d:Number(metrics.published7d||0),
          availableNow:Number(metrics.availableNow||0),
          recent,
        }
      },{server:true})
    },
    async listPublicServices(locale='en',areaKey=null){
      return transaction(config,null,async db=>{
        const rows=(await db.query(`select s.*,p.slug practitioner_slug,p.public_profile
          from app.service_offerings s join app.practitioners p on p.id=s.practitioner_id
          where ${serviceStatusSql('s')} and ${publicStatusSql('p')} ${areaKey?'and s.area_key=$1':''}
          order by p.is_partner desc,s.created_at,s.id`,areaKey?[areaKey]:[])).rows
        return rows.filter(row=>locale!=='es'||(!row.discovery_metadata||Object.keys(row.discovery_metadata).length===0||(row.discovery_metadata.displayLocales||[]).includes('es'))).map(row=>serviceView(row,{slug:row.practitioner_slug,profile:row.public_profile||{}},locale))
      },{server:true})
    },
    async getPublicService(practitionerSlug,serviceSlug,locale='en'){
      return transaction(config,null,async db=>{
        const row=(await db.query(`select s.*,p.slug practitioner_slug,p.public_profile,p.is_partner
          from app.service_offerings s join app.practitioners p on p.id=s.practitioner_id
          where p.slug=$1 and s.slug=$2 and ${serviceStatusSql('s')} and ${publicStatusSql('p')} limit 1`,[practitionerSlug,serviceSlug])).rows[0]
        if(!row||(locale==='es'&&!(!row.discovery_metadata||Object.keys(row.discovery_metadata).length===0||(row.discovery_metadata.displayLocales||[]).includes('es'))))notFound()
        const credentials=(await db.query("select * from app.practitioner_credentials where practitioner_id=$1 and public order by verification_status='verified' desc,created_at",[row.practitioner_id])).rows.map(credentialView)
        return {service:serviceView(row,{slug:row.practitioner_slug,profile:row.public_profile||{}},locale),practitioner:{id:row.practitioner_id,slug:row.practitioner_slug,isPartner:row.is_partner,profile:publicProfile(row.public_profile||{}),credentials}}
      },{server:true})
    },
    async listPublicPractitioners(locale='en'){
      return transaction(config,null,async db=>{
        const rows=(await db.query(`select * from app.practitioners p where ${publicStatusSql('p')} order by is_partner desc,created_at,id`)).rows
        const output=[]
        for(const row of rows){
          const credentials=(await db.query("select * from app.practitioner_credentials where practitioner_id=$1 and public order by verification_status='verified' desc,created_at",[row.id])).rows.map(credentialView)
          const services=(await db.query(`select * from app.service_offerings s where practitioner_id=$1 and ${serviceStatusSql('s')} order by created_at,id`,[row.id])).rows.filter(s=>locale!=='es'||(!s.discovery_metadata||Object.keys(s.discovery_metadata).length===0||(s.discovery_metadata.displayLocales||[]).includes('es'))).map(s=>serviceView(s,{slug:row.slug,profile:row.public_profile||{}},locale))
          output.push({id:row.id,slug:row.slug,isPartner:row.is_partner,profile:publicProfile(row.public_profile||{}),credentials,services})
        }
        return output
      },{server:true})
    },
    async getPublicPractitioner(slug,locale='en'){
      const all=await this.listPublicPractitioners(locale)
      const found=all.find(item=>item.slug===slug)
      if(!found)notFound()
      return found
    },
    async getMyPractice(actor){
      return transaction(config,actor,async db=>{
        await readyAccount(db,actor)
        const suggestion=suggestedProfile(actor)
        const p=await ownedPractitioner(db,actor)
        if(!p)return {practitioner:null,credentials:[],services:[],requests:[],practitionerTasks:[],suggestedProfile:suggestion,serviceQuota:getHobbyServiceQuota()}
        const credentials=(await db.query('select * from app.practitioner_credentials where practitioner_id=$1 order by created_at,id',[p.id])).rows.map(credentialView)
        const services=(await db.query('select * from app.service_offerings where practitioner_id=$1 order by created_at,id',[p.id])).rows.map(row=>serviceView(row,{slug:p.slug,profile:p.public_profile||p.draft_profile||{}},'en'))
        const requestRows=(await db.query(
          'select * from app.consultation_requests where recipient_practitioner_id=$1 order by created_at desc,id',
          [p.id])).rows
        const totals=requestRows.length?(await db.query(
          `select request_id,count(*)::int as message_count,max(created_at) as last_message_at
            from app.practitioner_request_messages
            where request_id=any($1::uuid[])
            group by request_id`,
          [requestRows.map(row=>row.id)])).rows:[]
        const byRequest=new Map(totals.map(row=>[row.request_id,row]))
        // Reply queue is based on the latest participant-visible message, not
        // internal master notes or unsent external Messenger messages.
        // Exact request-id and recipient filters already exclude other masters.
        const latestShared=requestRows.length?(await db.query(
          `select distinct on (request_id) request_id,author_role,created_at
             from app.practitioner_request_messages
             where request_id=any($1::uuid[]) and visibility='participants'
             order by request_id,created_at desc,id desc`,
          [requestRows.map(row=>row.id)])).rows:[]
        const lastSharedByRequest=new Map(latestShared.map(row=>[row.request_id,row]))
        // New-to-master is independent of the "awaiting reply" workflow.
        // Private notes, outbound master replies, and messages already
        // acknowledged from within the verified conversation never contribute.
        const unseenRows=requestRows.length?(await db.query(
          `select m.request_id,count(*)::int as unseen_count
           from app.practitioner_request_messages m
           left join app.practitioner_request_reads seen
             on seen.request_id=m.request_id and seen.account_id=$2
           where m.request_id=any($1::uuid[]) and m.visibility='participants'
             and m.author_role='client' and m.author_account_id<>$2
             and (seen.last_seen_at is null or m.created_at>seen.last_seen_at)
           group by m.request_id`,
          [requestRows.map(row=>row.id),actor.id])).rows:[]
        const unseenByRequest=new Map(unseenRows.map(row=>[row.request_id,row]))
        const authenticatedRequests=requestRows.map(row=>{
          const lastShared=lastSharedByRequest.get(row.id)
          const stillOpen=['requested','contacted'].includes(row.status)
          return {
            ...requestView(row,config),
            messageCount:byRequest.get(row.id)?.message_count||0,
            newMessageCount:Number(unseenByRequest.get(row.id)?.unseen_count||0),
            lastMessageAt:iso(byRequest.get(row.id)?.last_message_at)||null,
            lastConversationAt:iso(lastShared?.created_at)||iso(row.created_at),
            needsReply:stillOpen && (lastShared?.author_role==='client'||
              (!lastShared&&row.status==='requested')),
          }
        })
        const publicRequests=(await listPublicServiceEnquiries(db,p.id,config)).map(item=>({
          ...item,
          // Anonymous enquiries have no authenticated in-app conversation.
          // Mark only new ones as needing a manual business follow-up.
          needsReply:item.status==='requested',
          lastConversationAt:item.updatedAt||item.createdAt,
        }))
        const requests=[...authenticatedRequests,...publicRequests]
          .sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))
        const practitionerTasks=(await db.query(
          `select id,request_id,kind,due_on::text as due_on,status,revision
             from app.practitioner_request_tasks
             where practitioner_account_id=$1 and status='open'
             order by due_on asc,id asc limit 150`,[actor.id])).rows.map(row=>({
            id:row.id,requestId:row.request_id,kind:row.kind,
            dueOn:row.due_on,status:row.status,revision:row.revision
          }))
        const dates=(await db.query("select ((now() at time zone 'America/Toronto')::date-1)::text as yesterday, ((now() at time zone 'America/Toronto')::date-7)::text as \"weekStart\"")).rows[0]
        const daily=(await db.query(`
          select f.service_id as \"serviceId\",f.day::text as day,f.impressions,
            f.order_clicks as orders,f.whatsapp_clicks as whatsapp,f.telegram_clicks as telegram
          from app_private.service_funnel_daily f
          join app.service_offerings s on s.id=f.service_id
          where s.practitioner_id=$1 and f.day >= $2::date and f.day <= $3::date
        `,[p.id,dates.weekStart,dates.yesterday])).rows
        const serviceAnalytics=summarizeServiceAnalytics(services,daily,dates)
        return {practitioner:practitionerView(p),credentials,services,requests,practitionerTasks,suggestedProfile:suggestion,serviceAnalytics,serviceQuota:getHobbyServiceQuota(services)}
      })
    },
    async onboarding(actor,input){
      onlyKeys(input,['action','profile','service','serviceId','expectedPractitionerRevision','expectedServiceRevision'])
      if(!['save','submit'].includes(input.action))throw new AppError('INVALID_ACTION',400)
      const submitting=input.action==='submit'
      const profile=validateProfile(input.profile||{}, {complete:submitting})
      const includesService=input.service!==undefined&&input.service!==null
      const serviceDraft=includesService
        ? validateServiceDraft({...input.service,pricingMode:'free',confirmedPrice:null,currency:''},{complete:submitting})
        : null
      assertOwnedMarketingPhotos(actor,config,profile,serviceDraft)
      if(input.serviceId)requireUUID(input.serviceId)
      return transaction(config,actor,async db=>{
        await readyAccount(db,actor)
        let p=await ownedPractitioner(db,actor,true)
        if(!p){
          const id=randomUUID(),slug=await uniquePractitionerSlug(db,profile.displayName||actor.displayName,id)
          p=(await db.query("insert into app.practitioners(id,trusted_auth_user_id,slug,status,public_profile,draft_profile,active) values($1,$2,$3,'draft','{}'::jsonb,$4,true) returning *",[id,actor.id,slug,profile])).rows[0]
        }else{
          if(input.expectedPractitionerRevision!==undefined){
            revision(input.expectedPractitionerRevision)
            if(p.revision!==input.expectedPractitionerRevision)throw new AppError('REVISION_CONFLICT',409)
          }
          if(['suspended','archived'].includes(p.status))throw new AppError('PRACTICE_UNAVAILABLE',409)
        }
        await assertOwnedReadyPresentation(db,actor,profile.videoPresentation)
        if(serviceDraft)await assertOwnedReadyPresentation(db,actor,serviceDraft.videoPresentation)
        const hasPublic=Object.keys(p.public_profile||{}).length>0
        const profileStatus=submitting?'submitted':hasPublic?'approved':'draft'
        p=(await db.query(
          "update app.practitioners set draft_profile=$2,status=$3,submitted_at=case when $3='submitted' then now() else submitted_at end,review_note=null,revision=revision+1,updated_at=now() where id=$1 returning *",
          [p.id,profile,profileStatus],
        )).rows[0]

        let service=null
        if(serviceDraft){
          let current=null
          if(input.serviceId){
            current=(await db.query('select * from app.service_offerings where id=$1 and practitioner_id=$2 for update',[input.serviceId,p.id])).rows[0]
            if(!current)notFound()
            if(input.expectedServiceRevision!==undefined){
              revision(input.expectedServiceRevision)
              if(current.revision!==input.expectedServiceRevision)throw new AppError('REVISION_CONFLICT',409)
            }
            if(['suspended','archived'].includes(current.status))throw new AppError('SERVICE_UNAVAILABLE',409)
          }
          if(current){
            const hasPublishedCopy=Object.keys(current.localized_copy||{}).length>0
            const nextStatus=submitting?'submitted':hasPublishedCopy?(current.active?'published':'paused'):'draft'
            service=(await db.query(
              'update app.service_offerings set draft_copy=$3,status=$4,review_note=null,revision=revision+1,updated_at=now() where id=$1 and practitioner_id=$2 returning *',
              [current.id,p.id,serviceDraft,nextStatus],
            )).rows[0]
          }else{
            await ensureHobbyServiceSlot(db,p.id)
            const serviceId=randomUUID(),slug=await uniqueServiceSlug(db,p.id,serviceDraft.copy.en.title||serviceDraft.copy.ru.title,serviceId)
            service=(await db.query(
              `insert into app.service_offerings(id,practitioner_id,category,localized_copy,active,slug,status,offering_type,area_key,delivery_format,location_label,languages,pricing_mode,confirmed_price,currency,revision,draft_copy,image_path,submitted_at)
               values($1,$2,$3,'{}'::jsonb,true,$4,$5,$6,$7,$8,$9,$10,'free',null,null,0,$11,$12,case when $5='submitted' then now() else null end) returning *`,
              [serviceId,p.id,serviceDraft.areaKey,slug,submitting?'submitted':'draft',serviceDraft.offeringType,serviceDraft.areaKey,serviceDraft.deliveryFormat,serviceDraft.locationLabel||null,JSON.stringify(serviceDraft.languages),serviceDraft,serviceDraft.imagePath||null],
            )).rows[0]
          }
        }
        return {
          practitioner:practitionerView(p),
          service:service?serviceView(service,{slug:p.slug,profile:p.public_profile||p.draft_profile||{}},'en'):null,
          suggestedProfile:suggestedProfile(actor),
        }
      })
    },
    async saveProfile(actor,input){
      onlyKeys(input,['profile','expectedRevision'])
      const profile=validateProfile(input.profile||{})
      assertOwnedMarketingPhotos(actor,config,profile)
      return transaction(config,actor,async db=>{
        await readyAccount(db,actor)
        let row=await ownedPractitioner(db,actor,true)
        if(!row){
          if(profile.videoPresentation?.kind==='upload')throw new AppError('PRACTITIONER_REQUIRED',409)
          const id=randomUUID(),slug=await uniquePractitionerSlug(db,profile.displayName||actor.displayName,id)
          row=(await db.query("insert into app.practitioners(id,trusted_auth_user_id,slug,status,public_profile,draft_profile,active) values($1,$2,$3,'draft','{}'::jsonb,$4,true) returning *",[id,actor.id,slug,profile])).rows[0]
          return practitionerView(row)
        }
        if(input.expectedRevision!==undefined){revision(input.expectedRevision);if(row.revision!==input.expectedRevision)throw new AppError('REVISION_CONFLICT',409)}
        if(['suspended','archived'].includes(row.status))throw new AppError('PRACTICE_UNAVAILABLE',409)
        await assertOwnedReadyPresentation(db,actor,profile.videoPresentation)
        const hasPublic=Object.keys(row.public_profile||{}).length>0
        const nextStatus=hasPublic?'approved':'draft'
        row=(await db.query('update app.practitioners set draft_profile=$2,status=$3,review_note=null,revision=revision+1,updated_at=now() where id=$1 returning *',[row.id,profile,nextStatus])).rows[0]
        return practitionerView(row)
      })
    },
    async submitProfile(actor,input){
      onlyKeys(input,['expectedRevision'])
      revision(input.expectedRevision)
      return transaction(config,actor,async db=>{
        await readyAccount(db,actor)
        let row=await ownedPractitioner(db,actor,true)
        if(!row)notFound()
        if(row.revision!==input.expectedRevision)throw new AppError('REVISION_CONFLICT',409)
        validateProfile(row.draft_profile||{}, {complete:true})
        if(['suspended','archived'].includes(row.status))throw new AppError('PRACTICE_UNAVAILABLE',409)
        row=(await db.query("update app.practitioners set status='submitted',submitted_at=now(),review_note=null,revision=revision+1,updated_at=now() where id=$1 returning *",[row.id])).rows[0]
        return practitionerView(row)
      })
    },
    async saveCredential(actor,id,input){
      if(id)requireUUID(id)
      const value=validateCredential(input)
      return transaction(config,actor,async db=>{
        await readyAccount(db,actor)
        const p=await ownedPractitioner(db,actor)
        if(!p)throw new AppError('PRACTITIONER_REQUIRED',409)
        if(id){
          const row=(await db.query(`update app.practitioner_credentials set title=$3,issuer=$4,jurisdiction=$5,reference=$6,public=$7,expires_on=$8,
            verification_status='declared',verified_at=null,verified_by=null,updated_at=now()
            where id=$1 and practitioner_id=$2 returning *`,[id,p.id,value.title,value.issuer||null,value.jurisdiction||null,value.reference||null,value.public,value.expiresOn])).rows[0]
          if(!row)notFound()
          return credentialView(row)
        }
        const row=(await db.query('insert into app.practitioner_credentials(practitioner_id,title,issuer,jurisdiction,reference,public,expires_on) values($1,$2,$3,$4,$5,$6,$7) returning *',[p.id,value.title,value.issuer||null,value.jurisdiction||null,value.reference||null,value.public,value.expiresOn])).rows[0]
        return credentialView(row)
      })
    },
    async deleteCredential(actor,id){
      requireUUID(id)
      return transaction(config,actor,async db=>{
        await readyAccount(db,actor)
        const p=await ownedPractitioner(db,actor)
        if(!p)notFound()
        const result=await db.query('delete from app.practitioner_credentials where id=$1 and practitioner_id=$2 returning id',[id,p.id])
        if(!result.rowCount)notFound()
        return {deleted:true}
      })
    },
    async saveService(actor,id,input){
      if(id)requireUUID(id)
      onlyKeys(input,['draft','expectedRevision'])
      const draft=validateServiceDraft(input.draft||{})
      assertOwnedMarketingPhotos(actor,config,null,draft)
      return transaction(config,actor,async db=>{
        await readyAccount(db,actor)
        const p=await ownedPractitioner(db,actor,!id)
        if(!p)throw new AppError('PRACTITIONER_REQUIRED',409)
        await assertOwnedReadyPresentation(db,actor,draft.videoPresentation)
        if(id){
          const current=(await db.query('select * from app.service_offerings where id=$1 and practitioner_id=$2 for update',[id,p.id])).rows[0]
          if(!current)notFound()
          revision(input.expectedRevision)
          if(current.revision!==input.expectedRevision)throw new AppError('REVISION_CONFLICT',409)
          if(['suspended','archived'].includes(current.status))throw new AppError('SERVICE_UNAVAILABLE',409)
          const hasPublic=Object.keys(current.localized_copy||{}).length>0
          const nextStatus=hasPublic?(current.active?'published':'paused'):'draft'
          const row=(await db.query('update app.service_offerings set draft_copy=$3,status=$4,review_note=null,revision=revision+1,updated_at=now() where id=$1 and practitioner_id=$2 returning *',[id,p.id,draft,nextStatus])).rows[0]
          return serviceView(row,{slug:p.slug,profile:p.public_profile||p.draft_profile||{}},'en')
        }
        await ensureHobbyServiceSlot(db,p.id)
        const serviceId=randomUUID(),slug=await uniqueServiceSlug(db,p.id,draft.copy.en.title||draft.copy.ru.title,serviceId)
        const row=(await db.query(`insert into app.service_offerings(id,practitioner_id,category,localized_copy,active,slug,status,offering_type,area_key,delivery_format,location_label,languages,pricing_mode,revision,draft_copy,image_path)
          values($1,$2,$3,'{}'::jsonb,true,$4,'draft',$5,$6,$7,$8,$9,$10,0,$11,$12) returning *`,[serviceId,p.id,draft.areaKey,slug,draft.offeringType,draft.areaKey,draft.deliveryFormat,draft.locationLabel||null,JSON.stringify(draft.languages),draft.pricingMode,draft,draft.imagePath||null])).rows[0]
        return serviceView(row,{slug:p.slug,profile:p.public_profile||p.draft_profile||{}},'en')
      })
    },
    async submitService(actor,id,input){
      requireUUID(id);onlyKeys(input,['expectedRevision']);revision(input.expectedRevision)
      return transaction(config,actor,async db=>{
        await readyAccount(db,actor)
        const p=await ownedPractitioner(db,actor)
        if(!p)notFound()
        let row=(await db.query('select * from app.service_offerings where id=$1 and practitioner_id=$2 for update',[id,p.id])).rows[0]
        if(!row)notFound()
        if(row.revision!==input.expectedRevision)throw new AppError('REVISION_CONFLICT',409)
        validateServiceDraft(row.draft_copy||{}, {complete:true})
        if(['suspended','archived'].includes(row.status))throw new AppError('SERVICE_UNAVAILABLE',409)
        row=(await db.query("update app.service_offerings set status='submitted',submitted_at=now(),review_note=null,revision=revision+1,updated_at=now() where id=$1 returning *",[id])).rows[0]
        return serviceView(row,{slug:p.slug,profile:p.public_profile||p.draft_profile||{}},'en')
      })
    },
    async pauseService(actor,id,input){
      requireUUID(id);onlyKeys(input,['expectedRevision']);revision(input.expectedRevision)
      return transaction(config,actor,async db=>{
        await readyAccount(db,actor)
        const p=await ownedPractitioner(db,actor)
        if(!p)notFound()
        const row=(await db.query("update app.service_offerings set status='paused',active=false,revision=revision+1,updated_at=now() where id=$1 and practitioner_id=$2 and revision=$3 and status in('published','submitted','changes_requested') returning *",[id,p.id,input.expectedRevision])).rows[0]
        if(!row)throw new AppError('REVISION_CONFLICT',409)
        return serviceView(row,{slug:p.slug,profile:p.public_profile||p.draft_profile||{}},'en')
      })
    },
    async updateMyRequest(actor,id,input){
      requireUUID(id)
      onlyKeys(input,['status','expectedRevision','action','channel','address'])
      revision(input.expectedRevision)
      return transaction(config,actor,async db=>{
        await readyAccount(db,actor)
        const p=await ownedPractitioner(db,actor)
        if(!p)notFound()
        const row=(await db.query(
          'select * from app.consultation_requests where id=$1 and recipient_practitioner_id=$2 for update',
          [id,p.id],
        )).rows[0]
        if(row){
          if(input.action || input.channel || input.address)throw new AppError('INVALID_ACTION',400)
          if(!['contacted','closed'].includes(input.status))throw new AppError('INVALID_STATUS',400)
          if(row.revision!==input.expectedRevision||!['requested','contacted'].includes(row.status))
            throw new AppError('REVISION_CONFLICT',409)
          const updated=(await db.query(
            'update app.consultation_requests set status=$3,revision=revision+1,updated_at=now() where id=$1 and recipient_practitioner_id=$2 returning *',
            [id,p.id,input.status],
          )).rows[0]
          return requestView(updated,config)
        }
        return updatePublicServiceEnquiry(db,p.id,id,input,config)
      })
    },
    async moderationList(){
      return transaction(config,null,async db=>{
        const practitioners=(await db.query('select * from app.practitioners order by created_at desc,id')).rows
        const output=[]
        for(const p of practitioners){
          const credentials=(await db.query('select * from app.practitioner_credentials where practitioner_id=$1 order by created_at,id',[p.id])).rows.map(credentialView)
          const services=(await db.query('select * from app.service_offerings where practitioner_id=$1 order by created_at,id',[p.id])).rows.map(row=>serviceView(row,{slug:p.slug,profile:p.public_profile||p.draft_profile||{}},'en'))
          output.push({practitioner:practitionerView(p),credentials,services})
        }
        return output
      },{server:true,moderator:true})
    },
    async moderateProfile(id,input){
      requireUUID(id);onlyKeys(input,['action','note','isPartner'])
      if(!['approve','changes_requested','reject','suspend','restore','partner'].includes(input.action))throw new AppError('INVALID_ACTION',400)
      return transaction(config,null,async db=>{
        let row=(await db.query('select * from app.practitioners where id=$1 for update',[id])).rows[0]
        if(!row)notFound()
        if(input.action==='approve'){
          const profile=validateProfile(row.draft_profile||{}, {complete:true})
          row=(await db.query("update app.practitioners set public_profile=$2,status='approved',active=true,review_note=null,reviewed_at=now(),revision=revision+1,updated_at=now() where id=$1 returning *",[id,profile])).rows[0]
        }else if(input.action==='partner'){
          row=(await db.query('update app.practitioners set is_partner=$2,reviewed_at=now(),updated_at=now() where id=$1 returning *',[id,input.isPartner===true])).rows[0]
        }else{
          const state=input.action==='restore'?'approved':input.action
          const active=!['suspend','reject'].includes(input.action)
          row=(await db.query('update app.practitioners set status=$2,active=$3,review_note=$4,reviewed_at=now(),revision=revision+1,updated_at=now() where id=$1 returning *',[id,state==='suspend'?'suspended':state,active,text(input.note||'',1000)||null])).rows[0]
        }
        return practitionerView(row)
      },{server:true,moderator:true})
    },
    async moderateCredential(id,input){
      requireUUID(id);onlyKeys(input,['action'])
      const map={verify:'verified',reject:'rejected',expire:'expired',declare:'declared'}
      if(!map[input.action])throw new AppError('INVALID_ACTION',400)
      return transaction(config,null,async db=>{
        const row=(await db.query("update app.practitioner_credentials set verification_status=$2,verified_at=case when $2='verified' then now() else null end,verified_by=case when $2='verified' then 'Holistic House admin' else null end,updated_at=now() where id=$1 returning *",[id,map[input.action]])).rows[0]
        if(!row)notFound()
        return credentialView(row)
      },{server:true,moderator:true})
    },
    async moderateService(id,input){
      requireUUID(id);onlyKeys(input,['action','note'])
      if(!['approve','changes_requested','suspend','archive'].includes(input.action))throw new AppError('INVALID_ACTION',400)
      return transaction(config,null,async db=>{
        let row=(await db.query('select * from app.service_offerings where id=$1 for update',[id])).rows[0]
        if(!row)notFound()
        if(input.action==='approve'){
          const draft=validateServiceDraft(row.draft_copy||{}, {complete:true})
          row=(await db.query(`update app.service_offerings set localized_copy=$2,category=$3,offering_type=$4,area_key=$3,delivery_format=$5,location_label=$6,languages=$7,
            pricing_mode=$8,confirmed_price=$9,currency=$10,duration_minutes=$11,image_path=$12,discovery_metadata=$13,photos=$14,status='published',active=true,review_note=null,reviewed_at=now(),revision=revision+1,updated_at=now()
            where id=$1 returning *`,[id,draft.copy,draft.areaKey,draft.offeringType,draft.deliveryFormat,draft.locationLabel||null,JSON.stringify(draft.languages),draft.pricingMode,draft.confirmedPrice,draft.currency||null,draft.durationMinutes,draft.imagePath||null,JSON.stringify({goals:draft.goals,methods:draft.methods,benefits:draft.benefits,faq:draft.faq,displayLocales:draft.displayLocales,whatsapp:draft.whatsapp,telegram:draft.telegram,videoPresentation:draft.videoPresentation}),JSON.stringify(draft.photos||[])])).rows[0]
        }else{
          const state=input.action==='suspend'?'suspended':input.action==='archive'?'archived':'changes_requested'
          row=(await db.query('update app.service_offerings set status=$2,active=$3,review_note=$4,reviewed_at=now(),revision=revision+1,updated_at=now() where id=$1 returning *',[id,state,!['suspended','archived'].includes(state),text(input.note||'',1000)||null])).rows[0]
        }
        const p=(await db.query('select * from app.practitioners where id=$1',[row.practitioner_id])).rows[0]
        return serviceView(row,{slug:p?.slug||'',profile:p?.public_profile||p?.draft_profile||{}},'en')
      },{server:true,moderator:true})
    },
  }
}
