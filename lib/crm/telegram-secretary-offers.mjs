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
const RESOURCE=/(?:услуг|сесси|консультац|практик|видео|ролик|mytube|курс|академ|рейки|reiki|тест|диагност|у.?син|wu.?xing|расстанов|гомеопат|coaching|coach|бизнес|психотерап|образн|imagery|psychother|hipnoterap|psicoterap|записат|покуп|купит|продукт|каталог|мастер|мандал|stress|стресс|тревож|work|business|service|appointment|session|course|academy|video|test|catalog|practitioner|master|mandala|consulta|terapia|curso|vídeo|prueba|estrés|relaciones|salud)/iu;
const ASK=/(?:подбер|подскаж|предлож|покаж|посовет|пришл|отправ|ссылк|что есть|где найти|какие есть|сколько|цен[ауеы]|стоит|хочу|интересует|нужен|нужна|нужно|можно ли|доступн|записат|пожалуйста|отлича|разниц|сравн|качеств|отзыв|эффективн|recom|suggest|difference|compare|quality|reviews|diferencia|comparar|calidad|opiniones|recommend|show|send|share|link|what|which|how much|price|cost|want|need|looking for|book|please|list|ver|enviar|mostrar|tienen|quiero|cuanto|cuánto|precio|necesito|puedes)/iu;
const SERVICE_MATCH=Object.freeze({
 homeopathy:/гомеопат|homeopath|homeopat/iu,
 therapy:/образн|символдрам|психотерап|гипнотерап|imagery|psychotherap|hypnotherap|psicoterap|hipnoterap/iu,
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
// Explicit first-party pages only; no generated URL or inferred product ID.
const CONSULTANT_PAGES=Object.freeze({
 therapy:'services/imagery-therapy',
 constellation:'services/systemic-constellations',
 business:'services/business-consulting',
 homeopathy:'services/alchemy-of-soul',
 reiki:'services/remote-energy-support',
 review:'services/free-situation-review',
 tests:'tests',
 mytube:'mytube',
 opora:'courses/antistress',
 academy:'academy/reiki',
 masters:'masters',
 aiCoach:'my-coach',
 mandala:'holistic-support/mandala',
 talisman:'holistic-support/mobile',
});
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
// Budget limits are EUR tiers. "from" is a minimum, NOT proof that
// the final price is within the customer's hard ceiling.
function verifiedFixedEUR(s){
 if(s.pricing_mode!=='fixed'||s.currency!=='EUR')return null;
 const value=s.confirmed_price;
 if((typeof value!=='string'&&typeof value!=='number')||
    String(value).trim()===''||!Number.isFinite(Number(value))||
    Number(value)<0||Number(value)>100000)return null;
 return Number(value);
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
    price:priceLabel(s,l),pricingMode:s.pricing_mode,currency:s.currency,
    fixedEUR:verifiedFixedEUR(s),
    free:s.pricing_mode==='free'||(verifiedFixedEUR(s)===0)}];
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
 // Currency conversion is not authorized or available. A CAD/USD hard cap
 // is not an implicit EUR cap; clarify before any budget-sensitive selection.
 const otherCurrencyCap=Boolean(consultant?.intent==='choose'&&
   /(?:до|under|up to|hasta|max(?:imum)?)\s*(?:\$\s*\d+|(?:cad|usd)\s*\d+|\d+\s*(?:cad|usd))/iu.test(text)&&
   !/(?:€|\beur\b|\beuro\b|евро)/iu.test(text));
 return {kind:'catalog',locale:l,focus,category,named,preferences,otherCurrencyCap,
   rank:rankAssistOffers(focus,preferences,5).map(x=>x.id),
   sourceRole:role,sourceConsultant:Boolean(consultant),
   consultantDecision:consultant&&['price','quality','compare','choose'].includes(consultant.intent)
      ?{intent:consultant.intent,reply:consultant.reply,
        suggestions:consultant.suggestions}:null};
}
function eligibleOffer(offer,q){
 if(q.preferences.budget==='free'&&!offer.free)return false;
 const cap=q.preferences.budget==='under50'?50:q.preferences.budget==='under100'?100:null;
 if(cap!==null&&!offer.free&&!(offer.fixedEUR!==null&&
   Number.isFinite(offer.fixedEUR)&&offer.fixedEUR<=cap))return false;
 const category=q.category,slug=offer.slug||'',area=offer.category||'';
 // Do not push an unrelated, even cheaper Reiki/energy session to someone
 // asking about relationships, career or stress. Published ≠ relevant.
 if(!q.named.length&&q.focus!=='general'){
   const related={
     relationships:/relationship|relaci|couple|family|constellat|therapy|imagery|coaching/,
     work:/business|career|founder|work|money|finance/,
     stress:/stress|anxiety|wellbeing|therapy|imagery|hypno|coaching/,
     energy:/energy|reiki|spiritual/,
     health:/^$/,
   }[q.focus];
   if(related&&!related.test(slug+' '+area))return false;
 }
 if(q.named.includes('homeopathy'))return /homeopath/.test(slug)||/homeopath/.test(area);
 if(q.named.includes('therapy'))return /imagery|therap|hypnoth/.test(slug)||/imagery|therap|hypnoth/.test(area);
 if(q.named.includes('business'))return /business/.test(slug)||/business/.test(area);
 if(q.named.includes('constellation'))return /constellat/.test(slug)||/constellat/.test(area);
 if(q.named.includes('reiki'))return /energy|reiki/.test(slug)||/energy|spiritual/.test(area);
 if(category.test)return offer.type==='assessment';
 if(category.session||category.price)return offer.type==='session'||offer.type==='intro';
 return q.focus==='general'||offer.type==='intro';
}
function verifiedConsultantLink(row,l){
 if(!row||typeof row.id!=='string'||typeof row.title!=='string'||
   typeof row.href!=='string')return null;
 const id=row.id.replace(/^service:/,'');
 if(!Object.hasOwn(CONSULTANT_PAGES,id)||
   row.href!==('/'+l+'/'+CONSULTANT_PAGES[id])||
   !SAFE_TITLE.test(row.title))return null;
 return {id:'consultant:'+id,kind:'section',
   title:row.title,href:TELEGRAM_SITE+row.href};
}
export function composeTelegramSecretaryAnswer(query,services=[]){
 if(query?.kind==='safety')
  return {handled:true,text:LOCALE_TEXT[query.locale].safety,buttons:[],kind:'safety',modelUsed:false};
 if(query?.kind!=='catalog'||!LOCALES.has(query.locale))return null;
 const l=query.locale,t=LOCALE_TEXT[l],p=query.category;
 const entries=[];
 const add=item=>{if(item&&!entries.some(x=>x.id===item.id))entries.push(item);};
 const consultant=query.consultantDecision;
 // The client has not described a goal: ask ONE question, not sell random
 // catalogue items or push the diagnostic flow.
 if(query.otherCurrencyCap){
   const explain={
     ru:'Вы указали бюджет в другой валюте. Я не перевожу CAD/USD в евро автоматически. Уточните, пожалуйста, бюджет в евро или выберите бесплатный вариант.',
     en:'Your budget is in a different currency. I cannot automatically convert CAD/USD to euros. Would you give a EUR ceiling or prefer a free option?',
     es:'Tu presupuesto está en otra moneda. No convierto CAD/USD a euros automáticamente. ¿Prefieres indicar un límite en EUR o una opción gratuita?',
   };
   return {handled:true,kind:'clarify',text:explain[l],
     buttons:[],modelUsed:false,sourceRole:query.sourceRole};
 }
 if(consultant?.intent==='choose'&&(!consultant.suggestions?.length)&&
    query.focus==='general'&&!query.named.length&&!Object.values(p).some(Boolean))
   return {handled:true,kind:'clarify',text:consultant.reply,
     buttons:[],modelUsed:false,sourceRole:query.sourceRole};
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
 // First-party Consultant Mind is an authority for its own published paths.
 // Do not substitute unrelated tests if a named live practitioner is absent.
 if(!entries.length&&consultant?.suggestions?.length){
   for(const row of consultant.suggestions){
     if(entries.length>=3)break;
     // A named request is NOT permission to replace Reiki with video,
     // a constellation with a test, or any other different category.
     if(query.named.length&&!query.named.includes(String(row.id||'').replace(/^service:/,'')))continue;
     add(verifiedConsultantLink(row,l));
   }
 }
 if(!entries.length&&query.named.length&&consultant?.intent==='choose'&&
    ['under50','under100','free'].includes(query.preferences?.budget)){
   const boundary={
     ru:'Не вижу подтверждённой услуги этого типа в вашем бюджете. Цена «от» не гарантирует итоговую стоимость. Хотите увеличить предел или уточнить его у мастера?',
     en:'I cannot verify this kind of service within your budget. A “from” price does not guarantee the final fee. Would you change the ceiling or ask a practitioner?',
     es:'No puedo confirmar este tipo de servicio dentro de tu presupuesto. Un precio «desde» no garantiza el costo final. ¿Cambiar el límite o consultar al profesional?',
   };
   return {handled:true,kind:'no_match',text:boundary[l],
     buttons:[],modelUsed:false,sourceRole:query.sourceRole};
 }
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
 const providerPriced=selected.some(s=>s.kind==='service');
 const dynamicIntro={
   ru:'Вот проверенные опубликованные предложения и цены конкретных мастеров:',
   en:'Here are published offers and prices from individual practitioners:',
   es:'Estas son las ofertas y precios publicados de profesionales concretos:',
 };
 const comparisonIntro={
   ru:'Сравните метод, формат и цену: это не гарантия результата.',
   en:'Compare the approach, format and price, not a promised outcome.',
   es:'Compara el método, la modalidad y el precio, sin promesas de resultados.',
 };
 // Never mix the fixed first-party tariff in an advisory reply with a
 // different verified practitioner price displayed below it.
 const adviceText=consultant?.reply&&typeof consultant.reply==='string'
   ?(providerPriced&&['price','choose'].includes(consultant.intent)
      ?dynamicIntro[l]
      :providerPriced&&consultant.intent==='compare'?comparisonIntro[l]
      :consultant.reply):t.intro;
 let text=adviceText+'\n'+lines.join('\n')+'\n'+t.more;
 // No dynamic/untrusted URL appears in the body; only validated first-party
 // links in Telegram inline URL buttons. Limit responses to provider caps.
 if(text.length>580)text=text.slice(0,575).trimEnd()+'…';
 return {handled:true,kind:'catalog',text,buttons:selected.map(s=>({
   text:s.title.slice(0,48),url:s.href,
 })),modelUsed:false,sourceRole:query.sourceRole};
}
