import 'server-only'
import { transaction } from '../app/database.js'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { PRACTITIONER_ID } from '../../data/app-services.js'
import { practitionerEmailAllowed } from '../app/practitioner-access.js'
import { FREE_EXPRESS_SERVICE } from './free-express-continuation.mjs'

export async function authorizedFreeExpressOwnerMedia(config, actor, enquiryId) {
  requireUUID(enquiryId)
  if (!practitionerEmailAllowed(actor)) throw new AppError('ACCESS_DENIED', 403)
  return transaction(config, actor, async db => {
    const row = (await db.query(
      `select e.id,e.created_at,e.locale,e.service_title,e.source_path
       from app.public_service_enquiries e
       join app.practitioners p on p.id=e.recipient_practitioner_id
       where e.id=$1 and p.id=$2 and p.trusted_auth_user_id=$3
         and p.active and p.status in ('approved','submitted','changes_requested')`,
      [enquiryId, PRACTITIONER_ID, actor.id],
    )).rows[0]
    if (!row || row.service_title !== FREE_EXPRESS_SERVICE[row.locale]
      || row.source_path !== '/' + row.locale + '/services/free-situation-review')
      throw new AppError('NOT_FOUND', 404)
    return row
  })
}
