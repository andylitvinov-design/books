// Pure metrics for measuring whether Lab First actually improves delivery.
// Use measured event timestamps; never infer a Live release from PR closure.
export function deliveryMetrics(items=[]){
 if(!Array.isArray(items))throw Error('Expected work item array');
 const durations=[],labDurations=[],prCounts=[];
 let live=0,lab=0,release=0;
 for(const item of items){
  if(!item||typeof item!=='object')continue;
  const start=Date.parse(item.startedAt||''),labAt=Date.parse(item.labReadyAt||''),liveAt=Date.parse(item.liveVerifiedAt||'');
  if(Number.isFinite(labAt)&&Number.isFinite(start)&&labAt>=start){lab++;labDurations.push((labAt-start)/60000)}
  if(Number.isFinite(liveAt)&&Number.isFinite(start)&&liveAt>=start&&item.liveShaVerified===true&&item.liveSmokePassed===true){live++;durations.push((liveAt-start)/60000)}
  if(item.releasePrCreated===true)release++;
  if(Number.isSafeInteger(item.prCount)&&item.prCount>=0)prCounts.push(item.prCount);
 }
 const median=a=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2};
 return {workItems:items.length,labVerified:lab,liveVerified:live,releasePrCreated:release,medianMinutesToLab:median(labDurations),medianMinutesToLive:median(durations),meanPrPerTrackedItem:prCounts.length?prCounts.reduce((a,b)=>a+b,0)/prCounts.length:null};
}
