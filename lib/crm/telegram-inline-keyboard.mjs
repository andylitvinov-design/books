import {telegramV2ButtonEntries} from './telegram-diagnostic-v2.mjs'

// Telegram InlineKeyboardMarkup is attached to the bot message ABOVE the
// composer. Callback data is stage/version/locale bound, never a client ID.
const LEGACY={
  consent:['/agree','/stop'],
  focus:['/situation','/energy','/stop'],
  question:['/skip','/stop'],
  photo:['/skip','/stop'],
  done:['/stop'],
}
const LEGACY_ACTION={
  '/agree':'agree','/stop':'stop','/situation':'situation',
  '/energy':'energy','/skip':'skip',
}
const LOCALES=new Set(['en','ru','es'])

export function telegramInlineButtonEntries(stage,locale,flowVersion){
  if(!LOCALES.has(locale))return []
  if(flowVersion===2)return telegramV2ButtonEntries(locale,stage)
  if(flowVersion===1)return (LEGACY[stage]||[]).map(text=>({
    text,action:LEGACY_ACTION[text],
  }))
  return []
}

export function buildTelegramInlineKeyboard(keyboard,{stage,locale,flowVersion}={}){
  const allowed=telegramInlineButtonEntries(stage,locale,flowVersion)
  if(!Array.isArray(keyboard)||keyboard.length<1||keyboard.length>2
      ||keyboard.some(row=>!Array.isArray(row)||row.length<1||row.length>3))
    throw new Error('INVALID_KEYBOARD')
  const code=String(flowVersion)
  return keyboard.map(row=>row.map(text=>{
    const matched=allowed.find(value=>value.text===text)
    if(!matched)throw new Error('INVALID_KEYBOARD')
    return {text,callback_data:'hhdiag:'+code+':'+stage+':'+matched.action+':'+locale}
  }))
}

export function parseTelegramInlineCallback(value){
  if(typeof value!=='string'||value.length>64)return null
  const parts=/^hhdiag:(1|2):(consent|focus|question|photo|drawing|done):([A-Za-z]+):(en|ru|es)$/.exec(value)
  if(!parts)return null
  const flowVersion=Number(parts[1]),stage=parts[2],action=parts[3],locale=parts[4]
  const found=telegramInlineButtonEntries(stage,locale,flowVersion)
    .find(entry=>entry.action===action)
  if(!found)return null
  return {stage,locale,flowVersion,rawText:found.text,stop:found.text==='/stop'}
}
