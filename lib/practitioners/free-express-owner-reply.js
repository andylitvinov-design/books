import 'server-only'
import { transaction } from '../app/database.js'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { PRACTITIONER_ID } from '../../data/app-services.js'
import { createDirectMessages } from './direct-messages.js'
import { authorizedFreeExpressOwnerMedia } from './free-express-owner.js'
import { prepareFreeExpressOwnerReply } from './free-express-owner-reply-policy.mjs'

export async function freeExpressOwnerReplyStatus(config, actor, enquiryId) {
  requireUUID(enquiryId)
  // The media guard also verifies the exact free-review service, active owner
  // identity and site origin. Never authorize by a contact name or phone.
  await authorizedFreeExpressOwnerMedia(config, actor, enquiryId)
  return transaction(config, actor, async db => {
    const row = (await db.query(
      `select l.reference_code,t.id thread_id,t.blocked_at
         from app_private.free_express_account_links l
         left join app.practitioner_direct_threads t
           on t.sender_account_id=l.account_id
          and t.recipient_practitioner_id=l.recipient_practitioner_id
        where l.enquiry_id=$1 and l.recipient_practitioner_id=$2
        limit 1`, [enquiryId, PRACTITIONER_ID],
    )).rows[0]
    if (!row) return { canReply: false, channel: 'unverified', delivery: 'none' }
    if (!row.thread_id) return { canReply: false, channel: 'account_pending', delivery: 'none' }
    if (row.blocked_at) return { canReply: false, channel: 'blocked', delivery: 'none' }
    return {
      canReply: true, channel: 'private_cabinet', delivery: 'in_app_only',
      threadId: row.thread_id, referenceCode: row.reference_code,
    }
  })
}

export async function sendFreeExpressOwnerReply(config, actor, enquiryId, input) {
  const status = await freeExpressOwnerReplyStatus(config, actor, enquiryId)
  if (!status.canReply) throw new AppError('CLIENT_CHANNEL_UNVERIFIED', 409)
  requireUUID(input?.operationId)
  let text
  try { text = prepareFreeExpressOwnerReply(status.referenceCode, input.text) }
  catch { throw new AppError('INVALID_MESSAGE', 400) }
  const result = await createDirectMessages(config).send(actor, {
    threadId: status.threadId, operationId: input.operationId, text,
  })
  return {
    saved: result.saved === true, duplicate: result.duplicate === true,
    id: result.id, enquiryId, channel: 'private_cabinet', delivery: 'in_app_only',
  }
}
