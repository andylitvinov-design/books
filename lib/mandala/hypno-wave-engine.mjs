/**
 * Wave v2: private, deterministic interpretation of the visitor's NOW and GOAL.
 * Never uploads, stores or echoes raw notes. Not a diagnosis, clinical triage,
 * or a general language model. Unknown wording falls back transparently.
 */
export const WAVE_ENGINE_VERSION = 'wave-intent-v2';

const LANGUAGES = new Set(['ru', 'en', 'es']);
const CONCEPT_ORDER = ['boundaries', 'voice', 'rest', 'confidence', 'clarity', 'steps', 'connection', 'worth', 'planning', 'calm'];
const GOAL_CUES = {
  boundaries: /границ|сказат[ььи] нет|говорит[ььи] нет|отказ|меньше (?:общени|контакт|встреч|говор)|реже говор|boundar|say no|less (?:contact|meeting)|(?:speak|talk) less|l[ií]mit|decir que no|menos (?:contact|reuni)|hablar menos/iu,
  voice: /выступ|говор|голос|выражат|мысл|общат|speak|express|voice|present|talk|hablar|expres|voz|presentaci/iu,
  rest: /отдых|выгора|береч[ьи]|берег|восстанов|устал|сил|передыш|rest|recover|burnout|tired|energy|pause|descans|agot|cansad|fuerza/iu,
  confidence: /уверен|смелост|решител|confidence|confident|brav|confianza|segurid/iu,
  clarity: /ясност|понят|разобрат|приоритет|решени|clear|clarity|priorit|decision|claridad|prioridad|decisi/iu,
  steps: /начать|перв(?:ый|ого) шаг|постепен|действова|достиг|двигат|планир|start|small step|progress|gradual|advance|plan|empez|primer paso|avanz|progres|planear/iu,
  connection: /отношени|близост|довер|друж|поддержк|связ|relationship|connect|trust|support|relaci|cercan|confianz|apoyo/iu,
  worth: /ценност|самооцен|достоин|уважа|самокрит|worth|value|respect|self.esteem|valor|merec|respet/iu,
  planning: /бюджет|деньг|доход|оплат|зарплат|финанс|money|income|salary|budget|finance|dinero|ingres|salario|presupuesto|finanza/iu,
  calm: /спокой|тревог|напряж|волнени|стресс|calm|anxi|stress|tension|peace|calma|ansiedad|estr[eé]s|tranquil/iu,
};
const CURRENT_CUES = {
  fear: /страх|боюсь|страш|оцен|осуд|критик|reject|judg|critici|afraid|fear|nervous|miedo|juzg|cr[ií]tic|temor/iu,
  exhaustion: /выгора|устал|истощ|перегруз|нет сил|tired|burnout|exhaust|overload|cansad|agot|sobrecarg/iu,
  rushing: /спеш|тороп|не успева|rushing|hurry|late|prisa|apur/iu,
  uncertainty: /не знаю|неяс|сомнен|неувер|uncertain|doubt|unsure|no s[eé]|incertid|duda/iu,
  pressure: /должен|обязан|стыд|самокрит|pressure|must|shame|critici|presi[oó]n|verg[uü]enz|debo/iu,
};
const EXCLUDE_VOICE = /(?:не хочу|не планирую|don't want to|do not want to|no quiero|prefiero no)\s+(?:(?:больше|снова|more|anymore|m[aá]s)\s+)?(?:выступать|говорить|общаться|present|speak|talk|hablar|presentarme)/iu;
const EXCLUDE_MONEY = /(?:не хочу|don't want|do not want|no quiero)\s+(?:(?:больше|more|m[aá]s)\s+)?(?:денег|дохода|зарабатывать|money|income|earn|dinero|ingresos)/iu;
const URGENT = /покончить с собой|хочу умереть|убить себя|суицид|причинить себе вред|kill myself|want to die|end my life|suicid|self.harm|quiero morir|matarme|hacerme da[nñ]o/iu;

const PHRASES = {
  ru: {
    boundaries:['Мне можно сказать нет','Мои границы имеют значение','Я могу выбирать дистанцию','Мне можно взять время','Я берегу своё пространство'],
    voice:['Мой голос имеет значение','Я говорю в своём ритме','Я учусь выражать мысли','Мне можно сделать паузу','Мои слова достойны внимания'],
    rest:['Мне можно беречь силы','Отдых не нужно заслуживать','Я выбираю посильный темп','Мне можно отдохнуть','Я замечаю свои пределы'],
    confidence:['Я могу пробовать постепенно','Мои усилия имеют значение','Мне можно быть неидеальным','Я учусь доверять себе','Один шаг уже имеет смысл'],
    clarity:['Я могу выбрать главное','Я нахожу следующий шаг','Мне можно не знать всего','Я учусь видеть варианты','Я проясняю свои приоритеты'],
    steps:['Я могу начать с малого','Один шаг уже важен','Мне можно учиться в пути','Я выбираю посильное дело','Я продвигаюсь постепенно'],
    connection:['Я могу выбирать близость','Мне можно говорить о важном','Мои потребности важны','Я замечаю поддержку','Я могу просить о помощи'],
    worth:['Моя ценность не требует побед','Мой труд имеет значение','Я могу беречь себя','Я уважаю свой выбор','Мне можно ошибаться'],
    planning:['Я могу обсудить условия','Мой труд достоин внимания','Я делаю ясный финансовый шаг','Мне можно планировать','Я выбираю разумный темп'],
    calm:['Мне можно сделать паузу','Я могу замедлиться','Я выбираю свой ритм','Я замечаю опору вокруг','Не всё нужно решать сейчас'],
  },
  en: {
    boundaries:['I am allowed to say no','My boundaries matter','I can choose my distance','I can take time to respond','I protect my own space'],
    voice:['My voice matters','I speak at my own pace','I am learning to speak up','I can pause and continue','My words deserve attention'],
    rest:['I can conserve my energy','Rest does not need to be earned','I can choose a gentle pace','I may take time to rest','I can notice my limits'],
    confidence:['I can try one small step','My effort matters','I do not have to be perfect','I am learning to trust myself','Small progress still matters'],
    clarity:['I can choose what matters','I can find my next step','I need not know everything','I can explore my options','I clarify my priorities'],
    steps:['I can start small','One small step counts','I can learn along the way','I choose one manageable task','I can move forward gradually'],
    connection:['I can choose closeness','I can speak about my needs','My needs matter','I can notice support','I may ask for help'],
    worth:['My worth is not a prize','My work has value','I can be kind to myself','I respect my choices','I am allowed to make mistakes'],
    planning:['I can discuss fair terms','My effort deserves attention','I can plan one money step','I may make a simple plan','I can choose a steady pace'],
    calm:['I can take a pause','I can slow down','I choose my own pace','I can notice my support','Not all must be solved today'],
  },
  es: {
    boundaries:['Puedo decir que no','Mis límites importan','Puedo elegir mi distancia','Puedo tomarme un momento','Cuido mi propio espacio'],
    voice:['Mi voz importa','Hablo a mi propio ritmo','Aprendo a expresar mis ideas','Puedo pausar y seguir','Mis palabras tienen valor'],
    rest:['Puedo cuidar mi energía','No tengo que ganar el descanso','Elijo un ritmo amable','Puedo tomar un descanso','Reconozco mis límites'],
    confidence:['Puedo probar poco a poco','Mi esfuerzo importa','No tengo que ser perfecto','Aprendo a confiar en mí','Un paso pequeño vale'],
    clarity:['Puedo elegir lo esencial','Puedo ver mi próximo paso','No necesito saberlo todo','Puedo explorar opciones','Aclaro mis prioridades'],
    steps:['Puedo empezar poco a poco','Un paso pequeño cuenta','Puedo aprender en el camino','Elijo una tarea posible','Avanzo a mi propio ritmo'],
    connection:['Puedo elegir la cercanía','Puedo hablar de mis necesidades','Mis necesidades importan','Puedo notar el apoyo','Puedo pedir ayuda'],
    worth:['Mi valor no exige éxitos','Mi trabajo tiene valor','Puedo tratarme con cariño','Respeto mis decisiones','Puedo cometer errores'],
    planning:['Puedo hablar de condiciones','Mi esfuerzo merece atención','Puedo planear un paso','Puedo organizar mis finanzas','Elijo un ritmo sostenible'],
    calm:['Puedo hacer una pausa','Puedo ir más despacio','Elijo mi propio ritmo','Puedo notar mi apoyo','No todo se resuelve hoy'],
  },
};
const STRATEGY = {
  ru: {
    intro:{fear:'признать волнение без самокритики',exhaustion:'учесть усталость и восстановление',rushing:'снизить давление спешки',uncertainty:'дать место неопределённости',pressure:'ослабить внутреннее давление',other:'создать бережную опору'},
    goal:{boundaries:'постепенно обозначать границы',voice:'свободнее выражать свои мысли',rest:'бережнее распоряжаться силами',confidence:'укреплять посильную уверенность',clarity:'прояснять важное',steps:'переходить к небольшим действиям',connection:'выбирать поддерживающий контакт',worth:'опираться на собственную ценность',planning:'принимать более ясные решения',calm:'двигаться в спокойном ритме'},
    phrase:(a,b)=>`Сначала ${a}, затем ${b}. Фразы должны оставлять право на свой темп.`,
    urgent:'Сейчас важнее живой контакт и безопасность. Если есть непосредственная опасность, обратитесь в местные экстренные службы или к человеку рядом.',
  },
  en: {
    intro:{fear:'allow nervousness without self-criticism',exhaustion:'recognize fatigue and the need for rest',rushing:'reduce the pressure to rush',uncertainty:'make room for uncertainty',pressure:'ease inner pressure',other:'find a gentle starting point'},
    goal:{boundaries:'set your boundaries gradually',voice:'express your thoughts more freely',rest:'protect your energy',confidence:'build confidence step by step',clarity:'clarify what matters',steps:'take manageable steps',connection:'choose supportive connection',worth:'recognize your own value',planning:'make clearer decisions',calm:'move at a calmer pace'},
    phrase:(a,b)=>`First, ${a}; then, ${b}. Keep the words realistic and at your own pace.`,
    urgent:'Your safety and human support matter most right now. If you are in immediate danger, contact local emergency services or someone you trust.',
  },
  es: {
    intro:{fear:'reconocer el temor sin juzgarte',exhaustion:'tener en cuenta el cansancio',rushing:'reducir la presión de las prisas',uncertainty:'dar espacio a la incertidumbre',pressure:'soltar la exigencia interna',other:'encontrar un apoyo suave'},
    goal:{boundaries:'cuidar tus límites paso a paso',voice:'expresar tus ideas con libertad',rest:'cuidar tu energía',confidence:'desarrollar una confianza realista',clarity:'aclarar lo importante',steps:'dar pasos posibles',connection:'elegir vínculos de apoyo',worth:'reconocer tu propio valor',planning:'tomar decisiones más claras',calm:'avanzar con más calma'},
    phrase:(a,b)=>`Primero, ${a}; después, ${b}. Las frases deben respetar tu ritmo.`,
    urgent:'Ahora importan tu seguridad y el apoyo humano. Si hay peligro inmediato, contacta servicios de emergencia o a una persona de confianza.',
  },
};

function words(text) {
  return String(text ?? '').normalize('NFC').replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069<>]/gu,' ').replace(/\s+/gu,' ').trim().slice(0,800);
}
function orderedMatches(text,cues,order) {
  return order.filter(key=>cues[key]?.test(text));
}
export function interpretWaveNotes({locale='ru',currentText='',goalText=''}={}) {
  const lang=LANGUAGES.has(locale)?locale:'ru';
  const current=words(currentText),goal=words(goalText);
  if(URGENT.test(current)||URGENT.test(goal))return {status:'safety_handoff',currentKeys:[],goalKeys:[],language:lang};
  let goalKeys=orderedMatches(goal,GOAL_CUES,CONCEPT_ORDER);
  if(EXCLUDE_VOICE.test(goal) || (goalKeys.includes('boundaries') && /говорит[ььи] нет/iu.test(goal) && !/выступ|выражат|мысл|голос/iu.test(goal)))goalKeys=goalKeys.filter(key=>key!=='voice');
  if(EXCLUDE_MONEY.test(goal))goalKeys=goalKeys.filter(key=>key!=='planning');
  if(/(?:хочу (?:меньше|реже) говор|want to (?:talk|speak) less|quiero hablar menos)/iu.test(goal))
    goalKeys=goalKeys.filter(key=>key!=='voice');
  let currentKeys=orderedMatches(current,CURRENT_CUES,Object.keys(CURRENT_CUES));
  if(/не боюсь|не страшно|not afraid|not scared|no tengo miedo|sin miedo/iu.test(current))
    currentKeys=currentKeys.filter(key=>key!=='fear');
  if(!goalKeys.length && GOAL_CUES.voice.test(current) && currentKeys.includes('fear') && !EXCLUDE_VOICE.test(goal))goalKeys=['voice'];
  if(!goalKeys.length && GOAL_CUES.boundaries.test(current))goalKeys=['boundaries'];
  if(!goalKeys.length && GOAL_CUES.rest.test(current))goalKeys=['rest'];
  return {status:goalKeys.length||currentKeys.length?'personalized':'category_only',currentKeys:currentKeys.slice(0,2),goalKeys:goalKeys.slice(0,2),language:lang};
}
/** @param {{locale:string,theme:string,problemIndex:number,goalId:string,tone:string,kind:string,focus:string,length:string,currentText?:string,goalText?:string,round?:number,fallbackStrategy:string,fallbackPhrases:string[]}} input */
export function buildWaveNarrativeDraft(input){
  const parsed=interpretWaveNotes(input);
  const lang=parsed.language,copy=STRATEGY[lang];
  if(parsed.status==='safety_handoff')return {status:'safety_handoff',strategy:copy.urgent,phrases:[],goalConcepts:[],currentConcepts:[],engineVersion:WAVE_ENGINE_VERSION};
  if(parsed.status==='category_only')return {status:'category_only',strategy:input.fallbackStrategy,phrases:input.fallbackPhrases.slice(0,5),goalConcepts:[],currentConcepts:[],engineVersion:WAVE_ENGINE_VERSION};
  const goals=parsed.goalKeys;
  const focus=goals[0] || ({fear:'confidence',exhaustion:'rest',rushing:'calm',uncertainty:'clarity',pressure:'worth'})[parsed.currentKeys[0]] || 'steps';
  const second=goals[1];
  const issue=parsed.currentKeys[0]||'other';
  const round=Math.max(0,Math.floor(Number(input.round)||0));
  const source=PHRASES[lang];
  const primary=source[focus],secondary=second?source[second]:[];
  const fallback=source[issue==='exhaustion'?'rest':issue==='fear'?'calm':issue==='pressure'?'worth':'steps'];
  const rotation=round%3;
  let pool=[primary[rotation],primary[(rotation+1)%5],
    ...(secondary.length?[secondary[(rotation+1)%5]]:[]),
    fallback[(rotation+2)%5],primary[(rotation+2)%5],
    ...(secondary.length?[secondary[(rotation+3)%5]]:[]),
    ...primary,...secondary,...fallback];
  if(input.tone==='uplifting')pool=[primary[(rotation+3)%5],...pool,source.steps[(rotation+1)%5]];
  if(input.kind==='action'||input.focus==='action')pool=[source.steps[rotation],...pool];
  const excluded=goals.includes('rest')&&EXCLUDE_MONEY.test(words(input.goalText))?new Set(source.planning):new Set();
  const maxLength=input.length==='short'?26:36;
  const phrases=[...new Set([...pool,...source.steps,...source.calm].map(s=>s.trim()))]
    .filter(s=>s&&[...s].length<=maxLength&&!excluded.has(s)).slice(0,5);
  // Exactly five choices preserves the legacy presetOverride adapter. No invented phrases.
  const strategy=copy.phrase(copy.intro[issue],copy.goal[focus]);
  return {status:'personalized',strategy,phrases,goalConcepts:goals,currentConcepts:parsed.currentKeys,engineVersion:WAVE_ENGINE_VERSION};
}