/**
 * Goal choices for Ideas: 3 primary + 2 optional, derived locally from confirmed
 * quiz answers and the user's explicit request. No diagnostic inference, LLM,
 * persistence, profile retrieval, media licensing claim, or therapeutic promise.
 *
 * A goal is not a topic: topicId remains the user's verified choice, while the
 * goal selects the intended outcome and the screenplay mechanism.
 */
import {getMyTubeTopic} from "./mytube-content-taxonomy.mjs";
import {PERSONAL_EIGHT_AXES,axisDifference} from "./personal-eight-axes.mjs";
import {resolveVideoIdeaContext} from "./video-goal-idea-phrases.mjs";

export const VIDEO_GOAL_COMPOSER_VERSION="video-goal-composer-v3";
export const VIDEO_GOAL_TYPES=Object.freeze(["leisure","support","change"]);

const SAFE_TEXT=x=>String(x??"").normalize("NFKC")
 .replace(/[\u0000-\u001f\u007f<>]/gu," ").replace(/\s+/gu," ").trim();
const TEXT_LIMIT=220;
const LOCALES=["ru","en","es"];
const LOCAL=x=>LOCALES.includes(x)?x:"en";
const BOUNDED=x=>Number.isFinite(x)&&x>=0&&x<=10?x:null;
const AXIS_RESOURCE={
 ru:{anchor:"внутреннюю опору",connection:"доверие",freedom:"свободу выбора",agency:"уверенность в действиях",dignity:"самоуважение",wholeness:"самопринятие",meaning:"ясность своих ценностей",growth:"готовность к переменам"},
 en:{anchor:"inner stability",connection:"trust",freedom:"freedom to choose",agency:"confidence to act",dignity:"self-respect",wholeness:"self-acceptance",meaning:"clarity about values",growth:"openness to change"},
 es:{anchor:"apoyo interior",connection:"confianza",freedom:"libertad para elegir",agency:"confianza para actuar",dignity:"respeto propio",wholeness:"autoaceptación",meaning:"claridad de valores",growth:"apertura al cambio"}
};
const STATE={
 ru:{fatigue:"усталость",tension:"напряжение",sadness:"грусть",overwhelmed:"перегрузка",uncertain:"неуверенность",irritated:"раздражение",loneliness:"одиночество",selfcritical:"самокритика",afraid:"страх",drained:"упадок сил",discouraged:"уныние",stuck:"застой",content:"довольство",hopeful:"надежда",curious:"интерес",motivated:"мотивация",connected:"близость",grateful:"благодарность",confident:"уверенность",excited:"воодушевление",calm:"спокойствие",safe:"безопасность",energetic:"энергия",balanced:"равновесие",joyful:"радость",freedom:"свобода",clarity:"ясность",accepted:"принятие",comforted:"утешение",understood:"понимание",supported:"поддержка",rested:"отдых",inspired:"вдохновение",playful:"лёгкость",fulfilled:"наполненность"},
 en:{fatigue:"tired",tension:"tense",sadness:"sad",overwhelmed:"overwhelmed",uncertain:"uncertain",irritated:"irritated",loneliness:"lonely",selfcritical:"self-critical",afraid:"afraid",drained:"drained",discouraged:"discouraged",stuck:"stuck",content:"content",hopeful:"hopeful",curious:"curious",motivated:"motivated",connected:"connected",grateful:"grateful",confident:"confident",excited:"excited",calm:"calm",safe:"safe",energetic:"energized",balanced:"balanced",joyful:"joyful",freedom:"free",clarity:"clear",accepted:"accepted",comforted:"comforted",understood:"understood",supported:"supported",rested:"rested",inspired:"inspired",playful:"playful",fulfilled:"fulfilled"},
 es:{fatigue:"cansancio",tension:"tensión",sadness:"tristeza",overwhelmed:"agobio",uncertain:"inseguridad",irritated:"irritación",loneliness:"soledad",selfcritical:"autocrítica",afraid:"miedo",drained:"agotamiento",discouraged:"desánimo",stuck:"bloqueo",content:"satisfacción",hopeful:"esperanza",curious:"curiosidad",motivated:"motivación",connected:"conexión",grateful:"gratitud",confident:"confianza",excited:"entusiasmo",calm:"calma",safe:"seguridad",energetic:"energía",balanced:"equilibrio",joyful:"alegría",freedom:"libertad",clarity:"claridad",accepted:"aceptación",comforted:"consuelo",understood:"comprensión",supported:"apoyo",rested:"descanso",inspired:"inspiración",playful:"ligereza",fulfilled:"plenitud"}
};
const LABELS={
 ru:{rest:["Отдохнуть и расслабиться","Небольшая пауза без необходимости что-то менять."],enjoy:["Улыбнуться и развлечься","Получить удовольствие от лёгкой истории."],beauty:["Насладиться красивой историей","Побыть в приятных образах и впечатлениях."],inspire:["Почувствовать вдохновение","Найти удовольствие и свежие образы."],slow:["Замедлиться и переключиться","Плавно сменить ритм после насыщенного дня."],
 ground:["Вернуть спокойствие и опору","Бережная стабилизация без принуждения."],accept:["Получить эмоциональную поддержку","Тёплые слова, обращённые лично к вам."],resource:["Укрепить внутренний ресурс","Заметить доступную поддержку и маленькие опоры."],
 reflect:["Лучше понять свои реакции","Увидеть эмоции и ситуацию с большей ясностью."],reframe:["Изменить отношение к себе","Бережно исследовать новые установки о себе."],strengthen:["Укрепить ","Поддержать выбранное качество в своей жизни."],rehearse:["Подготовиться к небольшому шагу","Мысленно представить доступное действие, не обещая освоения навыка."]},
 en:{rest:["Rest and Relax","A gentle pause with nothing to prove."],enjoy:["Enjoy a Light-hearted Story","A moment of playful enjoyment."],beauty:["Enjoy a Beautiful Story","Appreciate pleasant images and atmosphere."],inspire:["Feel Inspired","Make room for fresh, uplifting images."],slow:["Slow Down and Unwind","Ease into a different pace after a busy day."],
 ground:["Find Calm and Steady Ground","Gentle stabilization without pressure."],accept:["Receive Emotional Support","Warm, reassuring words addressed to you."],resource:["Reconnect with Inner Resources","Notice support and small points of stability."],
 reflect:["Understand My Reactions","Notice feelings and situations more clearly."],reframe:["Change How I See Myself","Gently explore new beliefs about myself."],strengthen:["Strengthen ","Support the quality you have chosen."],rehearse:["Prepare for One Small Step","Imagine a manageable action, not instant skill acquisition."]},
 es:{rest:["Descansar y relajarme","Una pausa amable sin exigencias."],enjoy:["Disfrutar una historia divertida","Un momento ligero y agradable."],beauty:["Disfrutar una historia bonita","Apreciar imágenes y sensaciones agradables."],inspire:["Sentir inspiración","Abrir espacio a imágenes estimulantes."],slow:["Bajar el ritmo","Cambiar suavemente de ritmo después del día."],
 ground:["Recuperar calma y apoyo","Estabilización suave sin presión."],accept:["Recibir apoyo emocional","Palabras cálidas dirigidas a ti."],resource:["Reconectar con mis recursos","Notar el apoyo y pequeñas fuentes de estabilidad."],
 reflect:["Comprender mis reacciones","Observar emociones con más claridad."],reframe:["Cambiar cómo me veo","Explorar nuevas creencias sobre mí."],strengthen:["Fortalecer ","Apoyar la cualidad que he elegido."],rehearse:["Preparar un pequeño paso","Imaginar una acción posible, sin prometer habilidades."]}
};
const DEFINITIONS=Object.freeze({
 rest:{type:"leisure",mechanism:"restful_pause",scenarioStrategy:"shelter",altStrategy:"integration",photo:"rest"},
 enjoy:{type:"leisure",mechanism:"enjoyment",scenarioStrategy:"journey",altStrategy:"integration",photo:"love"},
 beauty:{type:"leisure",mechanism:"aesthetic_enjoyment",scenarioStrategy:"integration",altStrategy:"shelter",photo:"calm"},
 inspire:{type:"leisure",mechanism:"inspiration",scenarioStrategy:"journey",altStrategy:"integration",photo:"energy"},
 slow:{type:"leisure",mechanism:"sensory_pause",scenarioStrategy:"shelter",altStrategy:"integration",photo:"rest"},
 ground:{type:"support",mechanism:"grounding",scenarioStrategy:"shelter",altStrategy:"integration",photo:"calm"},
 accept:{type:"support",mechanism:"validation",scenarioStrategy:"shelter",altStrategy:"reframe",photo:"trust"},
 resource:{type:"support",mechanism:"resourcing",scenarioStrategy:"integration",altStrategy:"shelter",photo:"growth"},
 reflect:{type:"change",mechanism:"awareness",scenarioStrategy:"reframe",altStrategy:"integration",photo:"meaning"},
 reframe:{type:"change",mechanism:"cognitive_reframing",scenarioStrategy:"reframe",altStrategy:"journey",photo:"focus"},
 strengthen:{type:"change",mechanism:"resource_development",scenarioStrategy:"integration",altStrategy:"reframe",photo:"confidence"},
 rehearse:{type:"change",mechanism:"mental_rehearsal",scenarioStrategy:"journey",altStrategy:"reframe",photo:"focus"}
});
const PACKS={
 leisure:["rest","beauty","enjoy","slow","inspire"],
 support:["ground","accept","resource","reflect","slow"],
 change:["reframe","strengthen","reflect","rehearse","ground"],
 mixed:["rest","ground","strengthen","accept","reframe"]
};
const RE_LEISURE=/(?:отдых|отдохн|расслаб|развлеч|весел|юмор|посме|приятн|красив|наслад|relax|rest\b|fun\b|laugh|enjoy|entertain|beautiful|descans|relaj|divert|re[ií]r|disfrut|bonit)/iu;
const RE_CHANGE=/(?:преодол|коррек|изменить (?:реакци|убеждени)|установк|фоби|триггер|самокритик|страх осуждени|стать уверен|научиться|развить|work on my|overcome|belief|phobia|trigger|self.critic|fear of judgment|build confidence|cambiar (?:creencia|reacci)|superar|fobia|autocr[ií]tic)/iu;
const RE_FUN=/(?:развлеч|весел|юмор|посме|интересн(?:ый|ую) истор|fun\b|laugh|entertain|playful|divert|re[ií]r|humor)/iu;
const RE_INSPIRATION=/(?:вдохнов|мотивац|inspir|motivat)/iu;
const RE_REST=/(?:отдых|отдохн|расслаб|замед|relax|rest\b|unwind|descans|relaj)/iu;
const RE_SUPPORT=/(?:поддерж|опор|стабилиз|тревож|паник|стресс|справиться|устойчивост|support|ground|stabili[sz]|anxious|panic|stressed|apoyo|sost[eé]n|estabili[sz]|ansiedad|estr[eé]s)/iu;
const REFRAME_AXIS={
 ru:{anchor:"Иначе взглянуть на трудности",connection:"Открыться другому взгляду",freedom:"Увидеть пространство выбора",agency:"Найти новые способы действовать",dignity:"Смягчить внутреннюю критику",wholeness:"Принять разные стороны себя",meaning:"Переосмыслить приоритеты",growth:"По-новому взглянуть на перемены"},
 en:{anchor:"See Challenges Differently",connection:"Explore Another View of Connection",freedom:"Notice My Freedom to Choose",agency:"Find New Ways Forward",dignity:"Soften the Inner Critic",wholeness:"Accept More of Myself",meaning:"Rethink My Priorities",growth:"Reframe My View of Change"},
 es:{anchor:"Ver las dificultades de otra forma",connection:"Explorar otra mirada sobre el vínculo",freedom:"Reconocer mi libertad de elegir",agency:"Explorar nuevas formas de actuar",dignity:"Suavizar la autocrítica",wholeness:"Aceptar más partes de mí",meaning:"Reconsiderar mis prioridades",growth:"Cambiar mi mirada sobre los cambios"}
};
const localeCopy=(lang,id,axis)=>{const [base,detail]=LABELS[lang][id];
 return {title:id==="strengthen"?base+(AXIS_RESOURCE[lang][axis]||AXIS_RESOURCE[lang].anchor):base,detail};};
const SUPPORT_FOCUS={
 ru:{acceptance:"принятие без оценок",care:"тепло и забота",reassurance:"безопасность и спокойствие",connection:"близость и присутствие",worth:"ценность самого себя",love:"слова любви"},
 en:{acceptance:"acceptance without judgement",care:"care and warmth",reassurance:"reassurance and safety",connection:"closeness and presence",worth:"inherent worth",love:"loving words"},
 es:{acceptance:"aceptación sin juicios",care:"cuidado y calidez",reassurance:"calma y seguridad",connection:"cercanía y presencia",worth:"valor personal",love:"palabras de amor"}
};
function chooseMode(wish,categoryId,profile){
 // Explicit creative wish takes precedence over possible clinical context.
 if(RE_LEISURE.test(wish)||RE_INSPIRATION.test(wish))return "leisure";
 if(RE_CHANGE.test(wish))return "change";
 if(RE_SUPPORT.test(wish))return "support";
 if(categoryId==="stress-anxiety")return "support";
 if(categoryId==="goals-money")return "change";
 if(profile&&(profile.current||[]).some(x=>["selfcritical","stuck"].includes(x)))return "change";
 if(profile&&profile.energy<=3)return "support";
 return "mixed";
}
/**
 * @param {{locale?:string,wish?:string,theme?:string,selectedTopic?:{topicId?:string|null}|null,
 * profile?:{current?:string[],desired?:string[],axes?:string[],energy?:number,desiredLevel?:number}|null,
 * profileConfirmed?:boolean}} input
 */
export function buildPersonalVideoGoalOptions({locale="ru",wish="",theme="energy",
 selectedTopic=null,profile=null,profileConfirmed=false}={}){
 const lang=LOCAL(locale),request=SAFE_TEXT(wish).slice(0,500);
 const validated=profileConfirmed&&profile&&typeof profile==="object"?profile:null;
 const fallback=resolveVideoIdeaContext({locale:lang,request,theme});
 const selectedId=selectedTopic?.topicId;
 const topicId=getMyTubeTopic(selectedId)?.topic.id||
   (getMyTubeTopic(fallback.topicId)?.topic.id||null);
 const topic=topicId?getMyTubeTopic(topicId):null;
 const categories={love:"love-relationships",business:"goals-money",stress:"stress-anxiety",energy:"energy-confidence",body:"energy-confidence"};
 const categoryId=topic?.category.id||categories[fallback.categoryId]||fallback.categoryId||null;
 const subcategoryId=topic?.subcategory.id||null;
 const currentId=validated?.current?.[0]||null,desiredId=validated?.desired?.[0]||null;
 const defaultAxis=categoryId==="love-relationships"?"connection":
   categoryId==="goals-money"?"agency":categoryId==="energy-confidence"?"growth":"anchor";
 const meaningAxisId=validated?.axes?.[0]&&Object.hasOwn(AXIS_RESOURCE[lang],validated.axes[0])
   ?validated.axes[0]:defaultAxis;
 const mode=chooseMode(request,categoryId,validated);
 const focusAxis=validated?.focusAxisId?PERSONAL_EIGHT_AXES.find(axis=>axis.id===validated.focusAxisId):null;
 const focusGap=focusAxis?axisDifference(validated?.axisRatings?.[focusAxis.id]):null;
 // The category/topic/request determine which goal was selected. Personal answers
 // MUST NOT change that choice key as the visitor advances through the wizard.
 const contextKey=JSON.stringify([VIDEO_GOAL_COMPOSER_VERSION,lang,request,topicId,categoryId]);
 const contextCopy=lang==="ru"?"Тема":lang==="es"?"Tema":"Topic";
 const nowCopy=lang==="ru"?"Сейчас":lang==="es"?"Ahora":"Now";
 const targetCopy=lang==="ru"?"Желаемое":lang==="es"?"Deseado":"Desired";
 const axesCopy=lang==="ru"?"Смысловой ресурс":lang==="es"?"Recurso":"Meaning resource";
 // Three stable purposes in the same order for every topic and language.
 // Topic customizes the story; purpose selects the psychological mechanism.
 const goalIds=["rest","accept","reframe"];
 const goals=goalIds.map((id,index)=>{
  const def=DEFINITIONS[id],text=localeCopy(lang,id,meaningAxisId);
  const topicName=topic?.topic.label[lang]||null;
  const current=currentId?STATE[lang][currentId]||null:null;
  const desired=desiredId?STATE[lang][desiredId]||null:null;
  const brief=[topicName?contextCopy+": "+topicName:null,
   current?nowCopy+": "+current:null,desired?targetCopy+": "+desired:null,
   def.type==="support"&&validated?.supportNeed
     ?(lang==="ru"?"Нужная поддержка":lang==="es"?"Apoyo deseado":"Requested support")+": "+
       (SUPPORT_FOCUS[lang][validated.supportNeed]||SUPPORT_FOCUS[lang].acceptance):null,
   def.type==="change"?axesCopy+": "+(AXIS_RESOURCE[lang][meaningAxisId]||AXIS_RESOURCE[lang].anchor):null,
   focusAxis?(lang==="ru"?"Главный фокус":lang==="es"?"Enfoque principal":"Main focus")+": "+focusAxis.labels[lang]+
     (focusGap!==null?" (Δ "+(focusGap>0?"+":"")+focusGap+")":""):null
  ].filter(Boolean).join(". ");
  const intent=[text.title+".",text.detail,brief].filter(Boolean).join(" ").slice(0,650);
  const detail=topicName?(text.detail+" · "+topicName).slice(0,TEXT_LIMIT):text.detail;
  return Object.freeze({
   id,type:def.type,mechanismId:def.mechanism,scenarioStrategy:def.scenarioStrategy,
   secondaryScenarioStrategy:def.altStrategy,photo:def.photo,
   topicId,categoryId,subcategoryId,meaningAxisId,currentId,desiredId,
   ordinal:index+1,voicePerson:def.type==="support"?"second":def.type==="change"?"first":"none",
   measurement:def.type==="leisure"?"enjoyment_rating":
     def.type==="support"?"support_rating":"goal_progress_rating",
   copy:Object.freeze({[lang]:Object.freeze({...text,detail,intent})})
  });
 });
 return Object.freeze({version:VIDEO_GOAL_COMPOSER_VERSION,contextKey,mode,topicId,
  categoryId,subcategoryId,profileUsed:Boolean(validated),goals:Object.freeze(goals)});
}
/** Preserve the visitor's original request and explicitly selected outcome. */
export function composePersonalVideoGoalIntent(wish,selected,locale="ru"){
 const original=SAFE_TEXT(wish).slice(0,430).replace(/[.!?。]+$/u,"");
 if(!selected)return original;
 const intent=selected.copy?.[LOCAL(locale)]?.intent||"";
 return [original,intent].filter(Boolean).join(". ").slice(0,800);
}
/** Keep the film's selected intent visible to the existing local screenplay ranker. */
export function goalScenarioPlan(selected,contextKey){
 if(!selected)return null;
 return Object.freeze({
  id:selected.id,type:selected.type,mechanismId:selected.mechanismId,
  scenarioStrategy:selected.scenarioStrategy,
  secondaryScenarioStrategy:selected.secondaryScenarioStrategy,
  meaningAxisId:selected.meaningAxisId,
  topicId:selected.topicId,voicePerson:selected.voicePerson,
  contextKey
 });
}