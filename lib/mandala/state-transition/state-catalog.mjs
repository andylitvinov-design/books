/**
 * HH State Transition & Scenario Engine — versioned, offline-only editorial registry.
 * State vectors are aesthetic routing heuristics, never psychometric scores or diagnoses.
 * Motifs and styles come from the existing MyTube creative choices registry.
 */
import {MYTUBE_VISUAL_MOTIFS,MYTUBE_VISUAL_STYLES} from "../mytube-creative-choices.mjs";

export const STSE_VERSION="hh-state-transition-v1";
export const STSE_RANKER_VERSION="hh-stse-ranker-v1";
export const STSE_LOCALES=Object.freeze(["ru","en","es"]);
export const STSE_AXES=Object.freeze(["tension","energy","safety","agency","connection","clarity","selfAcceptance","freedom"]);
const loc=(ru,en,es)=>Object.freeze({ru,en,es});
const rows=[
 // id, cluster, polarity, labels ru/en/es, aliases ru/en/es
 ["anxiety","tension",-1,"Тревога","Anxiety","Ansiedad","тревожно|тревожность|тревожусь","anxious|worried|worry","ansioso|ansiosa|preocupación"],
 ["tension","tension",-1,"Напряжение","Tension","Tensión","напряжённость|напряжен|зажатость","tense|strained","tenso|tensa"],
 ["worry","tension",-1,"Беспокойство","Worry","Preocupación","волнуюсь|переживаю|беспокойно","worrying|uneasy","inquietud|preocupado"],
 ["overload","tension",-1,"Перегрузка","Overwhelm","Agobio","перегружен|слишком много","overwhelmed|overloaded","agobiado|sobrecarga"],
 ["calm","safety",1,"Спокойствие","Calm","Calma","спокойно|умиротворение|покой","peace|peaceful|relaxed","tranquilidad|paz"],
 ["safe","safety",1,"Безопасность","Safety","Seguridad","защищённость|в безопасности","secure|protected","seguro|protegida"],
 ["grounded","safety",1,"Опора","Grounded","Estabilidad","устойчивость|почва под ногами","grounding|steady|supported","apoyo|estabilidad"],
 ["trust","safety",1,"Доверие","Trust","Confianza","доверяю|могу доверять","trusting","confiar|confío"],
 ["fatigue","energy",-1,"Усталость","Fatigue","Cansancio","устал|устала|нет энергии","tired|fatigued","cansado|cansada"],
 ["exhaustion","energy",-1,"Истощение","Exhaustion","Agotamiento","истощён|сил нет|обессилен","exhausted|depleted","agotado|agotada"],
 ["rested","energy",1,"Отдохнувшее состояние","Rested","Descanso","отдохнувший|восстановился","rested|refreshed","descansado|recuperado"],
 ["vitality","energy",1,"Энергия","Vitality","Vitalidad","бодрость|энергичность|живость","energetic|energized|energy","energía|vitalidad"],
 ["helplessness","agency",-1,"Бессилие","Helplessness","Impotencia","беспомощность|не могу ничего","powerless|helpless","sin fuerzas|impotente"],
 ["doubt","agency",-1,"Неуверенность","Self-doubt","Inseguridad","сомневаюсь в себе|нет уверенности","insecure|doubting myself","duda|inseguro"],
 ["confidence","agency",1,"Уверенность","Confidence","Confianza en mí","уверен|уверена|уверенность в себе","confident|self-confidence","seguro de mí|autoconfianza"],
 ["capable","agency",1,"Способность действовать","Agency","Capacidad de actuar","могу действовать|самостоятельность","capable|empowered","capaz|puedo actuar"],
 ["loneliness","connection",-1,"Одиночество","Loneliness","Soledad","одинок|одинока|мне одиноко","lonely|alone","solo|sola"],
 ["isolation","connection",-1,"Отстранённость","Isolation","Aislamiento","изолирован|отдалённость","isolated|disconnected","aislado|desconectado"],
 ["connection","connection",1,"Контакт","Connection","Conexión","связь с людьми|в контакте","connected|belonging","conectado|vínculo"],
 ["closeness","connection",1,"Близость","Closeness","Cercanía","теплота в отношениях|близкие отношения","intimacy|closeness","cercanía|intimidad"],
 ["shame","acceptance",-1,"Стыд","Shame","Vergüenza","стыдно|позор|осуждение","ashamed|embarrassment","vergüenza|avergonzado"],
 ["self_criticism","acceptance",-1,"Самокритика","Self-criticism","Autocrítica","ругаю себя|самоосуждение","judging myself|self-critical","me critico|autocrítico"],
 ["self_acceptance","acceptance",1,"Принятие себя","Self-acceptance","Autoaceptación","принимаю себя|я достаточно хорош","accept myself|self-compassion","me acepto|aceptarme"],
 ["compassion","acceptance",1,"Доброта к себе","Self-kindness","Amabilidad conmigo","бережность к себе|сочувствие себе","kind to myself|compassion","amabilidad hacia mí|compasión"],
 ["confusion","clarity",-1,"Растерянность","Confusion","Confusión","запутался|запуталась|непонимание","confused|lost in options","confundido|desorientado"],
 ["uncertainty","clarity",-1,"Неясность","Uncertainty","Incertidumbre","не понимаю|сомнения|туман в голове","uncertain|unclear","incierto|no entiendo"],
 ["clarity","clarity",1,"Ясность","Clarity","Claridad","понимание|ясно вижу|разобрался","clear|understanding","claro|claridad mental"],
 ["focus","clarity",1,"Собранность","Focus","Enfoque","сосредоточенность|внимание","focused|concentration","concentrado|enfoque"],
 ["stuck","freedom",-1,"Скованность","Stuck","Bloqueo","застрял|застряла|в ловушке","trapped|stuck","atrapado|bloqueado"],
 ["constraint","freedom",-1,"Несвобода","Constrained","Limitación","ограничен|не могу свободно","restricted|constrained","limitado|sin libertad"],
 ["freedom","freedom",1,"Свобода","Freedom","Libertad","свободен|свободна|освобождение","free|liberated","libre|libertad"],
 ["openness","freedom",1,"Открытость","Openness","Apertura","простор|открываюсь","open|spacious","apertura|abierto"],
 ["sadness","hope",-1,"Грусть","Sadness","Tristeza","печаль|грустно|тоска","sad|sorrow","triste|pena"],
 ["discouraged","hope",-1,"Уныние","Discouragement","Desánimo","опускаются руки|нет надежды","discouraged|disheartened","desanimado|desaliento"],
 ["hope","hope",1,"Надежда","Hope","Esperanza","верю в лучшее|надежда есть","hopeful|optimism","esperanzado|esperanza"],
 ["joy","hope",1,"Радость","Joy","Alegría","радостно|воодушевление","joyful|delight","alegre|alegría"],
 ["anger","boundary",-1,"Злость","Anger","Enojo","злюсь|раздражение|гнев","angry|irritated","enfadado|rabia"],
 ["resentment","boundary",-1,"Обида","Resentment","Resentimiento","обижен|горечь|несправедливость","resentful|hurt","resentido|rencor"],
 ["boundaries","boundary",1,"Границы","Boundaries","Límites","личные границы|умею сказать нет","healthy boundaries|limits","límites sanos|decir no"],
 ["assertiveness","boundary",1,"Спокойная сила","Assertiveness","Asertividad","могу постоять за себя|уверенное нет","assertive|firm","asertivo|firme"],
 ["stagnation","motivation",-1,"Застой","Stagnation","Estancamiento","нет движения|ничего не меняется","stagnant|no progress","estancado|sin progreso"],
 ["procrastination","motivation",-1,"Откладывание","Procrastination","Postergación","откладываю|не начинаю","procrastinating|putting off","pospongo|procrastinar"],
 ["motivation","motivation",1,"Мотивация","Motivation","Motivación","хочу действовать|стремление","motivated|drive","motivado|impulso"],
 ["momentum","motivation",1,"Движение вперёд","Momentum","Impulso","начал двигаться|первый шаг","making progress|moving forward","avanzando|en movimiento"],
 ["lost","meaning",-1,"Потеря направления","Lost direction","Sin rumbo","сбился с пути|потерял себя","directionless|lost my way","perdido|sin dirección"],
 ["meaningless","meaning",-1,"Отсутствие смысла","Lack of meaning","Falta de sentido","нет смысла|не вижу зачем","no meaning|pointless","sin sentido|sin propósito"],
 ["meaning","meaning",1,"Смысл","Meaning","Sentido","предназначение|смысл жизни","purpose|meaningful","propósito|sentido de vida"],
 ["direction","meaning",1,"Направление","Direction","Dirección","вижу путь|понятная цель","my direction|life direction","rumbo|dirección vital"],
];
const clusterVector={
 tension:{negative:[82,45,31,38,47,39,43,39],positive:[22,55,76,65,61,67,72,72]},
 safety:{negative:[75,41,30,40,39,44,44,38],positive:[23,58,85,62,61,69,75,67]},
 energy:{negative:[64,16,43,28,47,36,41,32],positive:[26,84,73,78,68,70,70,71]},
 agency:{negative:[65,33,41,17,42,42,32,31],positive:[30,70,72,90,70,71,83,78]},
 connection:{negative:[55,35,33,37,12,49,43,32],positive:[28,64,78,64,88,68,81,76]},
 acceptance:{negative:[71,37,34,35,37,42,14,26],positive:[26,60,78,66,70,68,92,81]},
 clarity:{negative:[65,37,46,39,52,16,48,38],positive:[26,65,73,78,65,91,80,73]},
 freedom:{negative:[66,35,43,32,43,44,41,13],positive:[25,69,77,80,71,75,80,91]},
 hope:{negative:[53,24,37,28,36,36,37,29],positive:[28,65,73,70,69,71,80,80]},
 boundary:{negative:[75,67,28,48,30,44,42,27],positive:[29,67,76,85,71,77,81,74]},
 motivation:{negative:[49,20,50,29,48,43,47,27],positive:[33,78,72,81,67,75,73,84]},
 meaning:{negative:[59,27,37,30,45,30,40,28],positive:[25,73,75,77,70,86,77,78]},
};
export const STATE_DEFINITIONS=Object.freeze(rows.map(([id,cluster,polarity,ru,en,es,ruAliases,enAliases,esAliases])=>{
 const template=clusterVector[cluster][polarity>0?"positive":"negative"];
 return Object.freeze({
   id,clusterId:cluster,polarity,labels:loc(ru,en,es),
   aliases:loc(ruAliases.split("|"),enAliases.split("|"),esAliases.split("|")),
   shortMeaning:loc(ru,en,es),
   vectorAxes:Object.freeze(Object.fromEntries(STSE_AXES.map((axis,index)=>[axis,template[index]]))),
   variability:15,ambiguityHints:[],enabled:true,editorialReviewStatus:"proposed",
   taxonomyVersion:STSE_VERSION,
 });
}));
const stateIndex=new Map(STATE_DEFINITIONS.map(x=>[x.id,x]));
export function getStateDefinition(id){return stateIndex.get(id)||null;}
export function listStates(locale="ru"){
 const lang=STSE_LOCALES.includes(locale)?locale:"ru";
 return STATE_DEFINITIONS.map(x=>({id:x.id,clusterId:x.clusterId,label:x.labels[lang],polarity:x.polarity}));
}
// Stages are editorial operations, not a medical treatment protocol.
const templates=[
 ["grounding",["tension","safety","boundary"],["safety","agency","clarity","connection"],["acknowledge","safe_place","find_support","quiet_step"],"gentle",["fire","cave"]],
 ["restoration",["energy","tension"],["energy","agency","hope","safety"],["rest","shelter","replenish","gentle_return"],"gentle",["fire","mountain"]],
 ["agency",["agency","motivation"],["agency","motivation","freedom"],["recognize_limit","find_resource","small_action","own_voice"],"steady",[]],
 ["acceptance",["acceptance"],["acceptance","agency","connection","safety"],["safe_distance","witness_without_judgment","self_kindness","soft_expression"],"gentle",["mirror","fire"]],
 ["connection",["connection","acceptance"],["connection","safety","hope"],["respect_distance","notice_warmth","invite_connection","keep_choice"],"gentle",[]],
 ["clarification",["clarity","meaning","motivation"],["clarity","meaning","agency"],["name_uncertainty","notice_signal","compare_choices","orient"],"steady",[]],
 ["boundary",["boundary","agency","tension"],["boundary","agency","safety"],["recognize_feeling","name_boundary","respect_space","quiet_strength"],"steady",["fire"]],
 ["release",["tension","boundary","hope"],["safety","hope","freedom"],["witness","breathe_space","loosen","settle"],"gentle",["fire","cave"]],
 ["freedom",["freedom","motivation"],["freedom","agency","meaning"],["see_constraint","find_opening","safe_experiment","choose_freedom"],"steady",[]],
 ["hope",["hope","meaning"],["hope","meaning","motivation"],["notice_loss","small_light","possibility","patient_hope"],"gentle",[]],
 ["decision",["meaning","clarity","motivation","agency"],["agency","meaning","clarity"],["pause","weigh_values","choose_one_step","reflect"],"steady",[]],
 ["integration",["*"],["*"],["notice_present","support","integrate","continue_gently"],"gentle",["fire","cave"]],
];
export const TRANSITION_TEMPLATES=Object.freeze(templates.map(([id,allowedFrom,allowedTo,stages,pace,disallowedMotifIds])=>Object.freeze({
 id,allowedFrom,allowedTo,stages,pace,disallowedMotifIds,
 edges:stages.slice(1).map((stage,i)=>Object.freeze({id:id+"-edge-"+(i+1),from:stages[i],to:stage,
   operation:id,activationDeltaRange:pace==="gentle"?[-20,15]:[-15,20],
   cost:1+i/10,reviewStatus:"editorial_proposed",version:STSE_VERSION})),
 minStages:2,maxStages:5,maxIntensity:pace==="steady"?"medium":"high",
 reviewerStatus:"editorial_proposed",version:STSE_VERSION,
})));
export const TRANSITION_BY_ID=new Map(TRANSITION_TEMPLATES.map(x=>[x.id,x]));
export const PROFILE_TRANSITIONS=Object.freeze({
 journey:["clarification","freedom","agency","decision"],
 shelter:["grounding","restoration","connection","release"],
 reframe:["acceptance","boundary","clarification","hope"],
 integration:["integration","decision","connection","restoration"],
});
export const EXTRA_SCENARIO_TRANSITIONS=Object.freeze({
 5:["clarification","decision"],
 6:["acceptance","connection"],
 7:["grounding","boundary","release"],
 8:["agency","restoration","freedom"],
});
export const EXTRA_SCENARIO_MOTIFS=Object.freeze({
 5:["compass","window","key","path","lantern"],
 6:["garden","house","bridge","hands","flower"],
 7:["stone","roots","nest","house","stream"],
 8:["seed","sunrise","stairs","path","tree"],
});
export const EXTRA_SCENARIO_STYLES=Object.freeze({
 5:["nature","cinematic","symbolic"],
 6:["nature","meditative","realistic"],
 7:["meditative","nature","minimal"],
 8:["cinematic","nature","realistic"],
});
export const STSE_MOTIF_BY_ID=new Map(MYTUBE_VISUAL_MOTIFS.map(x=>[x.id,x]));
export const STSE_STYLE_BY_ID=new Map(MYTUBE_VISUAL_STYLES.map(x=>[x.id,x]));
export const STSE_STYLE_ALIASES=Object.freeze({
 nature_real:"nature",nature_cinematic:"cinematic",symbolic_dream:"symbolic",
 gentle_abstract:"abstract",mythic_temple:"sacred",illustration_watercolor:"symbolic",
 realistic_people:"realistic",cosmic_contemplative:"cosmic",
});
export function normalizeStyleId(value){
 if(!value)return null;
 const id=STSE_STYLE_ALIASES[value]||value;
 return STSE_STYLE_BY_ID.has(id)?id:null;
}
export function motifDetails(motifId,locale="ru"){
 const row=STSE_MOTIF_BY_ID.get(motifId);
 if(!row)return null;
 const lang=STSE_LOCALES.includes(locale)?locale:"ru";
 return {id:row.id,label:row.label[lang],meaning:row.meaning[lang],
   emotionalAffordances:["editorial_nonuniversal"],stageAffordances:["opening","middle","closing"],
   visualTags:[...row.visualTags],imageEvidenceStatus:"unverified_literal_frame",
   sourceKind:"editorial_symbol_not_physical_mp4"};
}
export function auditStateTransitionRegistry(){
 const errors=[];const states=new Set(),motifs=new Set(MYTUBE_VISUAL_MOTIFS.map(x=>x.id)),styles=new Set(MYTUBE_VISUAL_STYLES.map(x=>x.id));
 for(const row of STATE_DEFINITIONS){
   if(states.has(row.id))errors.push("duplicate_state:"+row.id);
   states.add(row.id);
   for(const lang of STSE_LOCALES)
     if(!row.labels[lang]||!row.aliases[lang]?.length)errors.push("missing_state_locale:"+row.id+":"+lang);
   if(STSE_AXES.some(key=>!Number.isFinite(row.vectorAxes[key])||row.vectorAxes[key]<0||row.vectorAxes[key]>100))
     errors.push("invalid_state_vector:"+row.id);
 }
 for(const record of TRANSITION_TEMPLATES){
   if(record.stages.length<2||record.stages.length>5)errors.push("bad_path:"+record.id);
   for(let i=1;i<record.edges.length;i++)if(record.edges[i-1].to!==record.edges[i].from)errors.push("gap:"+record.id);
 }
 for(const slot of [5,6,7,8]){
   const choices=EXTRA_SCENARIO_MOTIFS[slot];
   if(choices.length!==5||new Set(choices).size!==5||choices.some(id=>!motifs.has(id)))errors.push("invalid_motifs:"+slot);
   if(EXTRA_SCENARIO_STYLES[slot].length<2||EXTRA_SCENARIO_STYLES[slot].some(id=>!styles.has(id)))
     errors.push("invalid_styles:"+slot);
 }
 if(states.size<40||states.size>60)errors.push("state_count");
 return {ok:errors.length===0,counts:{states:states.size,clusters:Object.keys(clusterVector).length,
   templates:TRANSITION_TEMPLATES.length,motifs:motifs.size,styles:styles.size},errors};
}
