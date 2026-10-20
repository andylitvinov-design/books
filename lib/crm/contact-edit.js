import { validateContactInput } from './consent.js'
import { requireUUID } from '../assessments/contracts.js'

// Use the existing conservative business-only input contract, never a free-form patch.
// Stage, suppression, verified email and opt-in remain separate owner-authorized actions.
export function validateCrmContactEdit(value) {
  if (!value||typeof value!=='object'||Array.isArray(value)||
      Object.keys(value).some(key=>!['id','expectedRevision','displayName','email','phone','source','locale'].includes(key)))
    throw new Error('INVALID_CRM_CONTACT_EDIT')
  requireUUID(value.id)
  if (!Number.isSafeInteger(value.expectedRevision)||value.expectedRevision<0) throw new Error('INVALID_CRM_CONTACT_REVISION')
  const data=validateContactInput({
    displayName:value.displayName,email:value.email,phone:value.phone,
    locale:value.locale,source:value.source,lifecycle:'lead',
  })
  return { id:value.id,expectedRevision:value.expectedRevision,
    displayName:data.displayName,email:data.email,phone:data.phone,
    source:data.source,locale:data.locale }
}
