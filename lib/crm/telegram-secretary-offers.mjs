/**
 * One source-bounded Secretary Mind for the existing Telegram Business chatbot.
 * Pure, no LLM, no CRM writes, no client data in links, no pseudo-products.
 * Publication/permissions are verified by the server before this is called.
 */
import {routeMindRole} from '../holistic-support/mind-role-router.mjs';
import {inferAssistPreferences,rankAssistOffers} from '../assist/service-match.mjs';
import {consultServiceQuestion} from '../assist/consultant-mind.mjs';
import {getPublicServiceDetailHref} from '../practitioners/public-service-links.js';

export const TELEGRAM_SECRETARY_VERSION='hh-tg-unified-secretary-v1';
export const TELEGRAM_SITE='https://holistichouse.vercel.app';
const SAFE_SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_TITLE=/^[^\u0000-\u001f<>]{2,135}$/u;
const LOCALES=new Set(['ru','en','es']);
const STOP=/^(?:\/stop|stop|стоп|отмена|cancel|cancelar|не надо|не интересует|no thanks|no quiero)$/iu;
const DANGER=/(?:суицид|покончить с собой|убить себя|хочу умереть|боль в груди|не могу дышать|suicide|kill myself|chest pain|cannot breathe|quiero morir|dolor en el pecho|no puedo respirar)/iu;
const RESOURCE=/(?:услуг|сесси|консультац|практик|видео|ролик|mytube|курс|академ|рейки|reiki|тест|диагност|у.?син|wu.?xing|расстанов|гомеопат|coaching|coach|бизнес|психотерап|записат|покуп|купит|продукт|каталог|мастер|мандал|stress|стресс|тревож|work|business|service|appointment|session|course|academy|video|test|catalog|practitioner|master|mandala|consulta|terapia|curso|vídeo|prueba|estrés|relaciones|salud)/iu;
const ASK=/(?:подбер|подскаж|предлож|покаж|посовет|пришл|отправ|ссылк|что есть|где найти|какие есть|сколько|цен[ауеы]|стоит|хочу|интересует|нужен|нужна|нужно|можно ли|доступн|записат|пожалуйста|recom|suggest|recommend|show|send|share|link|what|which|how much|price|cost|want|need|looking for|book|please|list|ver|enviar|mostrar|tienen|quiero|cuanto|cuánto|precio|necesito|puedes)/iu;
const SERVICE_MATCH=Object.freeze({
 homeopathy:/гомеопат|homeopath|homeopat/iu,
 business:/бизнес|делов|финанс|карьер|money|business|work|dinero|negocio/iu,
 constellation:/расстанов|constellat|constelac|семь|семейн/iu,
 reiki:/рейки|reiki|энерг|energy|energía/iu,
});
const CATEGORY=Object.freeze({
 video:/видео|mytube|ролик|watch|video|vídeo|ver video/iu,
 course:/курс|обучен|академ|опора|course|academy|learn|curso|aprender|opora/iu,
 test:/тест|диагностик|у.?син|wu.?xing|assessment|test|questionnaire|prueba|evaluaci/iu,
 master:/мастер|специалист|консультант|practitioner|specialist|master|professional|profesional/iu,
 mandala:/мандал|талисман|mandala|talisman/iu,
 price:/цен[ауеы]|сколько стоит|стоимост|price|cost|cuánto|cuanto|precio/iu,
 session:/сесси|консультац|встреч|записат|session|appointment|consult|book|consulta|sesión|presencial/iu,
});
const EMOTION=/стресс|тревог|страх|выгоран|напряж|устал|stress|anxiety|burnout|tired|ansiedad|estrés|cansad/iu;
const LOCALE_TEXT={
 ru:{intro:'Могу предложить опубликованные материалы Holistic House:',
  none:'По вашему запросу нет подтверждённого предложения. Уточните, пожалуйста, хотите видео, курс или консультацию?',
  more:'Выберите подходящую ссылку. Это не запись и не оплата.',
  price:'Уточняется у специалиста',from:'от',free:'Бесплатно',
  safety:'Если сейчас есть опасность для жизни или серьёзные симптомы, обратитесь за неотложной помощью. Здесь могу помочь найти человека для разговора.',
  sections:{videos:'MyTube — опубликованные видео',opora:'Курс ОПОРА — программа антистресс',
   academy:'Reiki Academy — программы обучения',tests:'Тесты и самопроверка',
   masters:'Специалисты Holistic House',review:'Бесплатный разбор ситуации',
   mandalas:'Символические практики и мандалы'}},
 en:{intro:'Here are published Holistic House resources you can explore:',
  none:'No verified offer matches this request. Would you prefer a video, a course or a consultation?',
  more:'Choose a link to learn more. This is not a booking or a payment.',
  price:'Ask the practitioner',from:'from',free:'Free',
  safety:'If you are in immediate danger or have serious symptoms, seek urgent help. I can help you find a person to talk to.',
  sections:{videos:'MyTube — published videos',opora:'OPORA — anti-stress course',
   academy:'Reiki Academy — learning programs',tests:'Wellbeing tests and self-checks',
   masters:'Holistic House practitioners',review:'Free situation review',
   mandalas:'Symbolic practices and mandalas'}},
 es:{intro:'Puedes consultar estos recursos publicados de Holistic House:',
  none:'No hay una oferta verificada que coincida. ¿Prefieres vídeo, curso o consulta?',
  more:'Elige un enlace para saber más. No es una reserva ni un pago.',
  price:'Consultar al profesional',from:'desde',free:'Gratis',
  safety:'Si hay peligro inmediato o síntomas graves, busca ayuda urgente. Puedo ayudarte a encontrar apoyo humano.',
  sections:{videos:'MyTube — vídeos publicados',opora:'OPORA — curso antiestrés',
   academy:'Reiki Academy — programas de aprendizaje',tests:'Pruebas de bienestar',
   masters:'Profesionales de Holistic House',review:'Revisión gratuita de la situación',
   mandalas:'Prácticas simbólicas y mandalas'}},
};
const KNOWN_SECTIONS=Object.freeze({
 videos:'mytube',opora:'courses/antistress',academy:'academy/reiki',tests:'tests',
 masters:'masters',review:'services/free-situation-review',mandalas:'holistic-support/mobile',
});
const euro=(s)=>s==='EUR'?'€':s==='CAD'?'CAD ':s==='USD'?'$':s+' ';
function priceLabel(s,l){
 const copy=LOCALE_TEXT[l],mode=s.pricing_mode;
 if(mode==='free')return copy.free;
 const price=s.confirmed_price;
 if(['fixed','from'].includes(mode) &&
   (typeof price==='number'||typeof price==='string') &&
   String(price).trim()!=='' && Number.isFinite(Number(price)) &&
   Number(price)>=0 && Number(price)<=100000 &&
   /^[A-Z]{3}$/.test(String(s.currency||''))){
   if(Number(price)===0)return copy.free;
   const amount=Number(price).toLocaleString(l+'-GB',{maximumFractionDigits:2});
   const formatted=euro(s.currency)+amount;
   return mode==='from'?copy.from+' '+formatted:formatted;
 }
 return copy.price;
}
function cleanTitle(title){
 return typeof title==='string'&&SAFE_TITLE.test(title.trim())?title.trim():null;
}
/**
 * Only ACTIVE, published records of APPROVED public practitioners are accepted.
 * A non-approved/draft/unpublished item is never allowed into output, even if
 * a caller inadvertently supplied it in a query result.
 */
export function publishedTelegramServiceOffers(rows,locale='en'){
 const l=LOCALES.has(locale)?locale:'en';
 const seen=new Set();
 return (Array.isArray(rows)?rows:[]).flatMap(s=>{
  if(s?.active!==true||s?.status!=='published'||
    s.practitioner_active!==true||s.practitioner_status!=='approved'||
    !SAFE_SLUG.test(s.slug||'')||!SAFE_SLUG.test(s.practitioner_slug||'')||
    !['fixed','from','contact','free'].includes(s.pricing_mode)||
    !['assessment','session','intro','course'].includes(s.offering_type))
   return [];
  const title=cleanTitle(s.localized_copy?.[l]?.title)||
    cleanTitle(s.localized_copy?.en?.title);
  const key=String(s.id||'');
  if(!title||!/^[a-f0-9-]{36}$/.test(key)||seen.has(key))return [];
  seen.add(key);
  const path=getPublicServiceDetailHref(l,s.practitioner_slug,s.slug);
  if(!new RegExp('^/'+l+'/services/[a-z0-9/-]+$').test(path))return [];
  return [{id:key,kind:'service',title,href:TELEGRAM_SITE+path,
    slug:s.slug,category:s.category||'',type:s.offering_type,
    price:priceLabel(s,l),free:s.pricing_mode==='free'||(s.confirmed_price!==null&&s.confirmed_price!==undefined&&Number(s.confirmed_price)===0&&s.pricing_mode==='fixed')}];
 });
}
function section(key,l){
 if(!Object.hasOwn(KNOWN_SECTIONS,key))return null;
 return {id:'section:'+key,kind:'section',title:LOCALE_TEXT[l].sections[key],
   href:TELEGRAM_SITE+'/'+l+'/'+KNOWN_SECTIONS[key]};
}
export function classifyTelegramSecretaryQuery(message,locale='en'){
 if(typeof message!=='string'||message.length>800)return null;
 const text=message.trim();
 if(!text||STOP.test(text)||/\[HH-REQ:/.test(text))return null;
 const l=LOCALES.has(locale)?locale:'en';
 const explicit=ASK.test(text)||text.length<35&&RESOURCE.test(text);
 if(!explicit||!RESOURCE.test(text))return null;
 if(DANGER.test(text))return {kind:'safety',locale:l};
 const focus=EMOTION.test(text)?'stress':
   SERVICE_MATCH.business.test(text)?'work':
   /отношен|семь|любов|relation|pareja|amor/.test(text)?'relationships':
   SERVICE_MATCH.reiki.test(text)?'energy':'general';
 const category=Object.fromEntries(Object.entries(CATEGORY).map(([k,re])=>[k,re.test(text)]));
 const named=Object.keys(SERVICE_MATCH).filter(k=>SERVICE_MATCH[k].test(text));
 const preferences=inferAssistPreferences(text);
 const role=routeMindRole({message:text,locale:l}).role;
 const consultant=consultServiceQuestion({message:text,locale:l});
 return {kind:'catalog',locale:l,focus,category,named,preferences,
   rank:rankAssistOffers(focus,preferences,5).map(x=>x.id),
   sourceRole:role,sourceConsultant:Boolean(consultant)};
}
function eligibleOffer(offer,q){
 if(q.preferences.budget==='free'&&!offer.free)return false;
 const category=q.category,slug=offer.slug||'',area=offer.category||'';
 if(q.named.includes('homeopathy'))return /homeopath/.test(slug)||/homeopath/.test(area);
 if(q.named.includes('business'))return /business/.test(slug)||/business/.test(area);
 if(q.named.includes('constellation'))return /constellat/.test(slug)||/constellat/.test(area);
 if(q.named.includes('reiki'))return /energy|reiki/.test(slug)||/energy|spiritual/.test(area);
 if(category.test)return offer.type==='assessment';
 if(category.session||category.price)return offer.type==='session'||offer.type==='intro';
 return q.focus==='general'||offer.type==='intro';
}
export function composeTelegramSecretaryAnswer(query,services=[]){
 if(query?.kind==='safety')
  return {handled:true,text:LOCALE_TEXT[query.locale].safety,buttons:[],kind:'safety',modelUsed:false};
 if(query?.kind!=='catalog'||!LOCALES.has(query.locale))return null;
 const l=query.locale,t=LOCALE_TEXT[l],p=query.category;
 const entries=[];
 const add=item=>{if(item&&!entries.some(x=>x.id===item.id))entries.push(item);};
 if(p.video)add(section('videos',l));
 if(p.course){
  add(section('opora',l));add(section('academy',l));
 }
 if(p.test)add(section('tests',l));
 if(p.master)add(section('masters',l));
 if(p.mandala)add(section('mandalas',l));
 if(query.focus==='stress'&&!p.session&&!p.price){
  add(section('opora',l));add(section('videos',l));add(section('review',l));
 }
 const catalogKind=offer=>({
   'homeopathy-consultation':'homeopathy',
   'business-situation-constellation':'business',
   'personal-constellation-session':'constellation',
   'remote-energy-support':'reiki',
   'free-intro-availability-request':'review',
   'free-wu-xing-diagnostic':'tests',
  })[offer.slug]||null;
 const rank=offer=>{
  const id=catalogKind(offer),pos=query.rank.indexOf(id);
  return pos>=0?pos:50;
 };
 const offered=publishedTelegramServiceOffers(services,l)
   .filter(x=>eligibleOffer(x,query))
   .sort((a,b)=>rank(a)-rank(b)||a.slug.localeCompare(b.slug));
 const resourceOnly=p.video||p.course||p.test||p.master||p.mandala;
 if(!resourceOnly||p.price||p.session||query.named.length)
   for(const offer of offered)if(entries.length<3)add(offer);
 if(!entries.length){
  // A named paid service is never replaced with unrelated substitutes when
  // the authoritative published-offer read is empty or unavailable.
  if(query.named.length)return {handled:true,text:t.none,buttons:[],kind:'empty',modelUsed:false};
  if(query.focus==='general'){add(section('review',l));add(section('tests',l));add(section('masters',l));}
  else {add(section('review',l));add(section('tests',l));}
 }
 const selected=entries.slice(0,3);
 if(!selected.length)return {handled:true,text:t.none,buttons:[],kind:'empty',modelUsed:false};
 const lines=selected.map((s,i)=>(i+1)+'. '+s.title+(s.kind==='service'?' — '+s.price:''));
 let text=t.intro+'\n'+lines.join('\n')+'\n'+t.more;
 // No dynamic/untrusted URL appears in the body; only validated first-party
 // links in Telegram inline URL buttons. Limit responses to provider caps.
 if(text.length>580)text=text.slice(0,575).trimEnd()+'…';
 return {handled:true,kind:'catalog',text,buttons:selected.map(s=>({
   text:s.title.slice(0,48),url:s.href,
 })),modelUsed:false,sourceRole:query.sourceRole};
}
