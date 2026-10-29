import 'server-only'
import {randomUUID} from 'node:crypto'
import {AppError,requireUUID} from '../assessments/contracts.js'
import {openSealed} from '../app/crypto.js'
import {canAdvanceOpportunity,CRM_OPPORTUNITY_STAGES,
  validateOpportunityCreate,validateOpportunityChange} from './opportunity-contract.mjs'
import {CRM_OPPORTUNITY_PAGE_SIZE,makeCrmOpportunityCursor,
  parseCrmOpportunityCursor} from './opportunity-pagination.mjs'

// All methods run inside the existing restricted CRM owner transaction.
// This is a BUSINESS opportunity, not an appointment, invoice or payment record.
const context=(owner,contactId)=>({accountId:owner,recordId:contactId,field:'crm.contact'})
function validated(parse,value) {
  try{return parse(value)}
  catch{throw new AppError('INVALID_OPPORTUNITY',400)}
}
export function createCrmOpportunityStore(db,actor,config) {
  const owner=actor.id
  return {
    async listOpportunityHistory(input) {
      if(!input||typeof input!=='object'||Array.isArray(input)||
        Object.keys(input).sort().join(',')!=='id')
        throw new AppError('INVALID_OPPORTUNITY',400)
      let id
      try{id=requireUUID(input.id)}
      catch{throw new AppError('INVALID_OPPORTUNITY',400)}
      const parent=(await db.query(
        'select id from app.crm_opportunities where id=$1 and owner_id=$2',
        [id,owner])).rows[0]
      if(!parent)throw new AppError('NOT_FOUND',404)
      const events=(await db.query(
        'select from_stage,to_stage,revision,occurred_at from app.crm_opportunity_events '+
        'where opportunity_id=$1 and owner_id=$2 order by revision asc limit 100',
        [id,owner])).rows
      return {id,events,manualOnly:true}
    },
    async listOpportunities(input={}) {
      if(!input||typeof input!=='object'||Array.isArray(input)||
        Object.keys(input).some(key=>key!=='cursor')||
        (input.cursor!==undefined&&input.cursor!==null&&typeof input.cursor!=='string'))
        throw new AppError('INVALID_OPPORTUNITY_CURSOR',400)
      let cursor=null
      if(input.cursor) {
        try{cursor=parseCrmOpportunityCursor(input.cursor,owner,config.encryptionKey)}
        catch{throw new AppError('INVALID_OPPORTUNITY_CURSOR',400)}
      }
      const totals=(await db.query(
        'select stage,count(*)::int as total from app.crm_opportunities where owner_id=$1 group by stage',
        [owner])).rows
      const counts=Object.fromEntries(CRM_OPPORTUNITY_STAGES.map(stage=>[stage,0]))
      for(const row of totals)if(Object.hasOwn(counts,row.stage))counts[row.stage]=row.total
      const rows=(await db.query(
        'select o.id,o.contact_id,o.service,o.stage,o.revision,o.created_at,o.updated_at,'+
        'c.contact_ciphertext,c.source,'+
        "to_char(o.created_at at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') as cursor_at "+
        'from app.crm_opportunities o join app.crm_contacts c '+
        'on c.id=o.contact_id and c.owner_id=o.owner_id '+
        'where o.owner_id=$1 and ($2::timestamptz is null or '+
        'o.created_at<$2::timestamptz or (o.created_at=$2::timestamptz and o.id<$3::uuid)) '+
        'order by o.created_at desc,o.id desc limit $4',
        [owner,cursor?.createdAt||null,cursor?.id||null,CRM_OPPORTUNITY_PAGE_SIZE+1]
      )).rows
      const page=rows.slice(0,CRM_OPPORTUNITY_PAGE_SIZE)
      const last=page[page.length-1]
      return {
        opportunities:page.map(row=>{
          const contact=openSealed(row.contact_ciphertext,context(owner,row.contact_id),config)
          return {
            id:row.id,contactId:row.contact_id,
            contactName:contact?.displayName||'Contact',
            source:row.source,service:row.service,stage:row.stage,
            revision:row.revision,createdAt:row.created_at,updatedAt:row.updated_at,
          }
        }),
        counts,total:Object.values(counts).reduce((a,b)=>a+b,0),
        nextCursor:rows.length>CRM_OPPORTUNITY_PAGE_SIZE?
          makeCrmOpportunityCursor({ownerId:owner,createdAt:last.cursor_at,
            id:last.id,encryptionKey:config.encryptionKey}):null,
        manualOnly:true,bookingVerified:false,paymentVerified:false,
      }
    },
    async createOpportunity(value) {
      const input=validated(validateOpportunityCreate,value)
      const old=(await db.query(
        'select id,contact_id,service,stage,revision from app.crm_opportunities '+
        'where owner_id=$1 and operation_id=$2 for update',
        [owner,input.operationId])).rows[0]
      if(old){
        if(old.contact_id!==input.contactId||old.service!==input.service)
          throw new AppError('OPPORTUNITY_IDEMPOTENCY_CONFLICT',409)
        return {id:old.id,contactId:old.contact_id,service:old.service,
          stage:old.stage,revision:old.revision,duplicate:true,manualOnly:true}
      }
      const contact=(await db.query(
        'select id,lifecycle,suppressed from app.crm_contacts '+
        'where id=$1 and owner_id=$2 for update',
        [input.contactId,owner])).rows[0]
      if(!contact||contact.suppressed||contact.lifecycle==='archived')
        throw new AppError('OPPORTUNITY_CONTACT_UNAVAILABLE',404)
      const id=randomUUID()
      // Concurrent retries may both miss the first read. The unique request
      // key is authoritative: after the contact lock, return the committed
      // identical result rather than creating a second deal or fake failure.
      const inserted=(await db.query(
        "insert into app.crm_opportunities(id,owner_id,contact_id,service,stage,operation_id) "+
        "values($1,$2,$3,$4,'new',$5) "+
        'on conflict(owner_id,operation_id) do nothing returning id',
        [id,owner,input.contactId,input.service,input.operationId])).rows[0]
      if(!inserted){
        const existing=(await db.query(
          'select id,contact_id,service,stage,revision from app.crm_opportunities '+
          'where owner_id=$1 and operation_id=$2 for update',
          [owner,input.operationId])).rows[0]
        if(!existing||existing.contact_id!==input.contactId||existing.service!==input.service)
          throw new AppError('OPPORTUNITY_IDEMPOTENCY_CONFLICT',409)
        return {id:existing.id,contactId:existing.contact_id,service:existing.service,
          stage:existing.stage,revision:existing.revision,duplicate:true,manualOnly:true}
      }
      await db.query(
        'insert into app.crm_opportunity_events'+
        '(id,owner_id,opportunity_id,from_stage,to_stage,revision) '+
        'values($1,$2,$3,$4,$5,$6)',
        [randomUUID(),owner,id,null,'new',0])
      return {id,contactId:input.contactId,service:input.service,
        stage:'new',revision:0,created:true,manualOnly:true}
    },
    async changeOpportunity(value) {
      const input=validated(validateOpportunityChange,value)
      const row=(await db.query(
        'select id,contact_id,service,stage,revision from app.crm_opportunities '+
        'where id=$1 and owner_id=$2 for update',
        [input.id,owner])).rows[0]
      if(!row)throw new AppError('NOT_FOUND',404)
      if(row.revision!==input.expectedRevision)
        throw new AppError('OPPORTUNITY_REVISION_CONFLICT',409)
      if(row.stage===input.stage)return {id:row.id,stage:row.stage,revision:row.revision,unchanged:true}
      if(!canAdvanceOpportunity(row.stage,input.stage))
        throw new AppError('INVALID_OPPORTUNITY_TRANSITION',409)
      const updated=(await db.query(
        'update app.crm_opportunities set stage=$3,revision=revision+1,updated_at=now() '+
        'where id=$1 and owner_id=$2 returning revision,updated_at',
        [row.id,owner,input.stage])).rows[0]
      await db.query(
        'insert into app.crm_opportunity_events'+
        '(id,owner_id,opportunity_id,from_stage,to_stage,revision) '+
        'values($1,$2,$3,$4,$5,$6)',
        [randomUUID(),owner,row.id,row.stage,input.stage,updated.revision])
      return {id:row.id,stage:input.stage,revision:updated.revision,
        updatedAt:updated.updated_at,manualOnly:true,
        bookingVerified:false,paymentVerified:false}
    },
  }
}
