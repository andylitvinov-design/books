import 'server-only'
import { AppError } from '../assessments/contracts.js'
import { createEmailToken, formatMarketingMail, formatVerificationMail,
 getCrmEmailConfig, safeEmailIdempotency, sendResendEmail, validateEmailMessage } from './email.js'

function requireReady() {
  const mail = getCrmEmailConfig()
  if (!mail.enabled) throw new AppError('EMAIL_NOT_CONFIGURED',503)
  return mail
}
export async function sendCrmVerification({ repo, actor, payload }) {
  const mail = requireReady()
  if (!payload || Object.keys(payload).some(k=>k!=='contactId')) throw new AppError('INVALID_EMAIL_REQUEST',400)
  const { token, digest } = createEmailToken()
  const reserved = await repo.withOwner(actor, store => store.reserveVerification(payload.contactId,digest))
  const content = formatVerificationMail(mail,reserved.locale,token)
  try {
    const answer = await sendResendEmail({config:mail,idempotencyKey:safeEmailIdempotency(reserved.id,'verification'),
      to:reserved.email,subject:content.subject,text:content.text})
    await repo.withOwner(actor,store=>store.finishVerification(reserved.id,'accepted',answer.providerId))
    return {accepted:true,kind:'verification'}
  } catch {
    await repo.withOwner(actor,store=>store.finishVerification(reserved.id,'unknown',null)).catch(()=>{})
    throw new AppError('EMAIL_DELIVERY_UNCONFIRMED',503)
  }
}
export async function sendCrmMessage({ repo, actor, payload }) {
  const mail = requireReady()
  if (!payload || Object.keys(payload).some(k=>!['requestId','contactId','subject','body'].includes(k)))
    throw new AppError('INVALID_EMAIL_REQUEST',400)
  let text
  try { text = validateEmailMessage({subject:payload.subject,body:payload.body}) }
  catch { throw new AppError('INVALID_EMAIL_MESSAGE',400) }
  const unsubscribe = createEmailToken()
  const reserved = await repo.withOwner(actor,store=>store.reserveMessage({...payload,...text},unsubscribe.digest))
  if (reserved.duplicate) return {accepted:reserved.status==='accepted',duplicate:true,status:reserved.status}
  const ready = await repo.withOwner(actor,store=>store.claimMessage(reserved.id))
  if (!ready.allowed) throw new AppError('EMAIL_CONSENT_CHANGED',409)
  const mailContent = formatMarketingMail(mail,ready.locale,ready.content,unsubscribe.token)
  try {
    const answer = await sendResendEmail({config:mail,idempotencyKey:safeEmailIdempotency(reserved.id,'message'),
      to:ready.to,subject:mailContent.subject,text:mailContent.text})
    await repo.withOwner(actor,store=>store.finishMessage(reserved.id,'accepted',answer.providerId))
    return {accepted:true,kind:'message'}
  } catch {
    await repo.withOwner(actor,store=>store.finishMessage(reserved.id,'unknown',null)).catch(()=>{})
    throw new AppError('EMAIL_DELIVERY_UNCONFIRMED',503)
  }
}
