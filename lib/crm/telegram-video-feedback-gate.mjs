import {advanceVideoEffect} from './telegram-video-effect.mjs'
/** Chat contents are already decrypted from a currently linked, consented
 * account-owned Telegram thread by the caller. A keyboard reply alone
 * never authorizes storage, video, or transfer.
 */
export function feedbackForActiveVideoState(chat,raw){
 if(!chat||typeof chat!=='object'||typeof raw!=='string'||raw.length>40)return false
 const effect=chat.effect
 if(effect?.v!==1||!['before','waiting','reaction','watch','after'].includes(effect.phase))
  return false
 if(['reaction','watch','after'].includes(effect.phase)&&effect.videoAccepted!==true)
  return false
 return advanceVideoEffect(effect,raw).handled===true
}