import { AppError,requireUUID } from '../assessments/contracts.js'
import { CRM_ACTIVITY_PAGE_SIZE,createCrmActivityCursor,readCrmActivityCursor } from './activity-pagination.js'

// Every call runs inside the existing authenticated owner transaction using
// restricted hh_crm_backend and FORCE RLS. No medical or free-text content.
export function createCrmActivityHistoryStore(db,actor,config) {
  return {
    async contactActivityPage(contactId,cursorValue=null) {
      requireUUID(contactId)
      let cursor=null
      if(cursorValue!==null) {
        try {
          cursor=readCrmActivityCursor(cursorValue,{
            ownerId:actor.id,contactId,key:config.encryptionKey,
          })
        }catch {throw new AppError('INVALID_CRM_ACTIVITY_CURSOR',400)}
      }
      const exists=(await db.query(
        'select id from app.crm_contacts where id=$1 and owner_id=$2 limit 1',
        [contactId,actor.id],
      )).rows[0]
      if(!exists)throw new AppError('NOT_FOUND',404)
      const rows=(await db.query(
        'select id,kind,stage,occurred_at, '+
        "to_char(occurred_at at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') as cursor_at "+
        'from app.crm_activity where owner_id=$1 and contact_id=$2 and '+
        '($3::timestamptz is null or (occurred_at,id)<($3::timestamptz,$4::uuid)) '+
        'order by occurred_at desc,id desc limit $5',
        [actor.id,contactId,cursor?.at||null,cursor?.id||null,CRM_ACTIVITY_PAGE_SIZE+1],
      )).rows
      const page=rows.slice(0,CRM_ACTIVITY_PAGE_SIZE)
      return {
        events:page.map(item=>({
          id:item.id,kind:item.kind,stage:item.stage,occurredAt:item.occurred_at,
        })),
        nextCursor:rows.length>CRM_ACTIVITY_PAGE_SIZE
          ?createCrmActivityCursor({
            ownerId:actor.id,contactId,
            at:page[page.length-1].cursor_at,
            id:page[page.length-1].id,key:config.encryptionKey,
          })
          :null,
      }
    },
  }
}
