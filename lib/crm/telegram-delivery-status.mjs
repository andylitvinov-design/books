// Allowlisted outcome labels only. Never include provider response bodies,
// Telegram identifiers, customer text, credentials or keyboard contents.
export function telegramBusinessReplyFailure(error){
 const code=String(error?.code||'')
 if(error?.phase==='business_connection')return 'business_connection_unavailable'
 if(code==='RATE_LIMITED'||code==='PROVIDER_RATE_LIMITED')return 'rate_limited'
 // This is thrown before any Telegram send by the protected rate-limit function.
 if(code==='P0001'&&String(error?.message||'')==='INVALID_RATE_INPUT')return 'persistence_failure'
 if(/SUPABASE|DATABASE|POSTGRES|DB_UNAVAILABLE/.test(code))return 'persistence_failure'
 if(code==='INVALID_MESSAGE'||code==='INVALID_KEYBOARD')return 'invalid_payload'
 if(code==='CHANNEL_NOT_CONNECTED'||code==='ACCOUNT_CHANGED')return 'business_connection_unavailable'
 if(code==='PROVIDER_REJECTED')return 'provider_rejected'
 if(code==='PROVIDER_TIMEOUT'||code==='PROVIDER_STATUS_UNKNOWN')return 'delivery_unknown'
 return 'unknown'
}
export function telegramBusinessReplyCrmState(failure){
 return ['delivery_unknown','unknown'].includes(failure)?'delivery_unknown':'failed'
}
