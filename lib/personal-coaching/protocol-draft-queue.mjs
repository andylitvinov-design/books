// Browser-only serialized, idempotent checkpoint queue. No storage or token persistence.
export function createCoachDraftQueue(send,notify=()=>{},initialRevision=0){
 if(!Number.isInteger(initialRevision)||initialRevision<0||initialRevision>9999)throw Error('DRAFT_REVISION_INVALID')
 let ack=initialRevision,queued=null,flight=null,running=null,closed=false,lastKey='';
 function status(value){notify(value,ack)}
 function offer(value){
  if(closed)return;
  const {completedAt,durationSeconds,...stable}=value.protocol;
  const key=JSON.stringify([value.courseSessionId,stable]);
  if(key===lastKey)return;
  lastKey=key;queued=value;status('pending');void flush();
 }
 async function drain(){
  while(!closed&&(flight||queued)){
   if(!flight){flight={revision:ack+1,value:queued};queued=null}
   status('pending')
   try{
    const result=await send(flight.revision,flight.value);
    if(result?.saved!==true||result.revision!==flight.revision||result.id!==flight.value.protocol.id)throw Error('DRAFT_NOT_ACKNOWLEDGED');
    ack=flight.revision;flight=null;
   }catch{if(!closed)status('error');return null}
  }
  if(!closed&&ack)status('saved');
  return closed?null:ack;
 }
 function flush(){
  if(closed)return Promise.resolve(null);
  if(!running)running=drain().finally(()=>{running=null});
  return running;
 }
 function stop(){closed=true;queued=null}
 return {offer,flush,stop,revision:()=>ack};
}
