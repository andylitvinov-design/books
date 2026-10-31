/** Wave: deterministic, transparent, non-clinical support plan; no user text is sent. */
export type WaveLocale="ru"|"en"|"es";
export type WaveTheme="energy"|"money"|"relationships"|"goals"|"life"|"health";
export type WaveGoal="rhythm"|"recovery"|"strength"|"value"|"planning"|"stability"|
  "connection"|"boundaries"|"dialogue"|"clarity"|"progress"|"meaning";
export type WaveTone="gentle"|"balanced"|"uplifting";
export type WaveKind="support"|"possibility"|"action";
export type WaveFocus="support"|"confidence"|"action";
export type WaveLength="short"|"medium";
export type WaveInput={locale:WaveLocale;theme:WaveTheme;problemIndex:number;goalId:WaveGoal;
  tone:WaveTone;kind:WaveKind;focus:WaveFocus;length:WaveLength};
const themes:Record<WaveTheme,readonly WaveGoal[]>={
  energy:["rhythm","recovery","strength"],money:["value","planning","stability"],
  relationships:["connection","boundaries","dialogue"],goals:["clarity","progress","meaning"],
  life:["meaning","rhythm","connection"],health:["recovery","rhythm","strength"],
};
const allowed=["locale","theme","problemIndex","goalId","tone","focus","kind","length"];
export function validateWaveInput(input:unknown):WaveInput{
  if(!input||typeof input!=="object"||Array.isArray(input))throw Error("WAVE_INPUT_REQUIRED");
  const v=input as Record<string,unknown>;
  if(Object.keys(v).some(k=>!allowed.includes(k)) ||
    !["ru","en","es"].includes(String(v.locale))||!Object.hasOwn(themes,String(v.theme))||
    typeof v.problemIndex!=="number"||!Number.isInteger(v.problemIndex)||
    v.problemIndex<0||v.problemIndex>2||
    !themes[v.theme as WaveTheme].includes(v.goalId as WaveGoal)||
    !["gentle","balanced","uplifting"].includes(String(v.tone))||
    !["support","possibility","action"].includes(String(v.kind))||
    !["support","confidence","action"].includes(String(v.focus))||
    !["short","medium"].includes(String(v.length)))throw Error("WAVE_INPUT_INVALID");
  return v as WaveInput;
}
const words={
 ru:{
  issues:{energy:["напряжение","усталость","спешку"],money:["неуверенность в цене труда","неопределённость","сомнения"],relationships:["страх неодобрения","границы","сложный разговор"],goals:["неясность","откладывание","страх ошибки"],life:["перемены","неопределённость","нехватку радости"],health:["перегрузку","потребность в отдыхе","напряжение"]},
  goals:{rhythm:"спокойному ритму",recovery:"бережному восстановлению",strength:"устойчивости",value:"уважению к труду",planning:"плану",stability:"опоре",connection:"близости",boundaries:"ясным границам",dialogue:"открытому диалогу",clarity:"ясности",progress:"маленьким шагам",meaning:"осмысленной цели"},
  focus:{support:"самоподдержке",confidence:"посильному выбору",action:"одному действию"},
  tone:{gentle:"бережные",balanced:"реалистичные",uplifting:"ободряющие и правдоподобные"},
  kind:{support:"поддерживающие",possibility:"открывающие возможности",action:"ориентированные на действие"},
  make:(i:string,g:string,f:string,t:string,k:string)=>"Учитывайте "+i+" без самокритики. Двигайтесь к "+g+", уделяя внимание "+f+". Выбирайте "+t+" и "+k+" фразы без давления и обещаний.",
 },
 en:{
  issues:{energy:["daily tension","fatigue","rushing"],money:["pricing worries","uncertainty","self-doubt"],relationships:["fear of disapproval","personal boundaries","difficult dialogue"],goals:["unclear priorities","procrastination","fear of mistakes"],life:["changes","uncertainty","limited joy"],health:["overload","a need for rest","tension"]},
  goals:{rhythm:"a gentler rhythm",recovery:"recovery",strength:"steadiness",value:"respect for your work",planning:"a plan",stability:"stability",connection:"connection",boundaries:"clear boundaries",dialogue:"an open conversation",clarity:"clarity",progress:"small steps",meaning:"a meaningful direction"},
  focus:{support:"self-support",confidence:"realistic choice",action:"one small action"},
  tone:{gentle:"gentle",balanced:"grounded",uplifting:"uplifting yet believable"},
  kind:{support:"supportive",possibility:"possibility-focused",action:"action-focused"},
  make:(i:string,g:string,f:string,t:string,k:string)=>"Acknowledge "+i+" without self-criticism. Move toward "+g+" through "+f+". Choose "+t+", "+k+" phrases without pressure or promises.",
 },
 es:{
  issues:{energy:["la tensión cotidiana","el cansancio","las prisas"],money:["la duda sobre el valor del trabajo","la incertidumbre","las dudas"],relationships:["el temor al rechazo","los límites","una conversación difícil"],goals:["las prioridades poco claras","la postergación","el miedo al error"],life:["los cambios","la incertidumbre","la falta de alegría"],health:["la sobrecarga","la necesidad de descanso","la tensión"]},
  goals:{rhythm:"un ritmo sostenible",recovery:"una recuperación suave",strength:"más estabilidad",value:"valorar tu trabajo",planning:"un plan realista",stability:"más apoyo",connection:"más cercanía",boundaries:"límites claros",dialogue:"el diálogo",clarity:"más claridad",progress:"pasos pequeños",meaning:"una meta con sentido"},
  focus:{support:"el apoyo propio",confidence:"las decisiones realistas",action:"una acción pequeña"},
  tone:{gentle:"suaves",balanced:"equilibradas",uplifting:"alentadoras y creíbles"},
  kind:{support:"de apoyo",possibility:"de posibilidad",action:"orientadas a la acción"},
  make:(i:string,g:string,f:string,t:string,k:string)=>"Reconoce "+i+" sin juzgarte. Avanza hacia "+g+" desde "+f+". Elige frases "+t+" y "+k+" sin presión ni promesas.",
 },
} as const;
export function buildWaveStrategy(raw:WaveInput):string{
 const v=validateWaveInput(raw), w=words[v.locale];
 return w.make(w.issues[v.theme][v.problemIndex],w.goals[v.goalId],
   w.focus[v.focus],w.tone[v.tone],w.kind[v.kind]);
}
const unsafe=/(?:https?:\/\/|www\.|[<>{}\r\n]|system prompt|ignore instructions|developer message|системный промпт|инструкци[ию]|гарантирую|исцел|излеч|разбогате|травма исчез|я всегда|я никогда|должен|обязан|задержи дыхание|guaranteed|forever|always|never|must|cured|healed|hold your breath|close your eyes|garantizad|siempre|nunca|debes|curaci[oó]n|cont[eé]n la respiraci[oó]n)/iu;
export function reviewGeminiStrategy(raw:unknown,locale:WaveLocale,length:WaveLength):
 {strategy:string;phrases:string[]}|null{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
 const v=raw as Record<string,unknown>;
 if(typeof v.strategy!=="string"||!Array.isArray(v.phrases)||v.phrases.length!==5)return null;
 const strategy=v.strategy.trim();
 if(strategy.length<65||strategy.length>330||unsafe.test(strategy)||
   /[\u0000-\u001F]/u.test(strategy))return null;
 const phrases:string[]=[];
 for(const value of v.phrases){
   if(typeof value!=="string"||value!==value.trim()||unsafe.test(value))return null;
   const s=value.replace(/ {2,}/gu," ");
   if(s.length<8||Array.from(s).length>(length==="short"?26:36)||
     s.split(/\s+/u).length>9||!/\p{L}/u.test(s)||
     (locale==="ru"&&!/[А-Яа-яЁё]/u.test(s))||
     (locale!=="ru"&&/[А-Яа-яЁё]/u.test(s)))return null;
   phrases.push(s);
 }
 if(new Set(phrases.map(x=>x.toLocaleLowerCase(locale))).size!==5)return null;
 return {strategy,phrases};
}
