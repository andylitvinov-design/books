import 'server-only'
import { randomUUID } from 'node:crypto'
import { AppError, onlyKeys, requireUUID, revision, text } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import { openSealed } from '../app/crypto.js'
import { validateCredential, validateProfile, validateServiceDraft, slugify, publicProfile, serviceCopy } from './contracts.js'

const iso=value=>value instanceof Date?value.toISOString():value
const enc=(accountId,recordId,field)=>({accountId,recordId,field})
const notFound=()=>{throw new AppError('NOT_FOUND',404)}
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
  return {id:row.id,practitionerId:row.practitioner_id,practitionerSlug:practitioner?.slug||row.practitioner_slug||'',practitionerName:practitioner?.profile?.displayName||row.practitioner_name||'',professionalTitle:practitioner?.profile?.professionalTitle||row.professional_title||'',slug:row.slug,status:row.status,active:row.active,offeringType:row.offering_type,areaKey:row.area_key,deliveryFormat:row.delivery_format,locationLabel:row.location_label||'',languages:row.languages||[],pricingMode:row.pricing_mode,confirmedPrice:row.confirmed_price==null?null:Number(row.confirmed_price),currency:row.currency||'',durationMinutes:row.duration_minutes,imagePath:row.image_path||'',copy,localizedCopy:row.localized_copy||{},draftCopy:row.draft_copy||{},revision:row.revision,reviewNote:row.review_note||'',submittedAt:iso(row.submitted_at),reviewedAt:iso(row.reviewed_at),updatedAt:iso(row.updated_at)}
}
function requestView(row,config){
  return {id:row.id,serviceId:row.service_offering_id,practitionerId:row.recipient_practitioner_id,status:row.status,revision:row.revision,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at),contact:openSealed(row.contact_ciphertext,enc(row.account_id,row.id,'request.contact'),config),message:openSealed(row.message_ciphertext,enc(row.account_id,row.id,'request.message'),config),sharedExcerpt:openSealed(row.shared_excerpt_ciphertext,enc(row.account_id,row.id,'request.excerpt'),config)}
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
    async listPublicServices(locale='en',areaKey=null){
      return transaction(config,null,async db=>{
        const rows=(await db.query(`select s.*,p.slug practitioner_slug,p.public_profile
          from app.service_offerings s join app.practitioners p on p.id=s.practitioner_id
          where ${serviceStatusSql('s')} and ${publicStatusSql('p')} ${areaKey?'and s.area_key=$1':''}
          order by p.is_partner desc,s.created_at,s.id`,areaKey?[areaKey]:[])).rows
        return rows.map(row=>serviceView(row,{slug:row.practitioner_slug,profile:row.public_profile||{}},locale))
      },{server:true})
    },
    async getPublicService(practitionerSlug,serviceSlug,locale='en'){
      return transaction(config,null,async db=>{
        const row=(await db.query(`select s.*,p.slug practitioner_slug,p.public_profile,p.is_partner
          from app.service_offerings s join app.practitioners p on p.id=s.practitioner_id
          where p.slug=$1 and s.slug=$2 and ${serviceStatusSql('s')} and ${publicStatusSql('p')} limit 1`,[practitionerSlug,serviceSlug])).rows[0]
        if(!row)notFound()
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
          const services=(await db.query(`select * from app.service_offerings s where practitioner_id=$1 and ${serviceStatusSql('s')} order by created_at,id`,[row.id])).rows.map(s=>serviceView(s,{slug:row.slug,profile:row.public_profile||{}},locale))
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
        const p=await ownedPractitioner(db,actor)
        if(!p)return {practitioner:null,credentials:[],services:[],requests:[]}
        const credentials=(await db.query('select * from app.practitioner_credentials where practitioner_id=$1 order by created_at,id',[p.id])).rows.map(credentialView)
        const services=(await db.query('select * from app.service_offerings where practitioner_id=$1 order by created_at,id',[p.id])).rows.map(row=>serviceView(row,{slug:p.slug,profile:p.public_profile||p.draft_profile||{}},'en'))
        const requests=(await db.query('select * from app.consultation_requests where recipient_practitioner_id=$1 order by created_at desc,id',[p.id])).rows.map(row=>requestView(row,config))
        return {practitioner:practitionerView(p),credentials,services,requests}
      })
    },
    async saveProfile(actor,input){
      onlyKeys(input,['profile','expectedRevision'])
      const profile=validateProfile(input.profile||{})
      return transaction(config,actor,async db=>{
        await readyAccount(db,actor)
        let row=await ownedPractitioner(db,actor,true)
        if(!row){
          const id=randomUUID(),slug=await uniquePractitionerSlug(db,profile.displayName||actor.displayName,id)
          row=(await db.query("insert into app.practitioners(id,trusted_auth_user_id,slug,status,public_profile,draft_profile,active) values($1,$2,$3,'draft','{}'::jsonb,$4,true) returning *",[id,actor.id,slug,profile])).rows[0]
          return practitionerView(row)
        }
        if(input.expectedRevision!==undefined){revision(input.expectedRevision);if(row.revision!==input.expectedRevision)throw new AppError('REVISION_CONFLICT',409)}
        if(['suspended','archived'].includes(row.status))throw new AppError('PRACTICE_UNAVAILABLE',409)
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
      return transaction(config,actor,async db=>{
        await readyAccount(db,actor)
        const p=await ownedPractitioner(db,actor)
        if(!p)throw new AppError('PRACTITIONER_REQUIRED',409)
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
      requireUUID(id);onlyKeys(input,['status','expectedRevision']);revision(input.expectedRevision)
      if(!['contacted','closed'].includes(input.status))throw new AppError('INVALID_STATUS',400)
      return transaction(config,actor,async db=>{
        await readyAccount(db,actor)
        const p=await ownedPractitioner(db,actor)
        if(!p)notFound()
        const row=(await db.query('select * from app.consultation_requests where id=$1 and recipient_practitioner_id=$2 for update',[id,p.id])).rows[0]
        if(!row)notFound()
        if(row.revision!==input.expectedRevision||!['requested','contacted'].includes(row.status))throw new AppError('REVISION_CONFLICT',409)
        const updated=(await db.query('update app.consultation_requests set status=$3,revision=revision+1,updated_at=now() where id=$1 and recipient_practitioner_id=$2 returning *',[id,p.id,input.status])).rows[0]
        return requestView(updated,config)
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
            pricing_mode=$8,confirmed_price=$9,currency=$10,duration_minutes=$11,image_path=$12,status='published',active=true,review_note=null,reviewed_at=now(),revision=revision+1,updated_at=now()
            where id=$1 returning *`,[id,draft.copy,draft.areaKey,draft.offeringType,draft.deliveryFormat,draft.locationLabel||null,JSON.stringify(draft.languages),draft.pricingMode,draft.confirmedPrice,draft.currency||null,draft.durationMinutes,draft.imagePath||null])).rows[0]
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
