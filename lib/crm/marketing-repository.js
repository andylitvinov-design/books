import 'server-only'
import { randomUUID } from 'node:crypto'
import { databasePool } from '../app/database.js'
import { AppError, requireUUID } from '../assessments/contracts.js'
import {
  validateMarketingLead, validateMarketingStage, validateMarketingMilestone,
} from './marketing.js'

// Mirrors the already activated CRM owner boundary; no public/anonymous SQL endpoint.
export async function withMarketingOwner(config,actor,operation) {
  requireUUID(actor?.id)
  const db=await databasePool(config).connect()
  try {
    await db.query('BEGIN')
    const role=(await db.query('select rolsuper,rolbypassrls from pg_roles where rolname=current_user')).rows[0]
    if(!config.test&&(role?.rolsuper||role?.rolbypassrls)) throw new AppError('DATABASE_ROLE_UNSAFE',503)
    await db.query('SET LOCAL ROLE hh_crm_backend')
    await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(actor.claims)])
    if(!(await db.query('select app_private.account_active() as valid')).rows[0]?.valid)
      throw new AppError('SIGN_IN_REQUIRED',401)
    const result=await operation(db)
    await db.query('COMMIT')
    return result
  }catch(error){
    await db.query('ROLLBACK').catch(()=>{})
    throw error
  }finally{db.release()}
}

export function createMarketingStore(db,actor) {
  return {
    async overview(days=30) {
      const since=new Date(Date.now()-days*86400000).toISOString()
      const leads=(await db.query(
        'select id,contact_id,source,medium,campaign,creative,offer,stage,revision,created_at from app.crm_marketing_opportunities where owner_id=$1 and created_at >= $2 order by created_at desc,id desc limit 200',
        [actor.id,since])).rows
      const groups=(await db.query(
        "select source,count(*)::int as leads,count(*) filter(where stage in ('qualified','booked'))::int as qualified,count(*) filter(where stage='booked')::int as booked,count(distinct contact_id)::int as unique_contacts from app.crm_marketing_opportunities where owner_id=$1 and created_at >= $2 group by source order by leads desc, source limit 30",
        [actor.id,since])).rows
      const campaigns=(await db.query(
        "select source,campaign,creative,offer,count(*)::int as leads,count(*) filter(where stage in ('qualified','booked'))::int as qualified,count(*) filter(where stage='booked')::int as booked,count(distinct contact_id)::int as unique_contacts from app.crm_marketing_opportunities where owner_id=$1 and created_at >= $2 group by source,campaign,creative,offer order by booked desc, qualified desc,leads desc,source,campaign limit 100",
        [actor.id,since])).rows
      const oldSources=(await db.query(
        'select source,lifecycle,count(*)::int as contacts from app.crm_contacts where owner_id=$1 and created_at >= $2 group by source,lifecycle order by source,lifecycle limit 40',
        [actor.id,since])).rows
      const milestones=(await db.query(
        "select opportunity_id,kind,occurred_at from app.crm_marketing_events where owner_id=$1 and occurred_at >= $2 and kind in ('reiki_course_started','reiki_initiation_requested') order by occurred_at desc limit 200",
        [actor.id,since])).rows
      return {leads,groups,campaigns,oldSources,milestones,spendAvailable:false,paymentsAvailable:false,
        sourceStatus:'owner_confirmed_only'}
    },
    async recordLead(payload) {
      let input
      try{input=validateMarketingLead(payload)}catch{throw new AppError('INVALID_MARKETING_LEAD',400)}
      const contact=(await db.query(
        'select id,lifecycle from app.crm_contacts where id=$1 and owner_id=$2 for share',
        [input.contactId,actor.id])).rows[0]
      if(!contact)throw new AppError('NOT_FOUND',404)
      if(contact.lifecycle==='archived')throw new AppError('CRM_CONTACT_ARCHIVED',409)
      const id=input.id||randomUUID()
      const inserted=(await db.query(
        'insert into app.crm_marketing_opportunities (id,owner_id,contact_id,source,medium,campaign,creative,offer) values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (id) do nothing returning id',
        [id,actor.id,input.contactId,input.source,input.medium,input.campaign,input.creative,input.offer])).rows
      if(!inserted.length){
        const existing=(await db.query(
          'select contact_id,source,medium,campaign,creative,offer,stage,revision from app.crm_marketing_opportunities where id=$1 and owner_id=$2',
          [id,actor.id])).rows[0]
        if(!existing||existing.contact_id!==input.contactId||existing.source!==input.source||
           existing.medium!==input.medium||existing.campaign!==input.campaign||
           existing.creative!==input.creative||existing.offer!==input.offer)
          throw new AppError('CONFLICT',409)
        return {id,stage:existing.stage,revision:existing.revision,alreadyRecorded:true}
      }
      await db.query('insert into app.crm_marketing_events (id,owner_id,opportunity_id,kind) values ($1,$2,$3,$4)',
        [randomUUID(),actor.id,id,'lead_received'])
      return {id,stage:'received',revision:0,provenance:'owner_confirmed'}
    },
    async updateStage(payload){
      let input
      try{input=validateMarketingStage(payload)}catch{throw new AppError('INVALID_MARKETING_STAGE',400)}
      const item=(await db.query(
        'select stage,revision from app.crm_marketing_opportunities where id=$1 and owner_id=$2 for update',
        [input.id,actor.id])).rows[0]
      if(!item)throw new AppError('NOT_FOUND',404)
      if(item.revision!==input.expectedRevision)throw new AppError('CONFLICT',409)
      if(item.stage===input.stage)return {id:input.id,stage:item.stage,revision:item.revision}
      const row=(await db.query(
        'update app.crm_marketing_opportunities set stage=$1,revision=revision+1,updated_at=now() where id=$2 and owner_id=$3 returning revision',
        [input.stage,input.id,actor.id])).rows[0]
      await db.query('insert into app.crm_marketing_events(id,owner_id,opportunity_id,kind) values($1,$2,$3,$4)',
        [randomUUID(),actor.id,input.id,'stage_'+input.stage])
      return {id:input.id,stage:input.stage,revision:row.revision}
    },
    async recordMilestone(payload) {
      let input
      try{input=validateMarketingMilestone(payload)}catch{throw new AppError('INVALID_MARKETING_MILESTONE',400)}
      const lead=(await db.query('select offer from app.crm_marketing_opportunities where id=$1 and owner_id=$2',[input.id,actor.id])).rows[0]
      if(!lead)throw new AppError('NOT_FOUND',404)
      if(lead.offer!=='reiki_course')throw new AppError('INVALID_MARKETING_MILESTONE',400)
      const rows=(await db.query(
        'insert into app.crm_marketing_events(id,owner_id,opportunity_id,kind) values($1,$2,$3,$4) on conflict do nothing returning id',
        [randomUUID(),actor.id,input.id,input.milestone])).rows
      return {id:input.id,milestone:input.milestone,recorded:rows.length>0}
    },
  }
}
