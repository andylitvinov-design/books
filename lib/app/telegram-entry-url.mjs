// Safe first-party public Telegram entry selection. A bot link is an INVITATION
// to verify through Telegram; it is never itself login, consent or CRM identity.
const LOCALES=new Set(['en','ru','es'])
export function resolveTelegramFirstEntry(payload,locale){
 if(!LOCALES.has(locale)||!payload||typeof payload!=='object')return null
 const direct=payload.directAvailable===true
 if(!direct&&payload.available!==true)return null
 const raw=direct?payload.directUrls?.[locale]:payload.urls?.[locale]
 if(typeof raw!=='string'||raw.length>250)return null
 try{
  const url=new URL(raw)
  const bot=url.pathname.slice(1)
  const canonical=new URL(payload.url)
  const expected=(direct?'hhtalk_':'hhreview_')+locale
  if(url.origin!=='https://t.me'||canonical.origin!=='https://t.me'||
      canonical.pathname!==url.pathname||canonical.search||canonical.hash||
      canonical.username||canonical.password||!/^\/[A-Za-z0-9_]{5,32}$/.test(url.pathname)||
      !/bot$/i.test(bot)||url.username||url.password||url.hash||
      [...url.searchParams.keys()].length!==1||url.searchParams.get('start')!==expected)
    return null
  return {href:url.href,kind:direct?'direct':'review'}
 }catch{return null}
}
