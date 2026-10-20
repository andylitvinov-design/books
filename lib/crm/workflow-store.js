import { AppError } from '../assessments/contracts.js'
import { openSealed } from '../app/crypto.js'
import { torontoBusinessDate, validateFollowupCreate,
  validateFollowupUpdate, validateBusinessActivity } from './workflow.js'
import {CRM_OPEN_FOLLOWUP_PAGE_SIZE,makeCrmFollowupCursor,readCrmFollowupCursor} from './followup-pagination.js'

function label(row,actor,config) {
  const data=openSealed(row.contact_ciphertext,
    {accountId:actor.id,recordId:row.contact_id,field:'crm.contact'},config)
  return data?.displayName || 'Contact'
}

// Called inside createCrmRepository.withOwner after SET LOCAL ROLE and account_active.
export function createCrmWorkflowStore(db,actor,config) {
  return {
    async overview() {
      const rows=(await db.query(
        'select lifecycle,source,count(*)::int as total from app.crm_contacts where owner_id=$1 group by lifecycle,source',
        [actor.id],
      )).rows
      const today=torontoBusinessDate()
      const followups=(await db.query(
        "select count(*) filter(where status='open')::int as open, " +
        "count(*) filter(where status='open' and due_on<$2::date)::int as overdue, " +
        "count(*) filter(where status='open' and due_on=$2::date)::int as today " +
        'from app.crm_followups where owner_id=$1',
        [actor.id,today],
      )).rows[0]
      const stages={lead:0,client:0,archived:0}
      const sources={manual:0,website:0,referral:0,event:0,academy:0,other:0}
      for (const row of rows) {
        if(Object.hasOwn(stages,row.lifecycle))stages[row.lifecycle]+=row.total
        if(Object.hasOwn(sources,row.source))sources[row.source]+=row.total
      }
      return {total:Object.values(stages).reduce((a,b)=>a+b,0),stages,sources,followups,
        asOf:today,timeZone:'America/Toronto',interpretation:'manual_business_stages_not_verified_sales'}
    },
    async listFollowupsSnapshot() {
      // Open tasks sort before recent closed tasks. Fetch a look-ahead row so
      // the next cursor is offered only if another OPEN task exists.
      const rows=(await db.query(
        "select f.id,f.contact_id,f.kind,f.due_on::text as due_on, " +
        "f.status,f.revision,f.created_at,f.closed_at,c.contact_ciphertext, " +
        "to_char(f.created_at at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') as cursor_at " +
        "from app.crm_followups f join app.crm_contacts c on " +
        "c.id=f.contact_id and c.owner_id=f.owner_id " +
        "where f.owner_id=$1 and (f.status='open' or f.created_at>now()-interval '60 days') " +
        "order by case when f.status='open' then 0 else 1 end, " +
        'f.due_on asc,f.created_at desc,f.id desc limit 301',
        [actor.id],
      )).rows
      const page=rows.slice(0,300)
      const last=page[page.length-1]
      const hasMoreOpen=rows.length>300&&rows[300].status==='open'&&last?.status==='open'
      return {
        followups:page.map(row=>({
          id:row.id,contactId:row.contact_id,contactName:label(row,actor,config),
          kind:row.kind,dueOn:row.due_on,status:row.status,revision:row.revision,
          createdAt:row.created_at,closedAt:row.closed_at,
        })),
        nextCursor:hasMoreOpen?makeCrmFollowupCursor({
          ownerId:actor.id,dueOn:last.due_on,createdAt:last.cursor_at,id:last.id,
          key:config.encryptionKey,
        }):null,
      }
    },
    async listFollowups() {
      return (await this.listFollowupsSnapshot()).followups
    },
    async listOpenFollowupsPage(rawCursor) {
      let cursor
      try {
        cursor=readCrmFollowupCursor(rawCursor,{ownerId:actor.id,key:config.encryptionKey})
      } catch {throw new AppError('INVALID_FOLLOWUP_CURSOR',400)}
      const rows=(await db.query(
        "select f.id,f.contact_id,f.kind,f.due_on::text as due_on, " +
        "f.status,f.revision,f.created_at,f.closed_at,c.contact_ciphertext, " +
        "to_char(f.created_at at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') as cursor_at " +
        "from app.crm_followups f join app.crm_contacts c on " +
        "c.id=f.contact_id and c.owner_id=f.owner_id " +
        "where f.owner_id=$1 and f.status='open' and " +
        "(f.due_on>$2::date or (f.due_on=$2::date and " +
        "(f.created_at<$3::timestamptz or " +
        "(f.created_at=$3::timestamptz and f.id<$4::uuid)))) " +
        "order by f.due_on asc,f.created_at desc,f.id desc limit $5",
        [actor.id,cursor.dueOn,cursor.createdAt,cursor.id,CRM_OPEN_FOLLOWUP_PAGE_SIZE+1],
      )).rows
      const page=rows.slice(0,CRM_OPEN_FOLLOWUP_PAGE_SIZE)
      const last=page[page.length-1]
      return {
        followups:page.map(row=>({
          id:row.id,contactId:row.contact_id,contactName:label(row,actor,config),
          kind:row.kind,dueOn:row.due_on,status:row.status,revision:row.revision,
          createdAt:row.created_at,closedAt:row.closed_at,
        })),
        nextCursor:rows.length>CRM_OPEN_FOLLOWUP_PAGE_SIZE?makeCrmFollowupCursor({
          ownerId:actor.id,dueOn:last.due_on,createdAt:last.cursor_at,id:last.id,
          key:config.encryptionKey,
        }):null,
      }
    },
    async listRecentActivity() {
      const rows=(await db.query(
        "select a.id,a.contact_id,a.kind,a.stage,a.occurred_at,c.contact_ciphertext " +
        "from app.crm_activity a join app.crm_contacts c on " +
        "c.id=a.contact_id and c.owner_id=a.owner_id where a.owner_id=$1 " +
        'order by a.occurred_at desc,a.id desc limit 100',
        [actor.id],
      )).rows
      return rows.map(row=>({
        id:row.id,contactId:row.contact_id,contactName:label(row,actor,config),
        kind:row.kind,stage:row.stage,occurredAt:row.occurred_at,
      }))
    },
    async createFollowup(raw) {
      let input
      try {input=validateFollowupCreate(raw)}catch{throw new AppError('INVALID_FOLLOWUP',400)}
      const existing=(await db.query(
        'select id,contact_id,kind,due_on::text as due_on,status,revision from app.crm_followups where id=$1 and owner_id=$2',
        [input.id,actor.id],
      )).rows[0]
      if(existing) {
        if(existing.contact_id===input.contactId && existing.kind===input.kind &&
           existing.due_on===input.dueOn)
          return {id:existing.id,contactId:existing.contact_id,kind:existing.kind,
            dueOn:existing.due_on,status:existing.status,revision:existing.revision,duplicate:true}
        throw new AppError('CONFLICT',409)
      }
      // Lock parent to serialize concurrent creation and lifecycle updates.
      const contact=(await db.query(
        'select lifecycle from app.crm_contacts where id=$1 and owner_id=$2 for update',
        [input.contactId,actor.id],
      )).rows[0]
      if(!contact)throw new AppError('NOT_FOUND',404)
      if(contact.lifecycle==='archived')throw new AppError('CRM_CONTACT_ARCHIVED',409)
      const active=(await db.query(
        "select count(*)::int as n from app.crm_followups where contact_id=$1 and owner_id=$2 and status='open'",
        [input.contactId,actor.id],
      )).rows[0]?.n||0
      if(active>=20)throw new AppError('CRM_FOLLOWUP_LIMIT',429)
      try {
        await db.query(
          'insert into app.crm_followups(id,owner_id,contact_id,kind,due_on) values($1,$2,$3,$4,$5::date)',
          [input.id,actor.id,input.contactId,input.kind,input.dueOn],
        )
      } catch(error) {
        if(error?.code==='23505')throw new AppError('CONFLICT',409)
        throw error
      }
      return {...input,status:'open',revision:0}
    },
    async changeFollowup(raw) {
      let input
      try {input=validateFollowupUpdate(raw)}catch{throw new AppError('INVALID_FOLLOWUP',400)}
      const row=(await db.query(
        'select id,contact_id,status,due_on::text as due_on,revision from app.crm_followups where id=$1 and owner_id=$2 for update',
        [input.id,actor.id],
      )).rows[0]
      if(!row)throw new AppError('NOT_FOUND',404)
      if(row.revision!==input.expectedRevision || row.status!=='open')
        throw new AppError('CONFLICT',409)
      const status=input.action==='complete'?'completed':input.action==='cancel'?'canceled':'open'
      const due=input.action==='reschedule'?input.dueOn:row.due_on
      const result=(await db.query(
        "update app.crm_followups set due_on=$1::date,status=$2, " +
        "closed_at=case when $2='open' then null else now() end, " +
        'revision=revision+1 where id=$3 and owner_id=$4 returning revision,status,due_on::text as due_on',
        [due,status,input.id,actor.id],
      )).rows[0]
      return {id:input.id,status:result.status,dueOn:result.due_on,revision:result.revision}
    },
    async logBusinessActivity(raw) {
      let input
      try {input=validateBusinessActivity(raw)}catch{throw new AppError('INVALID_CRM_ACTIVITY',400)}
      const existing=(await db.query(
        'select id,contact_id,kind from app.crm_activity where id=$1 and owner_id=$2',
        [input.id,actor.id],
      )).rows[0]
      if(existing) {
        if(existing.contact_id===input.contactId && existing.kind===input.kind)
          return {id:input.id,recorded:true,duplicate:true}
        throw new AppError('CONFLICT',409)
      }
      const contact=(await db.query(
        'select lifecycle from app.crm_contacts where id=$1 and owner_id=$2 for update',
        [input.contactId,actor.id],
      )).rows[0]
      if(!contact)throw new AppError('NOT_FOUND',404)
      if(contact.lifecycle==='archived')throw new AppError('CRM_CONTACT_ARCHIVED',409)
      await db.query(
        'insert into app.crm_activity(id,owner_id,contact_id,kind) values($1,$2,$3,$4)',
        [input.id,actor.id,input.contactId,input.kind],
      )
      return {id:input.id,recorded:true}
    },
  }
}
