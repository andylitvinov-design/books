// Holistic House Wisdom Retrieval · deterministic, privacy-safe selection.
// No model, network, storage, embeddings, diagnostic inference or hidden client profiling.
export const COACH_WISDOM_VERSION = 'hh-coach-wisdom-v1';
const SUPPORTED = new Set(['ru','en','es']);
const triggers = /(?:афоризм|коан|притч|пословиц|крылат.{0,12}фраз|мудр.{0,12}мысл|aphorism|koan|parable|proverb|wise (?:thought|saying)|quote|wisdom|aforismo|proverbio|refr[aá]n|cita|frase sabia)/iu;
const actions = /(?:подбери|дай|дайте|предложи|предложите|расскажи|расскажите|напомни|приведи|хочу|можно|какую|какой|скажи|хотел(?:а)? бы|give|share|suggest|tell|offer|show|could you|can you|i want|i'd like|would like|dame|cu[eé]ntame|sugiere|comparte|quiero|quisiera|podr[ií]as|sobre|about|про)/iu;
const refusal = /(?:без\s+(?:цитат|афоризм|коан|притч|метафор)|не\s+(?:хочу|нужно|надо|предлагай|говори|используй).{0,35}(?:афоризм|коан|притч|цитат|метафор)|(?:no|without|don't|do not|never)\s+(?:want|use|give|share|need|quotes?|aphorisms?|metaphors?)|(?:sin|no quiero|no uses|sin necesidad de).{0,30}(?:citas?|aforismos?|met[aá]foras?|proverbios?))/iu;
const crisis = /(?:суицид|самоубийств|покончить с собой|убить себя|навредить себе|не хочу жить|не могу дышать|боль в груди|suicid|kill myself|end my life|self.harm|hurt myself|can't breathe|chest pain|quiero morir|quitarme la vida|no puedo respirar|dolor en el pecho)/iu;
const topics = [
  ['boundaries',/(?:границ|отказ|откаж|отказывать|сказат.{0,9}нет|говорит.{0,9}нет|вина за отказ|boundar|say no|saying no|people.pleas|refus|declin|l[ií]mites|decir no|rechazar|culpa por negar)/iu],
  ['selfworth',/(?:самооцен|самоцен|уверенн|себя недостоин|стыж|стыдно|бо.{0,4}оценк|self.worth|self.esteem|confidence|sham|not good enough|autoestima|val[ií]a|verg[uü]enza)/iu],
  ['relationships',/(?:отношен|любов|близост|партнер|партн[её]р|дружб|одиноч|relationship|partner|friendship|love|lonel|relaci[oó]n|pareja|amistad|soledad)/iu],
  ['stress',/(?:стресс|тревог|перегруз|панику|напряж|нервнич|stress|anxiet|overwhelm|panic|estr[eé]s|ansiedad|agobio)/iu],
  ['courage',/(?:смелост|страх|боюсь|бояться|осмел|выступ|courage|afraid|fear|brave|valor|miedo|atrever)/iu],
  ['work',/(?:работ|карьер|проект|бизнес|начальник|коллег|work|career|business|job|office|trabaj|empleo|negocio)/iu],
  ['change',/(?:перемен|менять|изменить|привычк|change|habit|transition|cambiar|cambio|h[aá]bito)/iu],
  ['uncertainty',/(?:неопредел|не знаю как|сомнени|не уверен|uncertain|doubt|not sure|no s[eé]|incertidumbre|duda)/iu],
  ['inner_critic',/(?:критику.{0,9}себя|ругаю себя|внутренн.{0,9}критик|самообвин|inner critic|self.critic|self.blame|cr[ií]tic[oa] interior|me culpo)/iu],
  ['resources',/(?:сил нет|устал|ресурс|выгор|отдых|поддержк|burnout|exhaust|tired|rest|support|agotad|cansad|descanso|apoyo)/iu],
  ['purpose',/(?:смысл|предназнач|мисси|ценност|purpose|meaning|values|sentido|prop[oó]sito|valores)/iu],
  ['direction',/(?:цель|путь|направлен|решение|выбор|decision|direction|choose|goal|rumbo|meta|decisi[oó]n)/iu],
  ['time',/(?:врем|спеш|срок|дедлайн|time|deadline|schedule|tiempo|plazo)/iu],
  ['anger',/(?:гнев|злост|ярост|anger|rage|ira|rabia)/iu],
  ['action',/(?:действ|сделать шаг|начат|action|start|first step|acci[oó]n|empezar)/iu],
];
const textFor = (row,locale) => row && row['text_'+locale];
const questionFor = (row,locale) => row && row['coach_question_'+locale];
const safeString = (s,min,max) => typeof s==='string' && s.trim().length>=min && s.length<=max &&
  !/[\u0000-\u001f\u007f]/u.test(s.replace(/\n/g,'')); // embedded newlines are allowed in koans

export function classifyWisdomRequest({message='',turns=[],locale='ru'}={}) {
  if(!SUPPORTED.has(locale)||typeof message!=='string'||message.length>1200)return null;
  const current=message.trim();
  if(!current||/^(?:нет|не надо|no|no thanks|no gracias|не хочу|skip|пропусти)[.!\s]*$/iu.test(current)||
    refusal.test(current)||crisis.test(current))return null;
  const prior=Array.isArray(turns)?turns.slice(-10):[];
  const lastAssistant=[...prior].reverse().find(t=>t?.role==='assistant'&&typeof t.content==='string');
  const continuation=lastAssistant && /(?:на какую тему|what topic|which topic|sobre qu[eé] tema)/iu.test(lastAssistant.content);
  const request=triggers.test(current) && actions.test(current);
  if(!request&&!continuation)return null;
  const context=[current,...prior.filter(t=>t?.role==='user'&&typeof t.content==='string')
    .slice(-3).map(t=>t.content)].join(' ').slice(0,2400);
  if(crisis.test(context))return null;
  const topic=topics.find(([,re])=>re.test(current))?.[0] ||
    topics.find(([,re])=>re.test(context))?.[0] || null;
  const preferredType=/(?:коан|притч|koan|parable)/iu.test(current)?'koan':
    /(?:классик|лао|дао дэ|epictet|stoic|confuc|марка аврел|цитат.{0,25}древн)/iu.test(current)
      ?'classical_paraphrase':'aphorism';
  return {topic,preferredType,locale};
}

export function wisdomTopicQuestion(locale='ru') {
  return ({
    ru:'На какую тему вам нужна мудрая мысль: границы, отношения, смелость, работа или что-то другое?',
    en:'What topic would you like a thought on: boundaries, relationships, courage, work, or something else?',
    es:'¿Sobre qué tema quieres una reflexión: límites, relaciones, valentía, trabajo u otro?',
  })[locale]||null;
}

export function selectWisdomRow(rows,{topic,preferredType,locale,turns=[]}={}) {
  if(!SUPPORTED.has(locale)||!topic||!Array.isArray(rows))return null;
  const recent=(Array.isArray(turns)?turns:[]).filter(t=>t?.role==='assistant'&&typeof t.content==='string')
    .slice(-10).map(t=>t.content.toLocaleLowerCase());
  const eligible=rows.filter(row=>{
    if(!row||row.topic!==topic||row.coach_enabled!==true||row.review_status!=='curated')return false;
    if(!['koan','aphorism','classical_paraphrase','proverb','parable'].includes(row.content_type))return false;
    const text=textFor(row,locale),question=questionFor(row,locale);
    if(!safeString(text,20,500)||!safeString(question,10,250))return false;
    if(!['classical_paraphrase','modern_archive','modern_original',
      'source_in_base_catalog','inspired_not_verbatim','modern_editorial'].includes(row.attribution))return false;
    if(row.attribution==='classical_paraphrase' &&
      (!row.source_title||!row.source_locator||!/^https:\/\//.test(row.source_url||'')))return false;
    if(Array.isArray(row.avoid_when)&&row.avoid_when.includes('always'))return false;
    return !recent.some(textPart=>textPart.includes(text.slice(0,Math.min(48,text.length)).toLocaleLowerCase()));
  });
  eligible.sort((a,b)=>{
    const score=row=>(row.content_type===preferredType?5:0)+
      (row.origin==='holistic_editorial'?2:0)+(row.origin==='user_archive'&&preferredType==='koan'?3:0);
    return score(b)-score(a) || String(a.entry_id).localeCompare(String(b.entry_id));
  });
  return eligible[0]||null;
}

export function formatWisdomTurn(row,locale='ru') {
  if(!SUPPORTED.has(locale)||!row)return null;
  const text=textFor(row,locale),question=questionFor(row,locale);
  if(!safeString(text,20,500)||!safeString(question,10,250))return null;
  const archive={ru:'Современная притча из архива Holistic House',en:'Modern parable from the Holistic House archive',
    es:'Parábola moderna del archivo de Holistic House'};
  const authored={ru:'Авторский афоризм Holistic House',en:'Original Holistic House aphorism',
    es:'Aforismo original de Holistic House'};
  const classic={ru:'Современное переложение',en:'Modern paraphrase',es:'Paráfrasis moderna'};
  let byline=archive[locale];
  if(row.attribution==='classical_paraphrase'){
    if(!row.source_title||!row.source_locator||!/^https:\/\//.test(row.source_url||''))return null;
    byline=classic[locale]+': '+row.source_title+' · '+row.source_locator;
  }else if(row.origin==='holistic_editorial')byline=authored[locale];
  else if(row.origin==='existing_library')byline=authored[locale];
  const reflection=text+'\n('+byline+')';
  if(reflection.length+question.length+3>870)return null;
  return {version:COACH_WISDOM_VERSION,mode:'wisdom',method:'reflection',stage:'reflection',
    message:'',reflection,question,hypothesis:'',planSuggestion:'',evidenceQuote:'',
    wisdomEntryId:String(row.entry_id||'').slice(0,100)};
}
