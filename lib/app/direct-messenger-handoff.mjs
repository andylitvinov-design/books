// Pure URL contract for returning from Google OAuth to the SAME approved
// Holistic House private messenger. A public practitioner slug is navigation,
// never identity, an authorization token, or a recipient account ID.
const SLUG=/^[a-z0-9-]{2,90}$/
const LOCALES=new Set(['en','ru','es'])

export function directMessengerRecipient(value) {
  if(value===null||value===undefined)return null
  if(typeof value!=='string'||!SLUG.test(value))
    throw new Error('INVALID_RECIPIENT')
  return value
}

export function directMessengerReturnPath(locale,recipientSlug=null){
  if(!LOCALES.has(locale))throw new Error('INVALID_LOCALE')
  const recipient=directMessengerRecipient(recipientSlug)
  return '/'+locale+'/app/messages'+(recipient?'?to='+encodeURIComponent(recipient):'')
}

/** First-time Google users complete required Cabinet consent BEFORE chatting.
 * ES uses the verified EN account onboarding UI, then returns to ES Messages.
 * No private text, customer IDs or arbitrary redirects are carried in the URL.
 */
export function directMessengerSetupPath(locale,recipientSlug=null){
  if(!LOCALES.has(locale))throw new Error('INVALID_LOCALE')
  const recipient=directMessengerRecipient(recipientSlug)
  const params=new URLSearchParams({afterSignIn:'messages',chatLocale:locale})
  if(recipient)params.set('to',recipient)
  return '/'+(locale==='es'?'en':locale)+'/app/portrait?'+params
}
