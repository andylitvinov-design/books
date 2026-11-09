/**
 * Personal, original support-meditation script composer, not a generative AI model.
 * It writes a full optional narration + paced pauses from controlled, reviewed
 * blocks. Client raw text is NOT copied, stored, logged or used as instructions.
 * No classical KIP clinical motif is autonomously rendered as an exercise.
 */
import { KIP_MOTIF_BY_ID, KIP_SYMBOL_BY_ID } from "./kip-symbol-registry.mjs";
import { selectMeditationNarrative } from "./meditation-story-architect.mjs";
export const PERSONAL_MEDITATION_VERSION="psychologist-meditation-v1";
const LANG=["ru","en","es"];
const MOTIF_FOR_FOCUS=Object.freeze({
  stress:"gentle_nature",relationships:"comfortable_corner",
  self_worth:"supportive_object",meaning:"small_light",
});
const INTENTIONS=new Set(["settle","support","confidence","boundaries","clarity","energy","relationships","goals","meaning","work","money","change","creativity","rest"]);
const SAFE_MEDITATION_SYMBOLS=new Set(["tree","flower","sun","stone","cloud","light","seed","garden"]);
const STYLES=new Set(["gentle","practical","poetic"]);
const CHANNELS=new Set(["visual","auditory","tactile","neutral"]);
const AVOID=new Set(["breath_focus","eyes_closed","touch","water","animals","darkness","people","body_scan","fire","height","crowds","enclosed_spaces","travel","spiritual_symbols"]);
const lang=x=>LANG.includes(x)?x:"en";
const i18n=Object.freeze({
  ru:{
    theme:{settle:"спокойствие и устойчивость",support:"поддержку",confidence:"уверенность",
      boundaries:"личные границы",clarity:"ясность",energy:"бережное восстановление сил",
      relationships:"отношения",goals:"личные цели",meaning:"ценности и смысл",
      work:"отношение к работе",money:"отношение к деньгам и выбору",change:"перемены",
      creativity:"творчество",rest:"отдых"},
    label:"Персональная ресурсная медитация",pause:"Пауза",optional:"В любой момент можно остановиться, сделать паузу, оставить глаза открытыми или выбрать только наблюдение за комнатой.",
    arrival:"Устройтесь так, как сейчас удобно. Не нужно специально расслабляться или управлять дыханием. Просто отметьте, что сейчас вы находитесь здесь.",
    agency:"Сегодня мы уделим мягкое внимание теме: {theme}. Вы сами решаете, что подходит именно вам. Ничего не нужно достигать и никакой образ не обязателен.",
    motifs:{
      gentle_nature:"Если хочется, представьте обычный спокойный уголок природы. Это может быть знакомое место, воображаемый пейзаж или просто ощущение дневного света. Заметьте одну деталь, которая не требует от вас ничего.",
      supportive_object:"Если хочется, представьте небольшой предмет, который ассоциируется с опорой: чашку, камешек, книгу или что-то своё. Можно просто вспомнить реальную вещь рядом и не закрывать глаза.",
      comfortable_corner:"Вы можете представить приятный, достаточно нейтральный уголок: место у окна, скамью или уютную комнату. Вы сами выбираете расстояние и то, что там присутствует.",
      small_light:"Если подходит, вообразите мягкий свет на поверхности стола или вдали. Можно заменить его реальной деталью в комнате. Пусть это будет просто наблюдение, без особого значения."
    },
    explore:"Что вы замечаете в этом опыте? Возможно, цвет, расстояние, температуру или звук. Если деталей нет, это совершенно нормально. Никакой правильной картинки не существует.",
    focus:"Вспомните один небольшой способ позаботиться о себе в теме «{theme}». Это может быть пауза, просьба о помощи, спокойный выбор или один посильный шаг. Дайте себе возможность выбрать или ничего пока не выбирать.",
    integration:"Теперь при желании переведите внимание на то, что находится вокруг: предметы, звуки, опору под собой. Заметьте, что вы можете свободно выбирать, как продолжить свой день.",
    closing:"На этом практика завершается. Что было приятным, нейтральным или неудобным? Не нужно объяснять образы. Если самочувствие ухудшилось, не продолжайте упражнение и при необходимости обратитесь за человеческой поддержкой.",
    symbolIntro:"Если вам подходит, можно заметить образ «{symbol}». Ваши личные ощущения важнее любых готовых трактовок.",
    noImagery:"Для образной практики необходимо отдельное добровольное согласие. Можно выбрать другой формат без визуализации.",
    unapproved:"Этот мотив требует квалифицированного терапевтического сопровождения. Автоматически создавать по нему медитацию нельзя.",
    review:"Для такого запроса необходима оценка специалиста: автоматическая медитация не создаётся.",
  },
  en:{
    theme:{settle:"calm and steadiness",support:"support",confidence:"confidence",
      boundaries:"personal boundaries",clarity:"clarity",energy:"gentle restoration",
      relationships:"relationships",goals:"personal goals",meaning:"values and meaning",
      work:"your relationship with work",money:"your relationship with money and choice",
      change:"change",creativity:"creativity",rest:"rest"},
    label:"Personal supportive meditation",pause:"Pause",optional:"You can stop, pause, keep your eyes open or simply notice the room at any time.",
    arrival:"Make yourself as comfortable as you can. You do not have to relax or control your breathing. Simply notice that you are here now.",
    agency:"Today we can gently attend to {theme}. You decide what is suitable for you. Nothing needs to happen and no image is required.",
    motifs:{
      gentle_nature:"If you like, picture an ordinary peaceful place outdoors. It might be familiar, invented or simply a patch of daylight. Notice one detail that asks nothing of you.",
      supportive_object:"If you wish, imagine an ordinary object associated with support: a cup, a pebble, a book or your own choice. You may look at a real object instead.",
      comfortable_corner:"You may picture a comfortable neutral corner, perhaps near a window, a bench or a quiet room. You decide its contents and how close you want to be.",
      small_light:"If suitable, imagine a gentle light on a tabletop or in the distance. You can use an actual detail in the room instead. It does not have to mean anything."
    },
    explore:"What do you notice? Perhaps colour, distance, temperature or sound. If no details come to mind, that is fine. There is no correct picture.",
    focus:"Consider one small way to care for yourself while attending to {theme}. It might be a pause, asking for support, choosing calmly or taking one manageable step. You may decide to do nothing yet.",
    integration:"If you like, return your attention to what is around you: objects, sounds and the support beneath you. Notice that you can choose how to continue your day.",
    closing:"The practice is complete. What felt pleasant, neutral or uncomfortable? You do not need to explain any images. If you feel worse, do not continue; seek human support when needed.",
    symbolIntro:"If you wish, notice an image of {symbol}. Your own experience matters more than any ready-made interpretation.",
    noImagery:"Imagery requires your separate opt-in. You can choose a non-imagery format instead.",
    unapproved:"This motif requires a qualified therapist's guidance and cannot be used for an automatically generated meditation.",
    review:"This request needs professional assessment; no automatic meditation is generated.",
  },
  es:{
    theme:{settle:"calma y estabilidad",support:"apoyo",confidence:"confianza",
      boundaries:"límites personales",clarity:"claridad",energy:"recuperación suave",
      relationships:"relaciones",goals:"objetivos personales",meaning:"valores y sentido",
      work:"tu relación con el trabajo",money:"tu relación con el dinero y las decisiones",
      change:"los cambios",creativity:"la creatividad",rest:"el descanso"},
    label:"Meditación personal de apoyo",pause:"Pausa",optional:"Puedes parar, hacer una pausa, mantener los ojos abiertos o simplemente observar la habitación.",
    arrival:"Busca una postura cómoda. No necesitas relajarte ni controlar la respiración. Observa simplemente que estás aquí, ahora.",
    agency:"Hoy podemos atender con suavidad a {theme}. Tú decides qué te conviene. No tienes que lograr nada y no necesitas imaginar nada.",
    motifs:{
      gentle_nature:"Si quieres, imagina un lugar tranquilo al aire libre. Puede ser real, inventado o simplemente la luz del día. Observa un detalle sin exigencias.",
      supportive_object:"Si deseas, piensa en un objeto cotidiano que te dé apoyo: una taza, una piedra, un libro u otro que elijas. También puedes mirar un objeto real.",
      comfortable_corner:"Puedes imaginar un rincón agradable y neutro, cerca de una ventana, un banco o una habitación. Tú eliges lo que hay y la distancia.",
      small_light:"Si te resulta cómodo, imagina una luz suave sobre una mesa o a lo lejos. También puedes observar la luz real de tu entorno. No tiene que significar nada."
    },
    explore:"¿Qué notas: un color, una distancia, temperatura o sonido? Si no surge ningún detalle, está bien. No existe una imagen correcta.",
    focus:"Piensa en un gesto pequeño de cuidado personal relacionado con {theme}. Puede ser una pausa, pedir apoyo, elegir con calma o dar un paso posible. También puedes no decidir nada.",
    integration:"Si quieres, vuelve a mirar tu entorno: objetos, sonidos y el apoyo bajo ti. Puedes elegir cómo continuar el día.",
    closing:"La práctica ha terminado. ¿Qué fue agradable, neutro o incómodo? No necesitas interpretar ninguna imagen. Si te sientes peor, no continúes y busca apoyo humano si lo necesitas.",
    symbolIntro:"Si quieres, observa la imagen de {symbol}. Tu experiencia importa más que cualquier interpretación prefijada.",
    noImagery:"Las imágenes requieren un consentimiento separado. Puedes elegir un formato sin visualización.",
    unapproved:"Este motivo requiere orientación terapéutica cualificada; no se puede generar una meditación automática.",
    review:"Esta solicitud necesita una valoración profesional; no se genera una meditación automática.",
  },
});
const INTENTION_BY_FOCUS=Object.freeze({stress:"settle",relationships:"relationships",self_worth:"confidence",meaning:"meaning"});
function detectedIntention(raw, focus){
  const t=typeof raw==="string"?raw.slice(0,2500):"";
  if(/границ|boundary|l[ií]mites/iu.test(t))return "boundaries";
  if(/уверенн|confidence|confianza|самооцен|self.esteem/iu.test(t))return "confidence";
  if(/энерг|energy|energ[ií]a|устал|tired|cansad/iu.test(t))return "energy";
  if(/цели|goal|objetiv/iu.test(t))return "goals";
  if(/ясност|clarity|claridad/iu.test(t))return "clarity";
  if(/отношен|relationship|relaci[oó]n/iu.test(t))return "relationships";
  if(/деньг|денежн|money|financ|dinero/iu.test(t))return "money";
  if(/работ|карьер|work|career|trabajo/iu.test(t))return "work";
  if(/перемен|изменени|change|transition|cambio/iu.test(t))return "change";
  if(/творчеств|creative|creatividad/iu.test(t))return "creativity";
  if(/отдых|восстановлен|rest|descanso|relax/iu.test(t))return "rest";
  return INTENTION_BY_FOCUS[focus]||"support";
}
const clamp=(n,lo,hi,def)=>Number.isInteger(n)?Math.min(hi,Math.max(lo,n)):def;
function segmentsWithPause(sections, totalSeconds){
  // Spoken time is deliberately conservative; remaining duration is opt-in
  // silent breathing room. Clients can skip pauses or stop early.
  const weights=[10,12,21,17,19,12,9];
  let assigned=0;
  return sections.map((s,i)=>{
    const duration=i===sections.length-1?totalSeconds-assigned:
      Math.floor(totalSeconds*weights[i]/100);
    assigned+=duration;
    const estimatedSpeech=Math.min(duration,Math.max(16,Math.ceil(s.text.split(/\s+/).length/2.3)));
    return {...s,seconds:duration,optionalSilenceSeconds:Math.max(0,duration-estimatedSpeech),
      maySkip:true,forceBreathControl:false,eyesMayRemainOpen:true};
  });
}
/** Requires a ready preflighted self-guided program and *separate* opt-in. */
export function composePersonalMeditation(program,{locale="ru",consent={},intent={},preferences={}}={}){
  // Tolerate malformed optional client envelopes; never dereference null input.
  intent=intent&&typeof intent==="object"&&!Array.isArray(intent)?intent:{};
  preferences=preferences&&typeof preferences==="object"&&!Array.isArray(preferences)?preferences:{};
  consent=consent&&typeof consent==="object"&&!Array.isArray(consent)?consent:{};
  const l=lang(locale), t=i18n[l];
  const base={version:PERSONAL_MEDITATION_VERSION,status:"not_eligible",
    motifId:null,symbolId:null,script:null,segments:[],plannedDurationSeconds:0,
    audioAssetId:null,videoAssetId:null,rendered:false,published:false,
    source:"original_resource_support_not_clinical_KIP",requiresEditorialReview:true};
  if(program?.status!=="ready"||program?.mode!=="self_guided"||
    !["stress","relationships","self_worth","meaning"].includes(program?.focus))
    return {...base,status:"human_review_required",message:t.review};
  if(consent?.resourceImagery!==true || preferences?.noImagery===true || intent?.noImagery===true)
    return {...base,status:"imagery_consent_required",message:t.noImagery};
  const requested=typeof intent.motifId==="string"?intent.motifId:null;
  const requestedAvoid=Array.isArray(preferences.avoidElements)?preferences.avoidElements:[];
  const defaultMotif=(requestedAvoid.includes("water")&&program.focus==="stress")||
    (requestedAvoid.includes("darkness")&&program.focus==="meaning")
    ?"comfortable_corner":MOTIF_FOR_FOCUS[program.focus];
  const motifId=requested||defaultMotif;
  const motif=KIP_MOTIF_BY_ID[motifId];
  if(!motif?.selfGuided || !Object.hasOwn(t.motifs,motifId))
    return {...base,status:"clinician_review_required",motifId,message:t.unapproved};
  const explicit=INTENTIONS.has(intent.intentionCode)?intent.intentionCode:null;
  const intention=explicit||detectedIntention(intent.rawUtterance,program.focus);
  const style=STYLES.has(preferences.style)?preferences.style:"gentle";
  const channel=CHANNELS.has(preferences.channel)?preferences.channel:"neutral";
  const avoid=[...new Set(Array.isArray(preferences.avoidElements)
    ?preferences.avoidElements.filter(x=>AVOID.has(x)):[])];
  // Never silently ignore imagery/visual restrictions.
  if(avoid.includes("eyes_closed")) { /* scripts always allow open eyes */ }
  if(avoid.includes("body_scan")) { /* no body scans in any script */ }
  const motifConflicts=(avoid.includes("water")&&motifId==="gentle_nature")||
    (avoid.includes("darkness")&&motifId==="small_light");
  if(motifConflicts)return {...base,status:"preferences_conflict",motifId,
    message:t.noImagery};
  const requestedSymbol=typeof intent.symbolId==="string"?intent.symbolId:null;
  // Classical symbol dictionary is for exploration, NOT automatic decoding.
  // Only a small non-threatening subset can be included, and only if
  // the client explicitly selected it. Unknown/clinical symbols are rejected.
  if(requestedSymbol && !SAFE_MEDITATION_SYMBOLS.has(requestedSymbol))
    return {...base,status:"symbol_review_required",motifId,message:t.unapproved};
  const symbol=requestedSymbol?KIP_SYMBOL_BY_ID[requestedSymbol]:null;
  if(requestedSymbol && !symbol)
    return {...base,status:"symbol_review_required",motifId,message:t.unapproved};
  if((avoid.includes("darkness")&&requestedSymbol==="light")||
     (avoid.includes("water")&&requestedSymbol==="garden"))
    return {...base,status:"preferences_conflict",motifId,message:t.noImagery};
  const symbolText=symbol?t.symbolIntro.replace("{symbol}",symbol.label[({ru:1,en:0,es:2})[l]]):"";
  const theme=t.theme[intention];
  const replaceTheme=s=>s.replaceAll("{theme}",theme);
  const sessionNumber=intent.sessionNumber===undefined?1:intent.sessionNumber;
  if(!Number.isInteger(sessionNumber)||sessionNumber<1||sessionNumber>8)
    return {...base,status:"invalid_session",motifId};
  const objective=program.sessions?.[sessionNumber-1]?.objectiveCode||"support";
  const narrative=selectMeditationNarrative({
    locale:l,goal:intention,objective,sceneId:intent.sceneId,
    metaphorId:intent.metaphorId,arcId:intent.storyArcId,
    avoidElements:avoid,preferredChannel:channel,
    variationIndex:Number.isInteger(intent.variationIndex)?intent.variationIndex:sessionNumber-1,
    historySceneIds:intent.historySceneIds,
    historyMetaphorIds:intent.historyMetaphorIds,
    useMetaphor:preferences.noMetaphor!==true&&style!=="practical"
  });
  if(narrative.status!=="ready")return {...base,status:narrative.status,
    motifId,symbolId:requestedSymbol,
    message:({ru:"Выбранный образ или сюжет сейчас не подходит для самостоятельной практики. Можно выбрать другой.",
      en:"This image or story is not suitable for autonomous practice. Please choose another.",
      es:"Esta imagen o historia no es adecuada para una práctica autónoma. Puedes elegir otra."})[l]};
  const styleLine=style==="poetic" ? ({
    ru:"Пусть слова будут только мягкими ориентирами; вы вправе представить всё иначе.",
    en:"Let the words be gentle guideposts; you may imagine it all differently.",
    es:"Deja que las palabras sean referencias suaves; puedes imaginarlo de otra manera."})[l] :
    style==="practical" ? ({
    ru:"Если образ не подходит, можно просто перечислить несколько нейтральных предметов вокруг.",
    en:"If an image is unhelpful, you may name a few neutral objects around you instead.",
    es:"Si la imagen no ayuda, puedes nombrar algunos objetos neutros de tu entorno."})[l]:"";
  const sections=[
    {id:"arrival",text:t.arrival+" "+narrative.narration.opening},
    {id:"choice",text:replaceTheme(t.agency)+" "+t.optional+" "+styleLine},
    {id:"resource_image",text:t.motifs[motifId]+" "+narrative.narration.scene},
    {id:"non_directive_exploration",text:narrative.narration.observation+" "+t.explore+" "+symbolText},
    {id:"supportive_choice",text:(narrative.narration.metaphor||"")+" "+replaceTheme(t.focus)},
    {id:"return_to_here",text:t.integration+" "+narrative.narration.transfer},
    {id:"closing",text:t.closing},
  ];
  const minutes=clamp(intent.durationMinutes,5,15,9);
  const scheduled=segmentsWithPause(sections,minutes*60);
  const script=scheduled.map(s=>s.text+"\n["+t.pause+": "+s.optionalSilenceSeconds+" s]").join("\n\n");
  return {...base,status:"script_ready",motifId,symbolId:requestedSymbol,
    title:t.label+" — "+theme+" · "+narrative.sceneTitle,
    intentionCode:intention,style,channel,language:l,
    sessionNumber,sessionObjective:objective,
    sceneId:narrative.sceneId,metaphorId:narrative.metaphorId,
    storyArcId:narrative.arcId,storySelection:narrative.selection,
    plannedDurationSeconds:minutes*60,segments:scheduled,script,
    // Pause annotations are for the renderer, not spoken by TTS.
    voiceSegments:scheduled.map(section=>({id:section.id,text:section.text,
      estimatedPauseAfterMs:section.optionalSilenceSeconds*1000,
      timingApproximate:true})),
    requiresTtsTimingVerification:true,clientConsentRequired:true,canPauseOrSkip:true,
    noSymbolInterpretation:true,diagnosis:null,meditationCompleted:false,
    choices:{motifSource:motif.origin,intentionSelection:explicit?"explicit":"detected_or_focus_default",
      storyOrigin:"original_nonclinical_approved_cards"},
    audioAssetId:null,videoAssetId:null,rendered:false,published:false};
}

/**
 * A complete eight-script companion series, optionally tied to an 8-session
 * supportive video curriculum. Does NOT generate media or send content to TTS.
 * IDs only are used to avoid repetitive imagery; no client notes are retained.
 */
export function composePersonalMeditationSeries(program,{
  locale="ru",consent={},intent={},preferences={}
}={}){
  intent=intent&&typeof intent==="object"&&!Array.isArray(intent)?intent:{};
  const base={version:"psychologist-meditation-series-v1",status:"not_eligible",
    scripts:[],published:false,rendered:false,saved:false,
    requiresHumanContentReview:true,requiresFreshSafetyCheckBeforeEachSession:true,
    sessionCount:0};
  if(program?.status!=="ready"||program?.mode!=="self_guided"||
    !Array.isArray(program.sessions)||program.sessions.length!==8){
    return {...base,status:"human_review_required"};
  }
  const seenScenes=[],seenMetaphors=[];
  const scripts=[];
  for(let sessionNumber=1;sessionNumber<=8;sessionNumber++){
    const result=composePersonalMeditation(program,{
      locale,consent,preferences,intent:{...intent,sessionNumber,
        // Each session gets a fresh, bounded variation. Caller cannot bypass
        // session-specific staging by supplying its own session number here.
        variationIndex:sessionNumber-1,
        historySceneIds:[...seenScenes],historyMetaphorIds:[...seenMetaphors]}
    });
    if(result.status!=="script_ready")return {...base,status:result.status,
      reviewReason:result.message||null};
    scripts.push(result);
    seenScenes.push(result.sceneId);
    if(result.metaphorId)seenMetaphors.push(result.metaphorId);
  }
  return {...base,status:"series_draft_ready",sessionCount:8,
    scripts,language:lang(locale),courseRecipeId:program.courseRecipeId??null,
    uniqueSceneCount:new Set(seenScenes).size,
    uniqueMetaphorCount:new Set(seenMetaphors).size,
    clientConsentRequired:true,requiresHumanContentReview:true,
    requiresFreshSafetyCheckBeforeEachSession:true};
}
