// WhatsApp text presentation over the SAME approved Secretary catalogue as Telegram.
// No LLM calls with customer text, unapproved prices, templated sales, or new links.
import {classifyTelegramSecretaryQuery,composeTelegramSecretaryAnswer} from './telegram-secretary-offers.mjs'

export function whatsappSecretaryQuery(text,locale){
 return classifyTelegramSecretaryQuery(text,locale)
}
export function whatsappSecretaryPublicAnswer(query,services=[]){
 if(!query)return null
 const planned=composeTelegramSecretaryAnswer(query,services)
 if(!planned?.handled||typeof planned.text!=='string')return null
 const links=(planned.buttons||[]).filter(b=>b&&typeof b.url==='string'&&
   b.url.startsWith('https://holistichouse.vercel.app/'+query.locale+'/')&&
   !/[?#]/.test(b.url)&&b.url.length<=240).slice(0,3)
 const linkText=links.map((b,i)=>(i+1)+'. '+b.url).join('\n')
 const human=query.locale==='ru'?
  '\n\nДля личного ответа напишите «Хочу консультацию».':
  query.locale==='es'?
   '\n\nPara hablar con una persona, escribe «Quiero consulta».':
   '\n\nFor a human response, write “I want a consultation”.'
 const text=planned.text+(linkText?'\n'+linkText:'')+human
 return {text:text.length<=1200?text:planned.text.slice(0,1150),
   locale:query.locale,kind:planned.kind}
}
