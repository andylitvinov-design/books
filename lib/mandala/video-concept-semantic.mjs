/**
 * Speech/text -> canonical Video Studio creative brief.
 * Local, deterministic and zero-provider. Raw transcript is never stored or sent
 * to a second service. Suggestions are editorial, not evidence of existing MP4.
 */
import {classifyMyTubeRequest} from "./mytube-prompt-classifier.mjs";
import {getMyTubeTopic,listMyTubeScenarios} from "./mytube-content-taxonomy.mjs";
import {listMyTubeMeaningMotifs} from "./mytube-meaning-hierarchy.mjs";
import {getMyTubeStyle} from "./mytube-creative-choices.mjs";

export const VIDEO_CONCEPT_FIELD_LABELS=Object.freeze([
 ["intent","Цель","Goal","Objetivo"],
 ["purpose","Назначение","Purpose","Finalidad"],
 ["audience","Для кого","Audience","Destinatario"],
 ["categoryId","Категория","Category","Categoría"],
 ["subcategoryId","Подкатегория","Subcategory","Subcategoría"],
 ["topicId","Тема","Topic","Tema"],
 ["situation","Контекст","Context","Contexto"],
 ["currentState","Сейчас","Current state","Estado actual"],
 ["desiredState","Хочу","Desired state","Estado deseado"],
 ["meaningAxisId","Смысл","Meaning","Sentido"],
 ["mainMessage","Главная идея","Main message","Idea central"],
 ["motifId","Символ","Symbol","Símbolo"],
 ["scenarioId","Сценарий","Scenario","Guion"],
 ["plotMode","Тип сюжета","Plot mode","Tipo de trama"],
 ["archetype","Архетип","Archetype","Arquetipo"],
 ["beats","Четыре эпизода","Four beats","Cuatro episodios"],
 ["hook","Начало","Opening","Inicio"],
 ["centralAction","Ключевое событие","Central action","Acción central"],
 ["endingIntent","Итог","Ending","Final"],
 ["transitionPath","Эмоциональный переход","Emotional transition","Transición emocional"],
 ["startingTone","Начальное настроение","Opening tone","Tono inicial"],
 ["endingTone","Финальное настроение","Ending tone","Tono final"],
 ["intensity","Интенсивность","Intensity","Intensidad"],
 ["pace","Темп","Pace","Ritmo"],
 ["emotionalProgram","Эмоциональная программа","Emotional arc","Programa emocional"],
 ["method","Метод","Method","Método"],
 ["voiceTone","Тон голоса","Voice tone","Tono de voz"],
 ["styleId","Визуальный стиль","Visual style","Estilo visual"],
 ["visualWorld","Пространство и свет","Visual world","Espacio y luz"],
 ["characterAndPOV","Герой и ракурс","Character and POV","Personaje y punto de vista"],
 ["visualActions","Визуальные действия","Visual actions","Acciones visuales"],
 ["avoidImagery","Не показывать","Avoid imagery","Evitar imágenes"],
 ["references","Материалы","References","Referencias"],
 ["delivery","Формат, язык, длительность","Delivery","Formato, idioma y duración"],
 ["wordsAndVoice","Текст и голос","Words and voice","Texto y voz"],
 ["soundtrack","Музыка","Soundtrack","Música"],
 ["timelineBinding","Монтажный план","Timeline","Montaje"],
 ["creationMode","Режим создания","Creation mode","Modo de creación"],
].map(([id,ru,en,es])=>Object.freeze({id,ru,en,es})));
// Only details that affect the creative brief appear under the compact review.
// The older 38-field wire schema remains readable for existing consumers and drafts.
// Editor-owned audio, music, export and source verification are reviewed in Montage.
export const VIDEO_CONCEPT_REVIEW_FIELD_IDS=Object.freeze([
 "purpose","audience","situation","currentState","desiredState","plotMode",
 "archetype","hook","centralAction","endingIntent","intensity","pace",
 "method","voiceTone","visualWorld","characterAndPOV","avoidImagery"
]);
const LANG=new Set(["ru","en","es"]);
const localeOf=x=>LANG.has(x)?x:"ru";
const clean=(v,max=180)=>String(v??"").normalize("NFKC")
 .replace(/[\u0000-\u001f\u007f<>]/gu," ").replace(/\s+/gu," ").trim().slice(0,max);
const lower=v=>clean(v,10000).toLocaleLowerCase().replace(/ё/g,"е");
const safeSegments=wire=>Array.isArray(wire?.segments)?wire.segments.filter(s=>
 s&&typeof s.text==="string"&&Number.isFinite(s.startSeconds)&&
 Number.isFinite(s.endSeconds)&&s.endSeconds>s.startSeconds).slice(0,240):[];
const NEGATIVE=[
 ["water",/(?:без|не показывай|исключи|without|avoid|no|sin|evita)\s+(?:\S+\s+){0,2}(?:вод[ыуеы]|мор[ея]|океан|водопад|water|sea|ocean|river|agua|mar|oc[eé]ano)/iu],
 ["forest",/(?:без|не показывай|исключи|without|avoid|no|sin|evita)\s+(?:\S+\s+){0,2}(?:лес[а-я]*|forest|woods|bosque)/iu],
 ["mountain",/(?:без|не показывай|исключи|without|avoid|no|sin|evita)\s+(?:\S+\s+){0,2}(?:гор[уыае]|вершин|mountain|monta[nñ]a)/iu],
 ["dark",/(?:без|не показывай|исключи|without|avoid|no|sin|evita)\s+(?:\S+\s+){0,2}(?:темнот|мрак|dark|darkness|oscuridad)/iu],
 ["flashing",/(?:без|никаких|не показывай|не надо|не нужно|исключи|without|avoid|no|sin|evita)\s+(?:\S+\s+){0,2}(?:миган|мерцани|вспыш|flashing|flicker|destellos|parpadeo)/iu],
];
const PURPOSES=[
 ["celebration",/поздрав|с днем рожд|день рожд|юбиле|праздник|birthday|congratulat|anniversary|felicita|cumplea[nñ]os|celebrat/iu],
 ["presentation",/презентац|продукт|услуг|бизнес.план|presentation|showcase|pitch|\bproduct\b|\bservice(?:s)?\b|presentaci[oó]n|producto|servicio/iu],
 ["practice",/медитац|расслаблен|практик|релакс|meditat|relax|mindful|meditaci[oó]n|relajaci[oó]n/iu],
 ["personal_support",/мне|я хочу|для себя|i want|for myself|quiero|para m[ií]/iu]
];
// Only a direct recipient instruction identifies the audience. Merely mentioning
// a relative or seeing unrelated Idea phrases is NOT permission to infer one.
const AUDIENCES=[
 ["family",/(?:для|поздрав(?:ить|ления?)|подарок\s+для)\s+(?:моей?\s+)?(?:мам[ыуе]|пап[ыуе]|семьи|родител[ейям]+|сестр[ыуе]|брат[ау]?)(?=\W|$)|\b(?:for|to)\s+(?:my\s+|our\s+)?(?:mother|mom|mum|father|dad|parents|family|sister|brother)\b|\bpara\s+(?:mi\s+|mis\s+)?(?:madre|mam[aá]|padre|familia|herman[oa])\b/iu],
 ["partner",/(?:для|поздрав(?:ить|ления?))\s+(?:моей?\s+)?(?:любим(?:ого|ой)|жены|мужа|партн[её]ра)|\b(?:for|to)\s+(?:my\s+)?(?:partner|spouse|boyfriend|girlfriend)\b|\bpara\s+mi\s+(?:pareja|espos[ao])\b/iu],
 ["client",/(?:для|к)\s+(?:наших?\s+)?(?:клиент(?:ов|ам)|покупател(?:ей|ям)|заказчик(?:ов|ам))|\b(?:for|to)\s+(?:our\s+|my\s+|the\s+)?(?:clients?|customers?|buyers?)\b|\bpara\s+(?:mis\s+|los\s+)?clientes\b/iu],
 ["public",/(?:для|обращение\s+к)\s+(?:зрител[ейям]+|подписчик(?:ов|ам)|аудитории)|\bfor\s+(?:the\s+)?(?:viewers|subscribers|public|audience)\b|\bpara\s+(?:el\s+)?p[uú]blico\b/iu]
];
const MEANINGS=[
 ["connection",/любов|семь|близост|поблагодар|благодарност|забот|помощ|вместе|\b(?:love|family|gratitude|thank|care|together)\b|amor|familia|gracias|cari[nñ]o/iu],
 ["anchor",/тревог|страх|паник|неопредел|неизвестн|беспричин|спокойств|опор|безопасн|стабильност|устойчив|\b(?:anxiety|anxious|fear|panic|uncertainty|worry|calm|support|safe|steady|stable)\b|ansiedad|miedo|incertidumbre|tranquil|seren|segurid|apoyo/iu],
 ["freedom",/свобод|освобод|выбор|freedom|choice|libertad|elecci[oó]n/iu],
 ["agency",/действ|сил[ау]|достиж|решени|уверен|action|power|strength|confidence|decision|acci[oó]n|fuerza|decisi[oó]n/iu],
 ["dignity",/уважен|принят|достоин|ценност|respect|accept|worth|dignity|respeto|acept|dignidad/iu],
 ["wholeness",/целост|единств|воссоедин|whole|integrat|unity|integridad|unidad/iu],
 ["meaning",/смысл|предназнач|призвани|purpose|meaning|prop[oó]sito|sentido/iu],
 ["growth",/развит|рост|новый этап|growth|progress|develop|crecer|desarroll|progres/iu]
];
const STYLES=[
 ["sacred",/храм|ритуал|священ|temple|ritual|sacred|templo|sagrado/iu],
 ["cosmic",/космос|звезд|вселенн|cosmos|space|galaxy|stars|cosmic|galaxia|estrellas/iu],
 ["urban",/город|офис|урбан|city|urban|office|ciudad|urbano|oficina/iu],
 ["cinematic",/кинематограф|эпич|как фильм|cinematic|movie style|film look|cinematogr[aá]fic/iu],
 ["meditative",/медитац|мягк|плавн|тихий|спокойн|meditat|gentle|slow|relax|calm|tranquil|meditaci[oó]n|suave|seren/iu],
 ["symbolic",/символ|метафор|аллегор|symbolic|metaphor|s[ií]mbolo|met[aá]fora/iu],
 ["minimal",/минимал|лаконич|minimal|simple|clean|sencill/iu],
 ["realistic",/реалист|документ|обычн|realistic|documentary|realista|documental/iu],
 ["nature",/лес|сад|дерев|природ|луга|forest|garden|nature|flowers|bosque|jard[ií]n|naturaleza/iu],
 ["abstract",/абстракт|геометр|abstract|geometry|abstracto|geometr[ií]a/iu]
];
const MOTIFS=[
 ["garden",/сад|garden|jard[ií]n/iu],
 ["rose",/роза|rose|rosa/iu],
 ["flower",/цветок|цветы|flower|flor/iu],
 ["house",/дом|home|house|casa/iu],
 ["nest",/гнезд|nest|nido/iu],
 ["bridge",/мост|bridge|puente/iu],
 ["tree",/дерев|tree|[aá]rbol/iu],
 ["sun",/солнц|sun\b|sol\b/iu],
 ["sunrise",/рассвет|sunrise|amanecer/iu],
 ["key",/ключ|key|llave/iu],
 ["path",/тропа|путь|path|trail|sendero/iu],
 ["mountain",/гор[ауеы]|mountain|monta[nñ]a/iu],
 ["stream",/руч[её]й|river|stream|arroyo|r[ií]o/iu],
 ["stars",/звезд|stars|estrellas/iu],
 ["hands",/ладон|руки|hands|manos/iu],
 ["horizon",/горизонт|horizon|horizonte/iu]
];
const hasPositive=(rx,text)=>rx.test(text);
// Negation scopes include coordinated objects, e.g. "без леса и воды".
const NEGATED_TERMS={
 water:/вод|мор[яеу]|океан|water|sea\b|ocean|river|agua|mar\b|oc[eé]ano/iu,
 forest:/лес|forest|woods|bosque/iu,
 mountain:/гор[а-я]*|вершин|mountain|monta[nñ]a/iu,
 dark:/темнот|мрак|dark|oscur|night/iu,
 flashing:/миган|мерц|вспыш|flashing|flicker|destellos|parpadeo/iu,
};
const excluded=raw=>{
 const scopes=[...raw.matchAll(/(?:без|никаких|не показывай|не надо|не нужно|исключи|without|avoid|no|sin|evita)\s+([^.,;!?]{1,110})/giu)]
  .map(m=>m[1].split(/\s+(?:но|вместо|instead|but|pero)\s+/iu)[0]);
 return NEGATIVE.filter(([id,rx])=>rx.test(raw)||scopes.some(x=>NEGATED_TERMS[id]?.test(x)))
  .map(([id])=>id);
};
const omitted=(id,avoid)=>avoid.includes(id)||id==="stream"&&avoid.includes("water")||
 id==="mountain"&&avoid.includes("mountain");
function extractSpeechBeats(wire,raw){
 const seg=safeSegments(wire),duration=Number(wire?.durationSeconds);
 if(seg.length>=4&&Number.isFinite(duration)&&duration>0){
  const parts=Array.from({length:4},()=>[]);
  for(const item of seg){
   const midpoint=(item.startSeconds+item.endSeconds)/2;
   const bucket=Math.min(3,Math.floor(4*midpoint/duration));
   parts[bucket].push(clean(item.text,200));
  }
  if(parts.every(x=>x.length))return parts.map(x=>clean(x.join(" "),158));
 }
 const sentences=raw.split(/(?<=[.!?。])\s+/u).map(x=>clean(x,240)).filter(x=>x.length>8);
 if(sentences.length>=4){
  const parts=Array.from({length:4},()=>[]);
  sentences.forEach((s,i)=>parts[Math.min(3,Math.floor(i*4/sentences.length))].push(s));
  if(parts.every(x=>x.length))return parts.map(x=>clean(x.join(" "),158));
 }
 const words=raw.split(/\s+/u).filter(Boolean);
 if(words.length>=24){
  return Array.from({length:4},(_,i)=>
   clean(words.slice(Math.floor(i*words.length/4),Math.floor((i+1)*words.length/4)).join(" "),158));
 }
 return null;
}
const matched=(text,rows)=>rows.find(([,rx])=>hasPositive(rx,text))?.[0]||null;
// The user's stated subject is different from the system's editorial suggestions.
const ANXIETY_CONTEXT=/тревог|страх|паник|беспричин|непонятн(?:ая|ой|ой\s+причин)|\b(?:anxiet(?:y|ies)|anxious|panic|fear|worry|worried|worries|uncertainty|unease|uneasy)\b|ansiedad|miedo|inquietud|incertidumbre/iu;
const PROBLEM_FRAMING=Object.freeze({
 "anxiety-no-reason":{
  en:"Find more steadiness when anxiety has no clear cause",
  ru:"Найти больше спокойствия и опоры, когда тревога возникает без ясной причины",
  es:"Encontrar más calma y estabilidad cuando la ansiedad no tiene una causa clara"
 },
 "constant-anxiety":{
  en:"Build moments of calm and stability amid persistent anxiety",
  ru:"Находить моменты спокойствия и устойчивости при постоянной тревоге",
  es:"Encontrar momentos de calma y estabilidad frente a la ansiedad persistente"
 }
});
// A catalogue problem is context, never the positive outcome of a film.
// The original selection remains in topicId and in the unchanged input signature.
const CREATIVE_PATHS=Object.freeze({
 anxiety:{
  ru:{message:"Искать внутреннюю опору, даже если причина тревоги пока неясна",
   arc:["Замечать неопределённость","Найти точку опоры","Расширить пространство выбора","Завершить без требования всё объяснить"],
   beats:["Замечаем тревогу, не пытаясь сразу объяснить её","Мягкий устойчивый свет и спокойное защищённое пространство","Взгляд открывается к более широкому горизонту","Появляется возможность немного замедлиться и завершить"]},
  en:{message:"Finding steadiness even when the cause of anxiety is unclear",
   arc:["Notice uncertainty","Find a point of support","Allow a wider perspective","Close without forcing an answer"],
   beats:["Notice uncertainty without demanding an explanation","Gentle steady light and a sheltered space","The view opens gradually toward a wider horizon","An unhurried ending leaves room for choice"]},
  es:{message:"Encontrar apoyo aunque no esté clara la causa de la ansiedad",
   arc:["Reconocer la incertidumbre","Encontrar apoyo","Ampliar la perspectiva","Cerrar sin exigir respuestas"],
   beats:["Reconocer la inquietud sin forzar explicaciones","Luz suave y un espacio tranquilo y protegido","La mirada se abre hacia un horizonte más amplio","Un cierre sereno que deja espacio para elegir"]}
 },
 anchor:{
  ru:{message:"Постепенно находить доступную опору",arc:["Признать состояние","Найти опору","Сделать мягкий шаг","Сохранить пространство для себя"]},
  en:{message:"Finding a little more steadiness, one step at a time",arc:["Acknowledge the moment","Find support","Try a gentle step","Keep room for yourself"]},
  es:{message:"Encontrar un poco más de estabilidad, paso a paso",arc:["Reconocer el momento","Encontrar apoyo","Dar un paso suave","Conservar el espacio propio"]}
 },
 connection:{
  ru:{message:"Укреплять связь с уважением к границам",arc:["Замечать потребность","Открыться контакту","Уважать границы","Завершить с теплом"]},
  en:{message:"Making room for connection with boundaries and choice",arc:["Notice the need","Invite connection","Respect boundaries","Close with warmth"]},
  es:{message:"Dar espacio al vínculo respetando los límites",arc:["Reconocer la necesidad","Invitar al vínculo","Respetar límites","Cerrar con calidez"]}
 },
 agency:{
  ru:{message:"Двигаться к посильному действию без давления",arc:["Признать точку старта","Найти ресурс","Выбрать небольшой шаг","Признать сделанное"]},
  en:{message:"Making space for one possible step without pressure",arc:["Notice the starting point","Find a resource","Choose a small step","Acknowledge progress"]},
  es:{message:"Abrir camino a un paso posible sin presión",arc:["Reconocer el inicio","Encontrar un recurso","Elegir un pequeño paso","Reconocer el avance"]}
 }
});
// Real-world income stories should feel active, not like a slow grounding exercise.
const INCOME_GROWTH_PATH=Object.freeze({
 ru:{message:"Увидеть новые возможности роста дохода и действовать увереннее",
  arc:["Пробуждение интереса","Новые возможности","Конкретное действие","Уверенность и развитие"],
  beats:["Человек выходит из усталости, оживлённый городской рабочий ритм",
   "Знакомство с новыми идеями: команда обсуждает варианты, рабочие детали крупным планом",
   "Планирование и действие: проект, встреча, навык, первые проверяемые шаги",
   "Ясный взгляд вперёд, энергия и удовлетворение от движения к финансовым целям"]},
 en:{message:"Explore new ways to grow income through confidence and purposeful action",
  arc:["Spark of possibility","Discover opportunities","Take purposeful action","Confidence and growth"],
  beats:["From a tired moment to an active city and real workday",
   "Fresh ideas: real people exchanging plans and exploring opportunities",
   "Planning and action: developing skills, collaborating and testing a next step",
   "A confident forward-looking finish with energy and a sense of progress"]},
 es:{message:"Explorar oportunidades para aumentar ingresos con confianza y acción",
  arc:["Despertar posibilidades","Descubrir oportunidades","Actuar con propósito","Confianza y crecimiento"],
  beats:["Del cansancio a una ciudad activa y una jornada de trabajo real",
   "Nuevas ideas: personas colaborando y descubriendo oportunidades",
   "Planificación y acción: desarrollar habilidades y dar un paso concreto",
   "Un cierre seguro y enérgico, con sensación de avance"]}
});
const INCOME_GROWTH_WORLD=Object.freeze({
 ru:"Реальные видеокадры: рабочие пространства, команда, проекты, деловая среда и движение; без нарисованной графики",
 en:"Real-life footage: workspaces, people collaborating, projects, active urban business scenes; no drawn slides",
 es:"Vídeos reales: espacios de trabajo, equipos, proyectos y actividad profesional urbana; sin diapositivas dibujadas"
});
const chooseCreativePath=(locale,meaning,anxiety)=>anxiety?CREATIVE_PATHS.anxiety[locale]:
 (CREATIVE_PATHS[meaning]||CREATIVE_PATHS.anchor)[locale];
// A confirmed personal transition outranks an unrelated generic Anchor caption.
const CONCEPT_WORDS={
 ru:{from:{fatigue:"усталости",tension:"напряжения",overwhelmed:"перегрузки",sadness:"грусти",uncertain:"неопределённости",irritated:"раздражения",loneliness:"одиночества",afraid:"страха"},
  to:{safe:"безопасности",energetic:"энергии",connected:"контакту",calm:"спокойствию",confident:"уверенности",joyful:"радости",balanced:"равновесию"},
  focus:{connection:"контакт",freedom:"свободу",dignity:"достоинство",support:"поддержку",agency:"самостоятельность",wholeness:"целостность",meaning:"смысл",growth:"развитие"}},
 en:{from:{fatigue:"tiredness",tension:"tension",overwhelmed:"overwhelm",sadness:"sadness",uncertain:"uncertainty",irritated:"irritation",loneliness:"loneliness",afraid:"fear"},
  to:{safe:"safety",energetic:"renewed energy",connected:"connection",calm:"calm",confident:"confidence",joyful:"joy",balanced:"balance"},
  focus:{connection:"connection",freedom:"freedom",dignity:"dignity",support:"support",agency:"agency",wholeness:"wholeness",meaning:"meaning",growth:"growth"}},
 es:{from:{fatigue:"el cansancio",tension:"la tensión",overwhelmed:"la sobrecarga",sadness:"la tristeza",uncertain:"la incertidumbre",irritated:"la irritación",loneliness:"la soledad",afraid:"el miedo"},
  to:{safe:"la seguridad",energetic:"la energía renovada",connected:"la conexión",calm:"la calma",confident:"la confianza",joyful:"la alegría",balanced:"el equilibrio"},
  focus:{connection:"la conexión",freedom:"la libertad",dignity:"la dignidad",support:"el apoyo",agency:"la autonomía",wholeness:"la integridad",meaning:"el sentido",growth:"el crecimiento"}}
};
const linkWords=(list,locale)=>list.length<2?list[0]||"":
 list.slice(0,-1).join(", ")+(locale==="ru"?" и ":locale==="es"?" y ":" and ")+list.at(-1);
function personalizedHeadline(locale,profile){
 const data=CONCEPT_WORDS[locale];
 const currentIds=Array.isArray(profile?.currentIds)?profile.currentIds.slice(0,3):[];
 const desiredIds=Array.isArray(profile?.desiredIds)?profile.desiredIds.slice(0,3):[];
 const focusIds=Array.isArray(profile?.focusIds)?profile.focusIds.slice(0,3):[];
 const fromLabels=clean(profile?.currentState,150).split(/\s*·\s*/);
 const toLabels=clean(profile?.desiredState,150).split(/\s*·\s*/);
 const a=currentIds.map((id,i)=>data.from[id]||fromLabels[i]?.toLocaleLowerCase()).filter(Boolean);
 const b=desiredIds.map((id,i)=>data.to[id]||toLabels[i]?.toLocaleLowerCase()).filter(Boolean);
 if(!a.length||!b.length)return null;
 const f=focusIds.filter(id=>!(id==="connection"&&desiredIds.includes("connected")))
  .map(id=>data.focus[id]).filter(Boolean);
 const now=linkWords(a,locale),toward=linkWords(b,locale),focus=linkWords(f,locale);
 if(locale==="ru")return clean("От "+now+" — к "+toward+(focus?", сохраняя "+focus:""),240);
 if(locale==="es")return clean("Desde "+now+" hacia "+toward+(focus?", dejando espacio para "+focus:""),240);
 return clean("From "+now+" toward "+toward+(focus?" — with room for "+focus:""),240);
}
const PERSONAL_STORY={
 ru:{arc:["Признать перегрузку","Найти пространство безопасности","Открыться контакту","Сохранить свободу выбора"],
  beats:["Реальная повседневность: напряжённый ритм, жесты и детали","Пауза и немного больше света без давления","Уважительный контакт и самостоятельный небольшой шаг","Более открытое пространство и достоинство в финале"]},
 en:{arc:["Name the overload","Find room for safety","Allow respectful contact","Preserve choice"],
  beats:["Real-world details of a busy rhythm and tiredness","A pause and brighter space without pressure","Respectful contact and one self-directed small step","An open ending that leaves room for dignity and choice"]},
 es:{arc:["Reconocer la sobrecarga","Abrir espacio seguro","Permitir contacto respetuoso","Conservar la libertad de elegir"],
  beats:["Detalles de la vida real y del cansancio cotidiano","Una pausa y más luz, sin presión","Contacto respetuoso y un paso elegido","Un final abierto con dignidad y libertad"]}
};

const PURPOSE_MESSAGE={
 celebration:{
  ru:"Тёплое поздравление, в котором есть место благодарности и добрым пожеланиям",
  en:"A warm greeting that makes space for gratitude and good wishes",
  es:"Una felicitación cálida con gratitud y buenos deseos"},
 presentation:{
  ru:"Ясно показать, чем полезно предложение, не обещая невозможного",
  en:"Presenting the value of the offer clearly without exaggerated promises",
  es:"Presentar el valor de la propuesta con claridad y sin promesas exageradas"},
 practice:{
  ru:"Мягкое приглашение замедлиться и заметить доступную опору",
  en:"A gentle invitation to slow down and notice available support",
  es:"Una invitación suave a reducir el ritmo y encontrar apoyo"}
};
const firstSentence=raw=>clean(raw.split(/[.!?。](?:\s|$)/u)[0]||raw,170);
const currentDesired=(raw,kind)=>{
 const rx=kind==="current"?/(?:сейчас|пока|сегодня|currently|now|ahora)\s*[:\-–]?\s*([^.!?]{6,130})/iu:
  /(?:хочу|мечтаю|пожелаю|желаю|i want|i hope|quisiera|quiero|deseo)\s+([^.!?]{6,130})/iu;
 return clean(raw.match(rx)?.[1],125)||null;
};
function pickTopic(raw,original,purpose,locale){
 const forced=purpose==="celebration"?"family-relationships":
  purpose==="presentation"?"entrepreneurship":null;
 // A direct presentation / greeting is not a diagnosis. Prefer the
 // established content taxonomy only where a category really fits.
 if(forced&&getMyTubeTopic(forced))return {id:forced,confidence:"medium",reason:"content_purpose"};
 const prediction=classifyMyTubeRequest(raw,locale);
 return prediction&&prediction.confidence!=="low"&&getMyTubeTopic(prediction.topicId)?
  {id:prediction.topicId,confidence:prediction.confidence,reason:"taxonomy_classifier"}:
  {id:original.topicId,confidence:"low",reason:"editorial_fallback"};
}
const status=(value,source)=>value==null||value===""?"unknown":
 source==="owner"?"synchronized":
 source==="speech"||source==="goal"||source==="personalization"?"extracted":"suggested";
function fieldMap(){
 return Object.fromEntries(VIDEO_CONCEPT_FIELD_LABELS.map(row=>[
  row.id,{value:null,status:"unknown",source:"unavailable"}
 ]));
}
const put=(record,id,value,source="editorial")=>{
 record[id]={value:value??null,status:status(value,source),source};
};
/**
 * @param {object} draft Existing, valid canonical concept proposal.
 * @param {{locale?:string,goal?:string,phrases?:string[],speechTranscript?:object|null,theme?:string,personalization?:{currentState?:string,desiredState?:string,focus?:string,currentIds?:string[],desiredIds?:string[],focusIds?:string[],energyStart?:number,energyTarget?:number}|null,selectedTopicId?:string|null,creativeBrief?:string|null}} input
 */
export function enrichVideoConcept(draft,{locale="ru",goal="",phrases=[],speechTranscript=null,personalization=null,selectedTopicId=null,creativeBrief=null}={}){
 const l=localeOf(locale),audio=clean(speechTranscript?.text,10000);
 const plainGoal=clean(goal,800);
 const phraseText=Array.isArray(phrases)?phrases.filter(x=>typeof x==="string")
  .slice(0,6).map(x=>clean(x,180)).join(" "):"";
 // Phrases are optional editorial prompts, never evidence for audience,
 // relationships, symptoms or personal biography.
 // An optional free-text brief refines tone; it cannot override a confirmed taxonomy ID.
 const raw=audio||clean(creativeBrief,800)||plainGoal||clean(phraseText,1200),low=lower(raw);
 if(!raw)return {...draft,parameters:fieldMap(),semanticConfidence:"low",
   semanticPurpose:null,semanticAudience:null,avoidImagery:[],speechBeatsSource:"none"};
 // A one-word theme does not establish a personal problem or intended recipient.
 const purpose=matched(low,PURPOSES)||(audio?"audio_visual":"reflection");
 const audience=matched(low,AUDIENCES);
 const selected=getMyTubeTopic(selectedTopicId);
 const topicChoice=selected?{id:selectedTopicId,confidence:"explicit",reason:"user_selection"}:
  pickTopic(raw,draft,purpose,l);
 const topic=getMyTubeTopic(topicChoice.id);
 const desiredIds=Array.isArray(personalization?.desiredIds)?personalization.desiredIds:[];
 const focusIds=Array.isArray(personalization?.focusIds)?personalization.focusIds:[];
 const startEnergy=Number.isFinite(personalization?.energyStart)?Number(personalization.energyStart):null;
 const targetEnergy=Number.isFinite(personalization?.energyTarget)?Number(personalization.energyTarget):null;
 const explicitSlow=purpose==="practice"||
   /(?:медленн(?:ый|ое|о)|расслабляющ|slow.paced|slow tempo|meditation|meditaci[oó]n|tranquilo)/iu.test(low);
 const energizing=desiredIds.some(id=>["energetic","joyful","inspired","playful"].includes(id))||
   (desiredIds.includes("confident")&&focusIds.includes("growth"));
 const dynamic=energizing&&!explicitSlow;
 const energeticIncome=dynamic&&topicChoice.id==="income-growth";
 const anxiety=ANXIETY_CONTEXT.test(low);
 // A request about anxiety is not automatically a story about family, even if
 // the suggested Idea phrases happen to mention a relationship.
 const meaningId=anxiety&&!energeticIncome?"anchor":
  energeticIncome&&focusIds.includes("freedom")?"freedom":
  focusIds.includes("growth")?"growth":
  focusIds.includes("freedom")?"freedom":
  matched(low,MEANINGS)||(
  purpose==="celebration"?"connection":purpose==="presentation"?"agency":draft.meaningAxisId);
 const axes=new Set(["anchor","connection","freedom","agency","dignity","wholeness","meaning","growth"]);
 const chosenMeaning=axes.has(meaningId)?meaningId:"anchor";
 const avoid=excluded(low);
 const validMotifs=listMyTubeMeaningMotifs(topicChoice.id,chosenMeaning,l)
  .filter(m=>!omitted(m.id,avoid));
 const explicit=matched(low,MOTIFS);
 // For uncertainty, a safe-shelter motif belongs to the verified Anchor axis.
 // A categorical default "bridge" wrongly implies interpersonal causes.
 const preferredMotif=energeticIncome&&chosenMeaning==="freedom"?"key":
  explicit||(anxiety&&chosenMeaning==="anchor"?"nest":purpose==="celebration"?"flower":null);
 const motif=validMotifs.find(m=>m.id===preferredMotif)||validMotifs[0]||
  listMyTubeMeaningMotifs(topicChoice.id,chosenMeaning,l)[0];
 let preferredStyle=matched(low,STYLES);
 // Do not interpret a negative visual instruction as a positive style request.
 if(preferredStyle==="nature"&&avoid.includes("forest")&&
   !/природ|сад|дерев|луг|nature|garden|jard[ií]n|naturaleza/iu.test(low))
   preferredStyle=null;
 const styleId=preferredStyle&&getMyTubeStyle(preferredStyle)?
  preferredStyle:energeticIncome?"cinematic":draft.styleId;
 const scenarios=listMyTubeScenarios(topicChoice.id,l);
 const targetArchetype=purpose==="celebration"?"integration":
  purpose==="practice"?"shelter":purpose==="presentation"?"journey":null;
 const scenario=scenarios.find(s=>s.archetype===targetArchetype)||scenarios[0];
 const realBeats=audio?extractSpeechBeats(speechTranscript,audio):null;
 const personalIdea=!audio&&!anxiety&&!energeticIncome&&purpose!=="presentation"&&purpose!=="celebration"
  ?personalizedHeadline(l,personalization):null;
 const creative=energeticIncome?INCOME_GROWTH_PATH[l]:
  personalIdea?PERSONAL_STORY[l]:chooseCreativePath(l,chosenMeaning,anxiety);
 const sceneOutline=realBeats||creative.beats||scenario.sceneOutline;
 const sourceSentence=firstSentence(audio||plainGoal||raw);
 const message=personalIdea||(energeticIncome?creative.message:
  anxiety?creative.message:PURPOSE_MESSAGE[purpose]?.[l]||creative.message);
 const emotionalProgram=purpose==="celebration"?
  ({ru:["Тёплое обращение","Благодарность","Радость встречи","Доброе пожелание"],
    en:["Warm opening","Gratitude","Shared joy","Kind wish"],
    es:["Apertura cálida","Gratitud","Alegría compartida","Buenos deseos"]})[l]:
  purpose==="presentation"?
  ({ru:["Интерес","Контекст","Ценность","Ясный вывод"],
    en:["Interest","Context","Value","Clear ending"],
    es:["Interés","Contexto","Valor","Cierre claro"]})[l]:
  creative.arc;
 const framedGoal=PROBLEM_FRAMING[topicChoice.id]?.[l]||null;
 const result={...draft,
  source:audio?"audio_transcript":draft.source,
  goal:framedGoal||(topicChoice.confidence==="explicit"?draft.goal:
   clean(audio?sourceSentence:plainGoal||sourceSentence,240)||draft.goal),
  categoryId:topic.category.id,subcategoryId:topic.subcategory.id,topicId:topic.topic.id,
  meaningAxisId:chosenMeaning,motifId:motif?.id||draft.motifId,
  scenarioId:scenario.id,styleId,mainMessage:message||draft.mainMessage,
  sceneOutline:[...sceneOutline],emotionalProgram:[...emotionalProgram],
  hasPersonalInput:Boolean(audio||plainGoal||phraseText),
  inferredTopic:topicChoice.reason!=="editorial_fallback",
  semanticConfidence:topicChoice.confidence,
  semanticPurpose:purpose,semanticAudience:audience,
  avoidImagery:avoid,speechBeatsSource:realBeats?"transcript":"editorial_scenario",
  personalizationFocus:clean(personalization?.focus,190)||null,
  energyStart:startEnergy,energyTarget:targetEnergy,
 };
 // The draft signature is still tied to the user's input. No raw transcript
 // leaves ephemeral client state, nor is it written into a settings draft.
 const p=fieldMap();
 put(p,"intent",result.goal,framedGoal?"editorial":audio?"speech":plainGoal?"goal":"editorial");
 put(p,"purpose",purpose,"editorial");
 put(p,"audience",audience,audience?(audio?"speech":plainGoal?"goal":"editorial"):"unavailable");
 put(p,"categoryId",result.categoryId,"editorial");
 put(p,"subcategoryId",result.subcategoryId,"editorial");
 put(p,"topicId",result.topicId,"editorial");
 put(p,"situation",audio?firstSentence(audio):framedGoal?topic.topic.label[l]:null,
   audio?"speech":framedGoal?"goal":"editorial");
 const explicitCurrent=currentDesired(raw,"current");
 const explicitDesired=currentDesired(raw,"desired");
 const current=explicitCurrent||clean(personalization?.currentState,180)||null;
 const desired=explicitDesired||clean(personalization?.desiredState,180)||null;
 put(p,"currentState",current,explicitCurrent?(audio?"speech":"goal"):"personalization");
 put(p,"desiredState",desired,explicitDesired?(audio?"speech":"goal"):"personalization");
 put(p,"meaningAxisId",result.meaningAxisId,"editorial");
 put(p,"mainMessage",result.mainMessage,"editorial");
 put(p,"motifId",result.motifId,"editorial");
 put(p,"scenarioId",result.scenarioId,"editorial");
 put(p,"plotMode",energeticIncome?"grounded_dilemma":
  purpose==="celebration"?"relational_mirror":
  purpose==="presentation"?"grounded_dilemma":"symbolic_quest","editorial");
 put(p,"archetype",scenario.archetype,"editorial");
 put(p,"beats",result.sceneOutline,audio&&realBeats?"speech":"editorial");
 put(p,"hook",result.sceneOutline[0],"editorial");
 put(p,"centralAction",result.sceneOutline[2],"editorial");
 put(p,"endingIntent",result.sceneOutline[3],"editorial");
 put(p,"transitionPath",dynamic?"rising":purpose==="practice"?"gentle":
  purpose==="celebration"?"warmth":"steady","editorial");
 put(p,"startingTone",emotionalProgram[0],"editorial");
 put(p,"endingTone",emotionalProgram[3],"editorial");
 put(p,"intensity",dynamic?(targetEnergy!==null&&targetEnergy>=8?"energetic":"uplifting"):
  purpose==="practice"?"gentle":"balanced","editorial");
 put(p,"pace",dynamic?"dynamic":purpose==="practice"?"gentle":"steady","editorial");
 put(p,"emotionalProgram",result.emotionalProgram,"editorial");
 put(p,"method",/(?:медитац|meditat|meditaci[oó]n)/iu.test(low)?"meditation":
  /(?:рейки|reiki)/iu.test(low)?"reiki":
  /(?:гипноз|hypnos|hipnosis)/iu.test(low)?"hypnosis":null,"speech");
 put(p,"voiceTone",dynamic?"clear":purpose==="celebration"?"warm":
  purpose==="presentation"?"clear":"gentle","editorial");
 put(p,"styleId",result.styleId,"editorial");
 put(p,"visualWorld",energeticIncome?INCOME_GROWTH_WORLD[l]:
  getMyTubeStyle(result.styleId)?.description?.[l]||null,"editorial");
 // A viewer/recipient is not a film character. Recommend a safe visual POV
 // without asserting a specific person, relationship or biography.
 put(p,"characterAndPOV",energeticIncome?({
   ru:"Реальные люди и действия в профессиональной среде",
   en:"Real people and purposeful activity in a professional setting",
   es:"Personas reales y actividad en un entorno profesional"
  })[l]:({
  ru:"Неназванный герой · символический взгляд",
  en:"Unnamed protagonist · symbolic point of view",
  es:"Sin protagonista definido · mirada simbólica"
 })[l],"editorial");
 put(p,"visualActions",result.sceneOutline,"editorial");
 put(p,"avoidImagery",avoid.length?avoid:null,"speech");
 // References, editor settings and real media have independent owners. Do
 // not fabricate settings/attachments/exports from the spoken transcript.
 for(const key of ["references","delivery","wordsAndVoice","soundtrack","timelineBinding","creationMode"]){
  p[key]={value:null,status:"synchronized",source:{
   references:"attachments",delivery:"settings",wordsAndVoice:"ideas_voice",
   soundtrack:"audio",timelineBinding:"editor",creationMode:"render_policy"}[key]};
 }
 return {...result,parameters:p};
}
/** Idea-stage shot sketch only. It never claims that source clips exist or are cleared.
 * Montage is the sole owner of actual licensed footage, shot edits and export.
 */
export function buildConceptShotSketch(concept,durationSeconds=30){
 const duration=Number.isFinite(durationSeconds)?Math.max(5,Math.min(60,Math.round(durationSeconds))):30;
 const count=Math.max(1,Math.ceil(duration/5));
 // Six authored scenes must describe six distinct actions, not repeated
 // four-stage labels. This remains an editorial-only, unverified sketch.
 const authored=Array.isArray(concept?.storyboard)?concept.storyboard:null;
 if(duration===30&&authored?.length===6&&authored.every(s=>
   typeof s?.action==="string"&&s.action.trim()&&typeof s.title==="string")){
  return authored.map((shot,i)=>({
   number:i+1,startSeconds:i*5,endSeconds:(i+1)*5,
   stageIndex:Math.min(3,Math.floor(i*4/6)),beat:shot.action,
   title:shot.title,emotion:shot.emotion||"",
   shotKind:i,sourceVerified:false
  }));
 }
 const beats=Array.isArray(concept?.sceneOutline)?concept.sceneOutline:[];
 const sixStage=[0,0,1,2,2,3];
 return Array.from({length:count},(_,i)=>{
  const stageIndex=count===6?sixStage[i]:Math.min(3,Math.floor(i*4/count));
  const startSeconds=i*5,endSeconds=Math.min(duration,startSeconds+5);
  return {number:i+1,startSeconds,endSeconds,stageIndex,
   beat:beats[stageIndex]||"",shotKind:count===6?i:i%6,
   sourceVerified:false};
 });
}
/** Preserve manual cascade changes in the 38-field review without
 * guessing new audio or modifying the renderer's authoritative settings.
 */
export function synchronizeVideoConceptParameters(concept,changed=[]){
 if(!concept?.parameters)return concept;
 const p={...concept.parameters};
 const patch=(id,value)=>{p[id]={value:value??null,status:"manual",source:"editor"};};
 const canonical=["categoryId","subcategoryId","topicId","meaningAxisId","motifId","scenarioId",
   "styleId","mainMessage"];
 for(const key of canonical){
  if(p[key]?.value!==concept[key]){
   p[key]={value:concept[key]??null,status:changed.includes(key)?"manual":"suggested",
     source:changed.includes(key)?"editor":"editorial"};
  }else if(changed.includes(key))patch(key,concept[key]);
 }
 if(changed.some(k=>["categoryId","subcategoryId","topicId","scenarioId"].includes(k))){
  patch("beats",concept.sceneOutline);
  const scenario=listMyTubeScenarios(concept.topicId)
    .find(s=>s.id===concept.scenarioId);
  patch("archetype",scenario?.archetype||null);
  patch("hook",concept.sceneOutline[0]);
  patch("centralAction",concept.sceneOutline[2]);
  patch("endingIntent",concept.sceneOutline[3]);
 }
 return {...concept,parameters:p};
}
