/**
 * Pure signed-client-bot ingress selector. The caller FIRST verifies
 * X-Telegram-Bot-Api-Secret-Token. This is not standalone authentication.
 * Only explicit video commands and global STOP pass; other traffic remains
 * with verified account linking, owner Dot and Subscriber AI.
 */
const COMMAND=/^\/(video|hhvideo_(?:agree|confirm|cancel)|stop|unsubscribe)(?:@([A-Za-z][A-Za-z0-9_]{4,31}))?(?:\s+([^\u0000-\u001f]{1,1100}))?$/iu
const ACCOUNT=/^[A-Za-z][A-Za-z0-9_]{4,31}$/
export function parseTelegramVideoClientIngress(update,verifiedBotUsername,now=Date.now()){
 if(!ACCOUNT.test(String(verifiedBotUsername||''))||!Number.isFinite(now)||
    !Number.isSafeInteger(update?.update_id)||update.update_id<0)return null
 const message=update?.message,chatId=message?.chat?.id
 if(message?.chat?.type!=='private'||message?.from?.is_bot===true||
    !Number.isSafeInteger(chatId)||chatId<=0||
    !Number.isSafeInteger(message?.from?.id)||message.from.id!==chatId||
    !Number.isSafeInteger(message?.message_id)||message.message_id<1||
    !Number.isSafeInteger(message?.date)||message.date<=0||
    typeof message.text!=='string'||message.text.length>1200)return null
 const sentAt=message.date*1000
 if(now-sentAt>600000||sentAt-now>120000)return null
 const input=message.text.trim(),match=COMMAND.exec(input)
 if(!match||match[2]&&match[2].toLowerCase()!==verifiedBotUsername.toLowerCase())return null
 const key=match[1].toLowerCase(),goal=String(match[3]||'').trim()
 if(key==='video'&&goal.length>600)return null
 if(key!=='video'&&goal)return null
 const stop=key==='stop'||key==='unsubscribe'
 const normalized=stop?'/stop':match[2]?'/'+key+(goal?' '+goal:''):input
 return {type:'incoming',eventId:'tg:'+update.update_id,
   userId:String(chatId),messageId:'tg:'+chatId+':'+message.message_id,
   rawText:normalized,body:normalized,
   language:String(message.from.language_code||'').slice(0,8),
   sentAt,stop,clientVideoIntent:!stop,accountId:null,
   inlineAction:false,callbackId:null}
}