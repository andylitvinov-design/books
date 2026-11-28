// Pure composition of an immutable, editorial personality graph. No client storage,
// psychological classification, provider access or authority over the Director.
export const COACH_GRAPH_RELEASE='hh-personality-graph-v1';
export const COACH_GRAPH_IDS=Object.freeze(['mira','max','sofia','alex','merlin','harry','genie','caesar']);
const DIMS=Object.freeze(['care','autonomy','evidence','action','creativity','meaning','discipline','reciprocity','prudence','resilience','authenticity','humility']);
const CONTEXTS=Object.freeze(['ordinary','facts','decision','relationship','creation','meaning','support']);
const TRIGGERS=Object.freeze(['failure','uncertainty','conflict','achievement','pressure','criticism']);
const text=(v,max=1200)=>typeof v==='string'&&v.trim()&&v.length<=max?v.trim():'';
export function normalizeCoachGraph(row,id){
 if(!COACH_GRAPH_IDS.includes(id)||row?.persona_id!==id||row.release_id!==COACH_GRAPH_RELEASE||
    !Array.isArray(row.nodes)||row.nodes.length<40||row.nodes.length>160||
    !Array.isArray(row.edges)||row.edges.length>300||
    !Array.isArray(row.context_weights)||row.context_weights.length!==84)return null;
 const nodes=new Map();
 for(const n of row.nodes){if(!n||!text(n.key,120)||!n.data||typeof n.data!=='object'||Array.isArray(n.data)||nodes.has(n.key))return null;nodes.set(n.key,n);}
 if(!nodes.has('identity')||!nodes.has('algorithm:success')||!nodes.has('algorithm:attitude'))return null;
 for(const k of DIMS){const n=nodes.get('dimension:'+k);if(n?.kind!=='dimension'||!Number.isInteger(n.weight)||n.weight<1||n.weight>5)return null;}
 const weights=new Map();
 for(const w of row.context_weights){const key=w.context_key+':'+w.dimension_key;if(!CONTEXTS.includes(w.context_key)||!DIMS.includes(w.dimension_key)||!Number.isInteger(w.multiplier)||w.multiplier<0||w.multiplier>3||weights.has(key))return null;weights.set(key,w.multiplier);}
 const edges=row.edges;
 if(edges.some(e=>!e||!nodes.has(e.from_key)||!nodes.has(e.to_key)))return null;
 const values=[...nodes.values()].filter(n=>n.kind==='value').sort((a,b)=>a.ordinal-b.ordinal);
 const principles=[...nodes.values()].filter(n=>n.kind==='principle').sort((a,b)=>a.ordinal-b.ordinal);
 const events=[...nodes.values()].filter(n=>n.kind==='event').sort((a,b)=>a.ordinal-b.ordinal);
 const reactions=[...nodes.values()].filter(n=>n.kind==='reaction');
 if(values.length!==5||principles.length!==5||events.length!==4||reactions.length!==6||values.some(n=>!text(n.data.text))||principles.some(n=>!text(n.data.text))||events.some(n=>!text(n.data.title,150)||!text(n.data.story)||n.data.fictional!==true))return null;
 if(TRIGGERS.some(t=>!text(nodes.get('reaction:'+t)?.data?.text)||!edges.some(e=>e.from_key==='reaction:'+t&&e.relation==='activates'&&e.to_key.startsWith('dimension:'))))return null;
 return {id,release:row.release_id,nodes,weights,edges,values,principles,events,reactions};
}
export function composeCoachGraph(graph,{context='ordinary',trigger=null,gentle=false}={}){
 if(!graph)return null;
 const lens=gentle?'support':CONTEXTS.includes(context)?context:'ordinary';
 const priorities=DIMS.map((key,i)=>({key,score:graph.nodes.get('dimension:'+key).weight*graph.weights.get(lens+':'+key),i})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||b.i-a.i).slice(0,3);
 const reaction=!gentle&&TRIGGERS.includes(trigger)?graph.nodes.get('reaction:'+trigger):null;
 const reactionDimensions=reaction?graph.edges.filter(e=>e.from_key===reaction.key&&e.relation==='activates').map(e=>e.to_key.replace('dimension:','')):[];
 const linkedEvents=graph.events.filter(n=>graph.edges.some(e=>e.from_key===n.key&&e.relation==='illustrates'&&graph.nodes.get(e.to_key)?.kind==='domain'&&graph.nodes.get(e.to_key)?.data?.context===lens));
 return {lens,priorities,reaction:reaction?text(reaction.data.text):'',reactionDimensions,linkedEvents,gentle};
}
// Advisory hints only. A language model still answers an arbitrary actual topic;
// keywords cannot authorize an interpretation, emotional assessment or action.
const contextHints=[
 ['relationship',/(relationship|marriage|partner|friendship|love|отношени|любов|дружб|партн[её]р|pareja|amistad|relaci[oó]n|amor)/iu],
 ['creation',/(creative|creativity|artwork|painting|music|творчеств|искусств|музык|creatividad|arte|m[uú]sica)/iu],
 ['meaning',/(purpose|meaning of life|values|смысл|предназначен|ценност|prop[oó]sito|sentido de la vida|valores)/iu],
 ['decision',/(business|career|money|budget|decision|investment|work|бизнес|деньг|карьер|решени|бюджет|работ[ауы]|negocio|dinero|carrera|presupuesto|decisi[oó]n|trabajo)/iu],
 ['facts',/^(?:what is|how many|when did|is it true|что такое|сколько|правда ли|qu[eé] es|cu[aá]ntos|es verdad)/iu]
];
const triggerHints=[
 ['failure',/(failed|failure|setback|неудач|провал|fracaso|fracas[eé])/iu],
 ['criticism',/(criticized|criticism|критик|осужд|cr[ií]tica|criticaron)/iu],
 ['conflict',/(conflict|argument|disagreement|конфликт|ссор|разноглас|conflicto|discusi[oó]n)/iu],
 ['achievement',/(achieved|succeeded|achievement|достиг|удал[оа]сь|logr[eé]|logro)/iu],
 ['pressure',/(pressure|overload|давлени|перегруз|presi[oó]n|sobrecarga)/iu],
 ['uncertainty',/(not sure|uncertainty|не уверен|неопредел[её]н|incertidumbre|no estoy segur)/iu]
];
export function coachGraphHints(input={},directive={}){
 const message=typeof input.message==='string'?input.message.slice(0,1600):'';
 const gentle=input.authoritativeNoAdvice===true||directive.graphNoAdvice===true||directive.personality?.mode==='listen'||directive.personality?.mode==='support'||directive.personality?.style?.pace==='slow'&&directive.personality?.style?.directness<=2&&Boolean(directive.empathyReflection);
 return {context:contextHints.find(([,r])=>r.test(message))?.[0]||'ordinary',trigger:triggerHints.find(([,r])=>r.test(message))?.[0]||null,gentle};
}
export function buildCoachGraphInstruction(graph,{input=null,directive=null}={}){
 if(!graph)return '';
 const node=k=>graph.nodes.get(k)?.data;
 const alg=node('algorithm:success'),att=node('algorithm:attitude');
 const core=node('identity');
 if(!text(alg?.text)||!text(att?.text)||!text(core?.purpose))return '';
 const combinations=CONTEXTS.map(c=>c+': '+composeCoachGraph(graph,{context:c}).priorities.map(p=>p.key).join(' + ')).join('; ');
 const reactionMap=TRIGGERS.map(t=>{const c=composeCoachGraph(graph,{trigger:t});return t+' ['+c.reactionDimensions.join('+')+']: '+c.reaction;}).join(' | ');
 const base=['CURATED PERSONALITY GRAPH '+graph.release+' / '+graph.id+'. Editorial identity, not client data or lived human memory.',
 'Purpose: '+text(core.purpose)+'. Ordered values: '+graph.values.map(n=>text(n.data.text)).join(' > ')+'.',
 'Character principles: '+graph.principles.map(n=>text(n.data.text)).join('; ')+'.',
 'Contextual priority combinations: '+combinations+'.',
 'Success algorithm: '+text(alg.text)+' Attitude algorithm: '+text(att.text),
 'Reaction patterns (only when relevant, never infer the client’s feelings): '+reactionMap+'.',
 'Fictional episode anchors: '+graph.events.map(n=>text(n.data.title,150)+' ['+n.data.domain+']').join('; ')+'.',
 'Use these reviewed graph combinations with the actual facts, ordered values, existing canon, voice and Director. Scores are editorial, never diagnoses. No topic whitelist; adapt to mixed or novel topics. Do not read graph labels aloud or force a question. All safety, no-advice, consent, method, evidence and voice-ID gates remain authoritative. Story events are fictional, never factual memories.'].join('\n');
 if(!input)return base;
 const c=composeCoachGraph(graph,coachGraphHints(input,directive||{}));
 const turn=['Advisory current lens: '+c.lens+'; priorities '+c.priorities.map(p=>p.key).join(' + ')+'. Confirm relevance from actual words, not the hint.',c.reaction?'Possible character reaction: '+c.reaction:'',c.gentle?'Gentle support: no unsolicited evaluation or action.':'',directive?.personalExample&&c.linkedEvents.length?'Relevant fictional example anchor: '+text(c.linkedEvents[0].data.title,150)+': '+text(c.linkedEvents[0].data.story)+'. Use only if fitting; no claims of actual experience.':''].filter(Boolean).join(' ');
 return base+'\n'+turn;
}
