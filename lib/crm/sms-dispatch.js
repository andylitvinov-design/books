import 'server-only'
import { AppError } from '../assessments/contracts.js'
import { getSmsConfig, sendTwilioSms, validateSmsBody } from './sms.js'

export async function sendCrmSms({repo,actor,payload}) {
  const provider=getSmsConfig()
  if(!provider.enabled)throw new AppError('SMS_NOT_CONFIGURED',503)
  if(!payload||typeof payload!=='object'||Array.isArray(payload)||
      Object.keys(payload).some(k=>!['requestId','contactId','body'].includes(k)))
    throw new AppError('INVALID_SMS_REQUEST',400)
  try {validateSmsBody({body:payload.body})}
  catch(error){throw new AppError(error.message==='PRIVATE_CONTENT_BLOCKED'?'PRIVATE_CONTENT_BLOCKED':
    error.message==='SMS_TOO_LONG'?'SMS_TOO_LONG':'INVALID_SMS_MESSAGE',400)}
  const reserved=await repo.withOwner(actor,store=>
    store.reserveSms({...payload,testPhone:provider.live?null:provider.testPhone}))
  if(reserved.duplicate){
    // NEVER dispatch an existing request again, even if previous outcome was ambiguous.
    return {accepted:['accepted','queued','sending','sent','delivered'].includes(reserved.status),
      status:reserved.status,duplicate:true}
  }
  const ready=await repo.withOwner(actor,store=>store.claimSms(reserved.id))
  if(!ready.allowed)throw new AppError('SMS_CONSENT_CHANGED',409)
  try {
    const answer=await sendTwilioSms({config:provider,to:ready.to,text:ready.text})
    await repo.withOwner(actor,store=>store.finishSms(reserved.id,'accepted',answer.providerId))
    return {accepted:true,status:'accepted',segments:reserved.segments}
  }catch{
    await repo.withOwner(actor,store=>store.finishSms(reserved.id,'unknown',null)).catch(()=>{})
    throw new AppError('SMS_DELIVERY_UNCONFIRMED',503)
  }
}
