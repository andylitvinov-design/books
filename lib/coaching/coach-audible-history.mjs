/** In-session memory: an interrupted response remains visible but must not
 * be assumed heard. No audio recording, word-level timing or persistence. */
export function markLatestCoachReplyInterrupted(turns,spokenText=null){
 if(!Array.isArray(turns)||!turns.length)return turns;
 const last=turns[turns.length-1];
 if(last?.role!=='assistant'||last.interrupted===true||
   (typeof spokenText==='string'&&last.content!==spokenText))return turns;
 const next=turns.slice();
 next[next.length-1]={...last,interrupted:true};
 return next;
}
export function coachAudibleTurns(turns){
 return Array.isArray(turns)?turns.filter(row=>row?.role!=='assistant'||row.interrupted!==true):[];
}
