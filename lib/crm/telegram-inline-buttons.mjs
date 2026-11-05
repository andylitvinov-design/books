// Pure, allowlisted Telegram Bot API inline buttons for the first-party
// six-stage coaching dialog. No token, chat ID, network or database access.
import { TELEGRAM_DIAGNOSTIC_V2_BUTTON_LABELS } from './telegram-diagnostic-v2.mjs'

const v2Keys=Object.freeze([
  'yes','notNow','business','wellbeing','relationships','other','skipPhoto','skipDrawing',
])
const v1Actions=Object.freeze({
  agree:'/agree',stop:'/stop',situation:'/situation',energy:'/energy',skip:'/skip',
})
const v1Labels=Object.freeze({
  en:{agree:'Yes, continue',stop:'Stop',situation:'My situation',energy:'My energy',skip:'Skip'},
  ru:{agree:'Да, продолжаем',stop:'Остановить диалог',situation:'Моя ситуация',energy:'Моя энергия',skip:'Пропустить'},
  es:{agree:'Sí, continuar',stop:'Parar',situation:'Mi situación',energy:'Mi energía',skip:'Omitir'},
})
const locales=Object.keys(TELEGRAM_DIAGNOSTIC_V2_BUTTON_LABELS)
const validLocale=value=>locales.includes(value)?value:'en'

export function telegramInlineButtonForText(label, locale='en'){
  if(typeof label!=='string'||label.length<1||label.length>80)return null
  for(const language of locales){
    for(const key of v2Keys){
      if(TELEGRAM_DIAGNOSTIC_V2_BUTTON_LABELS[language][key]===label)
        return {text:label,callback_data:'hhv2:'+language+':'+key}
    }
  }
  for(const [key,command] of Object.entries(v1Actions)){
    if(label===command)
      return {text:v1Labels[validLocale(locale)][key],callback_data:'hhv1:'+key}
  }
  return null
}

export function telegramInlineMarkup(rows,locale='en'){
  if(!Array.isArray(rows)||rows.length<1||rows.length>2)
    throw new Error('INVALID_INLINE_KEYBOARD')
  const inline_keyboard=rows.map(row=>{
    if(!Array.isArray(row)||row.length<1||row.length>3)
      throw new Error('INVALID_INLINE_KEYBOARD')
    return row.map(label=>{
      const button=telegramInlineButtonForText(label,locale)
      if(!button)throw new Error('INVALID_INLINE_KEYBOARD')
      return button
    })
  })
  return {inline_keyboard}
}

export function telegramInlineCallbackSelection(data){
  if(typeof data!=='string'||data.length>64)return null
  const v2=/^hhv2:(en|ru|es):([A-Za-z]+)$/.exec(data)
  if(v2&&v2Keys.includes(v2[2])){
    return {
      rawText:TELEGRAM_DIAGNOSTIC_V2_BUTTON_LABELS[v2[1]][v2[2]],
      inlineAction:'v2:'+v2[2],
      locale:v2[1],
    }
  }
  const v1=/^hhv1:(agree|stop|situation|energy|skip)$/.exec(data)
  if(v1)return {rawText:v1Actions[v1[1]],inlineAction:'v1:'+v1[1],locale:null}
  return null
}

const allowedV2=Object.freeze({
  consent:['yes','notNow'],
  focus:['business','wellbeing','relationships','other'],
  photo:['skipPhoto'],
  question:[],
  drawing:['skipDrawing'],
  done:[],
  stopped:[],
})
const allowedV1=Object.freeze({
  consent:['agree','stop'],focus:['situation','energy','stop'],
  question:['skip','stop'],photo:['skip','stop'],done:['stop'],stopped:[],
})
export function telegramInlineActionAllowed(inlineAction,stage,version){
  if(typeof inlineAction!=='string')return false
  const [kind,key]=inlineAction.split(':')
  const table=kind==='v2'&&Number(version)===2?allowedV2:
    kind==='v1'&&Number(version)!==2?allowedV1:null
  return Boolean(table&&Array.isArray(table[stage])&&table[stage].includes(key))
}
