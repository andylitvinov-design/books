// Editorial priorities, not measured psychological traits or client scores.
// Canonical runtime matrix, independent of provider, storage and consent.
export const COACH_MATRIX_VERSION='hh-coach-personality-matrix-v1';
export const COACH_MATRIX_DIMENSIONS=Object.freeze(['care','autonomy','evidence','action','creativity','meaning','discipline','reciprocity','prudence','resilience','authenticity','humility']);
const rows={
 mira:[5,5,3,2,3,4,2,5,5,5,4,4],
 max:[3,4,4,5,4,2,4,3,4,5,3,3],
 sofia:[5,5,4,2,3,4,2,5,4,3,5,4],
 alex:[3,4,5,4,3,3,5,3,5,4,3,4],
 merlin:[4,4,3,2,4,5,3,4,4,4,4,5],
 harry:[4,4,3,4,3,3,3,5,4,5,4,3],
 genie:[4,5,3,4,5,4,2,4,4,4,4,3],
 caesar:[3,4,4,4,2,4,5,4,5,4,3,3],
 lea:[4,5,3,3,4,4,2,4,3,3,5,4],
 noah:[4,4,3,4,2,3,5,4,4,5,3,4],
 iris:[3,4,5,2,3,4,3,4,5,3,4,5],
 ray:[3,5,3,4,5,4,3,4,3,4,5,3]
};
for(const r of Object.values(rows))Object.freeze(r);Object.freeze(rows);
const lenses=Object.freeze({
 ordinary:Object.freeze([1,1,1,1,1,1,1,1,1,1,1,1]),
 facts:Object.freeze([0,1,3,0,0,0,0,0,2,0,0,2]),
 decision:Object.freeze([1,2,2,2,1,1,2,1,2,1,1,1]),
 relationship:Object.freeze([2,2,1,0,1,1,0,3,1,1,2,1]),
 creation:Object.freeze([1,2,1,2,3,1,1,1,1,1,2,1]),
 meaning:Object.freeze([1,2,1,0,1,3,0,1,1,2,2,2]),
 support:Object.freeze([3,3,1,0,0,1,0,2,2,2,1,2])
});
export function getCoachMatrix(id){if(typeof id!=='string'||!Object.hasOwn(rows,id))return null;return Object.freeze(Object.fromEntries(COACH_MATRIX_DIMENSIONS.map((key,i)=>[key,rows[id][i]])))}
export function composeCoachMatrix(id,{lens='ordinary',mode='explore',noAdvice=false,distress=false}={}){
 const base=getCoachMatrix(id);if(!base)return null;
 const gentle=distress===true||noAdvice===true||mode==='support'||mode==='listen';
 const actual=gentle?'support':Object.hasOwn(lenses,lens)?lens:'ordinary';
 const ranked=COACH_MATRIX_DIMENSIONS.map((key,i)=>({key,score:base[key]*lenses[actual][i],i})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||b.i-a.i);
 return Object.freeze({version:COACH_MATRIX_VERSION,lens:actual,priorities:Object.freeze(ranked.slice(0,3).map(x=>x.key)),gentle});
}
export function buildCoachMatrixInstruction(id){
 const matrix=getCoachMatrix(id);if(!matrix)return '';
 const combos=Object.keys(lenses).map(lens=>lens+' = '+composeCoachMatrix(id,{lens}).priorities.join(' + '));
 return 'PERSONALITY MATRIX '+COACH_MATRIX_VERSION+' (editorial priorities 1–5, not psychometrics): '+Object.entries(matrix).map(([k,v])=>k+'='+v).join(', ')+'. Context combinations: '+combos.join('; ')+'. Select the relevant lens from the current actual topic; for an unlisted or mixed topic combine relevant dimensions, not a topic whitelist. Use two or three priorities together with the existing ordered values, worldview, principles, competence, fictional canon, and speech style. Reason from the specific evidence and alternatives; state an actual attitude, reaction or judgment with a relevant reason, not a score or personality label. Facts and uncertainty never change with persona. In a conflict, safety, consent, autonomy and verified facts win, then the existing ordered values; describe tradeoffs rather than mechanically maximizing numbers. For a requested story use a compatible fictional event and algorithm, not fabricated human experience. In therapy soften delivery; never let a score authorize advice, action, stage progression or a new question. Do not reveal scores as diagnoses or infer any client traits from them.';
}
export function buildCoachMatrixTurn(id,{mode,noAdvice=false,distress=false}={}){
 if(!['answer','explore','action','review','support','listen'].includes(mode))return '';
 const lens=mode==='action'?'decision':'ordinary';
 const c=composeCoachMatrix(id,{lens,mode,noAdvice,distress});if(!c)return '';
 return c.gentle?'MATRIX DELIVERY: prioritize gentle listening and client autonomy; no unsolicited evaluation, advice or challenge.':'MATRIX DELIVERY: select the topic-relevant combination; default priorities '+c.priorities.join(' + ')+'. Ground the response in the latest client words; preserve all Director limits.';
}
