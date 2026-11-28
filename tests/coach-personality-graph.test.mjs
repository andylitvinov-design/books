import {test} from 'node:test';
import assert from 'node:assert/strict';
import {COACH_GRAPH_IDS,COACH_GRAPH_RELEASE,normalizeCoachGraph,composeCoachGraph,buildCoachGraphInstruction,coachGraphHints,buildCoachGraphLiveHint} from '../lib/coaching/coach-personality-graph.mjs';
const dims=['care','autonomy','evidence','action','creativity','meaning','discipline','reciprocity','prudence','resilience','authenticity','humility'];
const contexts=['ordinary','facts','decision','relationship','creation','meaning','support'];
const triggers=['failure','uncertainty','conflict','achievement','pressure','criticism'];
function fixture(id){
 const nodes=[],edges=[],context_weights=[];
 const add=(key,kind,data,weight=null,ordinal=0)=>nodes.push({key,kind,data,weight,ordinal});
 const edge=(from_key,to_key,relation)=>edges.push({from_key,to_key,relation});
 add('identity','identity',{purpose:'Support autonomous choices'});
 add('algorithm:success','algorithm',{text:'Evaluate options'});
 add('algorithm:attitude','algorithm',{text:'Respect autonomy'});
 for(const d of dims)add('dimension:'+d,'dimension',{name:d},d==='care'?5:1);
 for(let i=1;i<=5;i++){add('value:'+i,'value',{text:'Value '+i},6-i,i);add('principle:'+i,'principle',{text:'Principle '+i},null,i);edge('principle:'+i,'value:'+i,'guided_by');}
 edge('dimension:care','value:1','activates');
 add('domain:work','domain',{context:'decision',text:'Work'});
 for(let i=1;i<=4;i++){add('event:'+i,'event',{title:'Fictional event '+i,story:'A fictional episode',fictional:true,domain:'work'},null,i);edge('event:'+i,'domain:work','illustrates');}
 for(const t of triggers){add('reaction:'+t,'reaction',{text:'A possible response to '+t});edge('reaction:'+t,'dimension:care','activates');edge('reaction:'+t,'principle:2','guided_by');}
 for(const c of contexts){add('context:'+c,'context',{});for(const d of dims)context_weights.push({context_key:c,dimension_key:d,multiplier:1});}
 return {release_id:COACH_GRAPH_RELEASE,persona_id:id,nodes,edges,context_weights};
}
test('eight published personas: graph activates values, principles, reaction and fictional episode',()=>{
 for(const id of COACH_GRAPH_IDS){
 const g=normalizeCoachGraph(fixture(id),id);assert.ok(g,id);
 const c=composeCoachGraph(g,{context:'decision',trigger:'failure'});
 assert.equal(c.priorities[0].key,'care');assert.equal(c.linkedValues[0].key,'value:1');
 assert.ok(c.linkedPrinciples.some(n=>n.key==='principle:2'));assert.equal(c.linkedEvents.length,4);
 const prompt=buildCoachGraphInstruction(g,{input:{message:'Business failure'},directive:{personalExample:true}});
 assert.match(prompt,/Activated values: Value 1/);assert.match(prompt,/Relevant principles:/);assert.match(prompt,/Relevant fictional example anchor/);
 }
});
test('support/no-advice overrides trigger; arbitrary topic and invalid releases are safe',()=>{
 const r=fixture('mira'),g=normalizeCoachGraph(r,'mira');
 const c=composeCoachGraph(g,{context:'decision',trigger:'failure',gentle:true});
 assert.equal(c.lens,'support');assert.equal(c.reaction,'');
 const p=buildCoachGraphInstruction(g,{input:{message:'Physics',authoritativeNoAdvice:true},directive:{}});
 assert.match(p,/Gentle support: no unsolicited evaluation or action/);
 assert.equal(normalizeCoachGraph({...r,release_id:'unknown'},'mira'),null);
 assert.equal(normalizeCoachGraph({...r,edges:[...r.edges,{from_key:'missing',to_key:'value:1'}]},'mira'),null);
 assert.equal(normalizeCoachGraph(r,'unknown'),null);
});

test('mixed topics blend two contexts and rank the precise episode domain',()=>{
 const r=fixture('mira');
 r.nodes.push({key:'domain:money',kind:'domain',data:{context:'decision',text:'Money'},ordinal:0,weight:null});
 r.nodes.push({key:'domain:love',kind:'domain',data:{context:'relationship',text:'Love'},ordinal:0,weight:null});
 for(const w of r.context_weights){
   if(w.context_key==='relationship')w.multiplier=w.dimension_key==='autonomy'?3:0;
   if(w.context_key==='decision')w.multiplier=w.dimension_key==='care'?3:0;
 }
 r.nodes.find(n=>n.key==='dimension:autonomy').weight=5;
 r.edges.push({from_key:'event:2',to_key:'domain:money',relation:'illustrates'},{from_key:'event:3',to_key:'domain:love',relation:'illustrates'});
 const g=normalizeCoachGraph(r,'mira');assert.ok(g);
 const c=composeCoachGraph(g,{context:'decision',secondaryContext:'relationship',domain:'money'});
 assert.equal(c.lens,'decision');assert.equal(c.secondary,'relationship');
 assert.deepEqual(c.priorities.map(p=>p.key),['care','autonomy']);
 assert.equal(c.linkedEvents[0].key,'event:2');
 const h=coachGraphHints({message:'My money and my relationship are in conflict'});
 assert.equal(h.context,'decision');assert.equal(h.secondaryContext,'relationship');
 assert.equal(h.domain,'money');
 assert.match(buildCoachGraphInstruction(g,{input:{message:'My money and my relationship are in conflict'}}),/concrete tradeoff/);
});
test('factual requests override personality reactions, including Spanish punctuation',()=>{
 const g=normalizeCoachGraph(fixture('mira'),'mira');
 for(const message of ['What is business failure?','Что такое неудача в бизнесе?','¿Qué es el fracaso en un negocio?']){
  const h=coachGraphHints({message});assert.equal(h.context,'facts');
  const c=composeCoachGraph(g,h);assert.equal(c.secondary,null);assert.equal(c.reaction,'');
  assert.match(buildCoachGraphLiveHint(g,{message}),/facts first/);
 }
 assert.equal(coachGraphHints({message:'What is your opinion on business risk?'}).context,'decision');
 assert.equal(coachGraphHints({message:'What is the meaning of life?'}).context,'meaning');
});
test('explicit story requests can inherit the preceding topic, never client text in a compact hint',()=>{
 const g=normalizeCoachGraph(fixture('mira'),'mira');
 const input={message:'Расскажи свой пример',turns:[{role:'user',content:'Мой бизнес и бюджет'},{role:'assistant',content:'OK'}]};
 const h=coachGraphHints(input,{personalExample:true});assert.equal(h.context,'decision');assert.equal(h.domain,'money');
 const marker='PRIVATE-UTTERANCE-39';
 const hint=buildCoachGraphLiveHint(g,{message:marker+' business and relationship'});
 assert.ok(!hint.includes(marker));assert.ok(hint.length<=180);
 assert.match(buildCoachGraphLiveHint(g,{message:'Business failure',authoritativeNoAdvice:true}),/no unsolicited evaluation or action/);
});
