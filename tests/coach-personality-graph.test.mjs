import {test} from 'node:test';
import assert from 'node:assert/strict';
import {COACH_GRAPH_IDS,COACH_GRAPH_RELEASE,normalizeCoachGraph,composeCoachGraph,buildCoachGraphInstruction} from '../lib/coaching/coach-personality-graph.mjs';
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
