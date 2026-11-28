// Editorial topic retrieval only. No inferred client traits, no persistence or provider calls.
// The raw utterance is transient input; returned data is a fixed persona-owned entry ID.
import {getCoachPersonalityMemory} from './coach-personality-memory.mjs';
export const COACH_MEMORY_RETRIEVAL_VERSION='hh-coach-memory-retrieval-v1';
const lex={
  "care": [
    "overcommit*; caregiv*; helping too much; taking care; saying yes",
    "забот*; перегруз*; всем помога*; не могу отказать",
    "cuid*; sobrecarg*; ayudar demasiado; decir que sí"
  ],
  "boundary": [
    "saying no; boundaries; boundary; guilt; refuse",
    "отказ*; границ*; чувству вину; виноват*; вина",
    "decir que no; límite*; culpa; rechazar"
  ],
  "reciprocity": [
    "reciproc*; mutual support; receive help; receiving help; ask for help",
    "взаимност*; взаимопомощ*; принимать помощь; принять помощь; просить помощи",
    "reciproc*; ayuda mutua; recibir ayuda; pedir ayuda"
  ],
  "experiment": [
    "experiment*; prototype*; test an idea; untested; uncertainty; assumption*",
    "эксперимент*; прототип*; провер* гипотез*; непровер*; предположен*",
    "experiment*; prototip*; hipótesis; sin probar; incertidumbre"
  ],
  "failure": [
    "failure; failed; mistake*; setback*; didn't work",
    "неудач*; провал*; ошиб*; не получилось",
    "fracaso*; falló; error*; contratiempo*; no funcionó"
  ],
  "money": [
    "money; budget*; financial; savings; expensive; afford*; cost*",
    "денег; деньг*; бюджет*; финанс*; сбережен*; дорого; стоимост*",
    "dinero; presupuesto*; financ*; ahorro*; caro; coste*; costo*"
  ],
  "relationship": [
    "relationship*; couple*; partner*; disagreement*; conflict*",
    "отношени*; партнер*; супруг*; разноглас*; конфликт*",
    "relación*; relaciones; pareja*; desacuerdo*; conflicto*"
  ],
  "approval": [
    "approval; disappoint*; judgment; rejection; shame",
    "одобр*; разочар*; осужд*; стыд*; отвержен*",
    "aprobación; decepc*; juicio; rechazo; vergüenza"
  ],
  "silence": [
    "unanswered; no reply; silence; not responding; ignored my message",
    "не ответ*; молч*; без ответа; игнориру*",
    "sin respuesta; silencio; no responde; no contest*"
  ],
  "decision": [
    "decision*; option*; choice*; choose; alternative*",
    "решени*; вариант*; выбор*; выбра*; альтернатив*",
    "decisión*; decisiones; opción*; opciones; elegir; alternativa*"
  ],
  "priority": [
    "priorit*; negotiation*; tradeoff*; trade off; competing demands",
    "приоритет*; переговор*; компромисс*; важнее; одновременно",
    "prioridad*; negoci*; compromiso*; demandas contrapuestas"
  ],
  "meaning": [
    "purpose; meaning of life; meaning; vocation; life direction",
    "смысл*; предназначен*; призвани*; жизненный путь",
    "propósito; sentido; vocación; rumbo vital"
  ],
  "change": [
    "tradition*; old pattern*; recurring pattern*; change*; transition*",
    "традици*; привычн* сценар*; повторя*; перемен*; изменен*",
    "tradición*; patrón*; patrones; cambio*; transición*"
  ],
  "future": [
    "future; uncertain; uncertainty; unknown",
    "будущ*; неопредел*; неизвестн*",
    "futuro; incertidumbre; inciert*; desconocid*"
  ],
  "courage": [
    "courage; brave; challenge*; fear; afraid",
    "смелост*; мужеств*; вызов*; страх*; боюсь",
    "valor; valentía; desafío*; miedo; temo"
  ],
  "loyalty": [
    "loyalty; prove loyalty; prove commitment; peer pressure; friendship",
    "лояльност*; верност*; доказ* преданност*; давлен* групп*; дружб*",
    "lealtad; demostrar compromiso; presión del grupo; amistad"
  ],
  "wish": [
    "wish*; desire*; dream*; possibility; possibilities",
    "желани*; мечт*; возможност*",
    "deseo*; sueño*; posibilidad*"
  ],
  "leadership": [
    "leadership; leader*; authority; responsibility; accountability",
    "лидер*; руковод*; власт*; ответствен*",
    "liderazgo; líder*; autoridad; responsabil*"
  ],
  "fairness": [
    "fairness; fair; allocation; scarce resources; favoritism",
    "справедлив*; распределен*; ограничен* ресурс*; фаворит*",
    "justicia; equidad; repartir; recursos escasos; favoritismo"
  ],
  "criticism": [
    "criticism; feedback; challenged; critique*",
    "критик*; обратная связь; возраз*; оспор*",
    "crítica*; retroalimentación; cuestion*"
  ],
  "identity": [
    "authentic*; self expression; being myself; being different; identity; belong*",
    "аутентич*; самовыраж*; быть собой; отлича*; идентич*; принадлеж*",
    "autentic*; expresión personal; ser yo; ser diferente; identidad; pertene*"
  ],
  "taste": [
    "taste; preferences; personal style; aesthetic*",
    "вкус*; предпочтени*; личный стиль; эстетик*",
    "gusto*; preferencia*; estilo personal; estética*"
  ],
  "habit": [
    "habit*; routine*; consistency; perfection*; schedule*",
    "привыч*; рутин*; регулярност*; постоянств*; перфекционизм*; распоряд*",
    "hábito*; rutina*; constancia; perfeccion*; horario*"
  ],
  "evidence": [
    "evidence; conflicting information; fact*; assumption*; interpretation*",
    "доказательств*; факт*; противореч*; предположен*; интерпретац*",
    "evidencia; hecho*; contradic*; suposición*; interpretación*"
  ],
  "correction": [
    "correct*; changed my mind; revise an opinion; wrong about",
    "исправ*; ошиб*; поменял мнение; пересмотр*; изменил мнение",
    "correg*; rectific*; cambié de opinión; equivoc*"
  ],
  "creative": [
    "creative; creativity; design*; sketch*; art; artistic; artwork",
    "творчеств*; креатив*; дизайн*; эскиз*; искусств*",
    "creativ*; diseño*; boceto*; arte; artístic*"
  ],
  "collaboration": [
    "collaborat*; teamwork; shared design; coauthor*",
    "сотруднич*; совместн*; командн*; соавтор*",
    "colabor*; trabajo en equipo; diseño compartido; coautor*"
  ]
};
const index={
  "mira": {
    "episode-01": [
      "care",
      "reciprocity"
    ],
    "judgment-01": [
      "care",
      "boundary"
    ],
    "reaction-01": [
      "boundary",
      "approval"
    ],
    "judgment-02": [
      "reciprocity",
      "relationship"
    ],
    "reaction-02": [
      "reciprocity"
    ]
  },
  "max": {
    "episode-01": [
      "experiment",
      "money"
    ],
    "judgment-01": [
      "experiment",
      "future"
    ],
    "reaction-01": [
      "failure"
    ],
    "judgment-02": [
      "money",
      "experiment"
    ],
    "reaction-02": [
      "experiment"
    ]
  },
  "sofia": {
    "episode-01": [
      "relationship",
      "collaboration"
    ],
    "judgment-01": [
      "relationship"
    ],
    "reaction-01": [
      "approval",
      "relationship"
    ],
    "judgment-02": [
      "silence",
      "evidence"
    ],
    "reaction-02": [
      "silence"
    ]
  },
  "alex": {
    "episode-01": [
      "decision",
      "evidence"
    ],
    "judgment-01": [
      "decision"
    ],
    "reaction-01": [
      "failure"
    ],
    "judgment-02": [
      "priority",
      "collaboration"
    ],
    "reaction-02": [
      "priority"
    ]
  },
  "merlin": {
    "episode-01": [
      "meaning",
      "change"
    ],
    "judgment-01": [
      "meaning"
    ],
    "reaction-01": [
      "future"
    ],
    "judgment-02": [
      "change"
    ],
    "reaction-02": [
      "change"
    ]
  },
  "harry": {
    "episode-01": [
      "courage",
      "collaboration"
    ],
    "judgment-01": [
      "courage",
      "identity"
    ],
    "reaction-01": [
      "courage"
    ],
    "judgment-02": [
      "loyalty"
    ],
    "reaction-02": [
      "loyalty",
      "approval"
    ]
  },
  "genie": {
    "episode-01": [
      "wish",
      "decision"
    ],
    "judgment-01": [
      "wish",
      "decision"
    ],
    "reaction-01": [
      "decision"
    ],
    "judgment-02": [
      "wish",
      "money"
    ],
    "reaction-02": [
      "wish",
      "money"
    ]
  },
  "caesar": {
    "episode-01": [
      "leadership",
      "correction"
    ],
    "judgment-01": [
      "leadership"
    ],
    "reaction-01": [
      "leadership",
      "relationship"
    ],
    "judgment-02": [
      "fairness",
      "leadership"
    ],
    "reaction-02": [
      "criticism",
      "leadership"
    ]
  },
  "lea": {
    "episode-01": [
      "identity",
      "creative"
    ],
    "judgment-01": [
      "identity",
      "approval"
    ],
    "reaction-01": [
      "identity",
      "approval"
    ],
    "judgment-02": [
      "identity",
      "relationship"
    ],
    "reaction-02": [
      "taste"
    ]
  },
  "noah": {
    "episode-01": [
      "habit"
    ],
    "judgment-01": [
      "habit"
    ],
    "reaction-01": [
      "habit",
      "failure"
    ],
    "judgment-02": [
      "money",
      "habit"
    ],
    "reaction-02": [
      "habit"
    ]
  },
  "iris": {
    "episode-01": [
      "evidence"
    ],
    "judgment-01": [
      "evidence"
    ],
    "reaction-01": [
      "criticism",
      "evidence"
    ],
    "judgment-02": [
      "correction"
    ],
    "reaction-02": [
      "correction"
    ]
  },
  "ray": {
    "episode-01": [
      "creative",
      "criticism"
    ],
    "judgment-01": [
      "creative",
      "criticism"
    ],
    "reaction-01": [
      "creative",
      "approval"
    ],
    "judgment-02": [
      "creative",
      "collaboration"
    ],
    "reaction-02": [
      "creative",
      "taste",
      "collaboration"
    ]
  }
};
const locales=['en','ru','es'];
const tokenize=s=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().match(/[\p{L}\p{N}]+\*?/gu)||[];
function matchTerm(words,term){
 const parts=tokenize(term);if(!parts.length)return false;
 return words.some((_,i)=>parts.every((p,j)=>{const w=words[i+j];return typeof w==='string'&&(p.endsWith('*')?w.startsWith(p.slice(0,-1)):w===p)}));
}
function groupsFor(words,locale){
 const l=locales.indexOf(locale);if(l<0)return new Map();
 return new Map(Object.entries(lex).map(([key,translations])=>{
  const terms=translations[l].split('; ');
  return [key,terms.reduce((n,t)=>n+(matchTerm(words,t)?1:0),0)];
 }).filter(([,n])=>n>0));
}
function validMode(mode){return ['answer','explore','action','review'].includes(mode)}
export function selectCoachMemoryEntry(id,{message,locale='en',mode,storyRequested=false,noAdvice=false,distress=false,blocked=false}={}){
 if(blocked||noAdvice||distress||!validMode(mode)||typeof message!=='string'||!message.trim()||!Object.hasOwn(index,id)||!locales.includes(locale))return null;
 const words=tokenize(message.slice(0,1200)).map(w=>w.replace(/\*$/,''));
 const groups=groupsFor(words,locale);
 if(!groups.size)return null;
 const entries=getCoachPersonalityMemory(id)?.entries||[];
 // A fictional episode is eligible only on an explicit existing story request.
 const allowed=storyRequested?['episode']:mode==='answer'?['judgment']:['reaction','judgment'];
 const ranked=entries.filter(e=>allowed.includes(e.kind)).map(e=>{
  const tags=Object.hasOwn(index[id],e.id)?index[id][e.id]:[];
  const hits=tags.reduce((n,t)=>n+(groups.get(t)||0),0);
  return {entry:e,hits,preference:e.kind==='reaction'?1:0};
 }).filter(x=>x.hits>0).sort((a,b)=>b.hits-a.hits||b.preference-a.preference);
 // Ambiguous equal matches are not grounds for selecting a stored stance.
 if(!ranked.length||(ranked.length>1&&ranked[0].hits===ranked[1].hits&&ranked[0].preference===ranked[1].preference))return null;
 return ranked[0].entry.id;
}
export function buildCoachMemoryCue(id,entryId,{mode,compact=false,storyRequested=false}={}){
 if(!validMode(mode)||typeof entryId!=='string'||!Object.hasOwn(index,id)||!Object.hasOwn(index[id],entryId))return '';
 const entry=getCoachPersonalityMemory(id)?.entries.find(e=>e.id===entryId);
 if(!entry||(entry.kind==='episode'?!storyRequested:storyRequested)||(mode==='answer'&&entry.kind==='reaction'))return '';
 const detail=entry.kind==='episode'?'Clearly fictional story, only if requested: ':entry.kind==='reaction'?'Optional reaction lens: ':'Optional editorial stance: ';
 return compact?' '+detail+entry.text+' Facts, consent and Director first.':' CONTEXTUAL PERSONALITY MEMORY — '+detail+entry.text+' Apply only if genuinely relevant to the latest request. Do not repeat verbatim, infer facts about the client, invent evidence, initiate a story unasked or add an unauthorized question or action. Facts, consent, safety, autonomy and Director first.';
}
export function getCoachMemoryIndexedIds(id){return typeof id==='string'&&Object.hasOwn(index,id)?Object.freeze(Object.keys(index[id])):null}
