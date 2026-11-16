// Pure, privacy-safe diagnostics for a Telegram questionnaire prompt that was
// committed in CRM but not confirmed as accepted by Telegram.
// Never return chat IDs, message content, tokens, provider errors or raw event IDs.
const REASONS=new Set([
  'PROVIDER_REJECTED','PROVIDER_STATUS_UNKNOWN','CHANNEL_NOT_CONNECTED',
  'TEST_RECIPIENT_ONLY','INVALID_MESSAGE','INVALID_KEYBOARD',
  'CONSENT_REQUIRED','RECIPIENT_NOT_VERIFIED',
])
const BLOCKED=new Set([
  'CHANNEL_NOT_CONNECTED','TEST_RECIPIENT_ONLY','INVALID_MESSAGE',
  'INVALID_KEYBOARD','CONSENT_REQUIRED','RECIPIENT_NOT_VERIFIED',
])
export function telegramPromptFailureEvidence(eventId,error,operationDigest){
  const received=typeof error?.code==='string'?error.code:''
  const reasonCode=REASONS.has(received)?received:'PROVIDER_STATUS_UNKNOWN'
  const status=BLOCKED.has(reasonCode)?'blocked':
    reasonCode==='PROVIDER_REJECTED'?'failed':'unknown'
  let eventHash=null
  if(/^tg:\d{1,20}$/.test(String(eventId||''))&&typeof operationDigest==='function'){
    try{
      const digest=operationDigest({scope:'crm-tg-prompt-failure-v1',eventId})
      if(typeof digest==='string'&&/^[a-f0-9]{64}$/.test(digest))eventHash=digest.slice(0,16)
    }catch{ /* Failure diagnostics must never affect the consented inbound commit. */ }
  }
  return {status,reasonCode,eventHash}
}
