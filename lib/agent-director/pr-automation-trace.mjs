// Read-only agent attribution; never use declared identity to authorize writes or merge.
export function readAutomationIdentity(message){
 if(typeof message!=='string'||message.length>100000)return null;
 const ids=message.match(/^HH-Automation: ([a-z0-9-]+)[ \t]*\r?$/gm)||[];
 const runs=message.match(/^HH-Run: ([A-Za-z0-9:._-]+)[ \t]*\r?$/gm)||[];
 if(ids.length!==1||runs.length!==1)return null;
 const automationId=ids[0].split(': ')[1].trim(),runId=runs[0].split(': ')[1].trim();
 if(!/^(mycoach-(00|10|20|30|40|50)|triage-15|repair-45|merge-35|live-05|manual-chat)$/.test(automationId)||
  runId.length>100||!runId.startsWith(automationId+'-'))return null;
 const suffix=runId.slice(automationId.length+1);
 if(automationId==='manual-chat'?!/^[A-Za-z0-9._-]{6,80}$/.test(suffix):
  !/^(?:\d{8}T\d{6}(?:\.\d+)?Z|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)$/.test(suffix))return null;
 return {automationId,runId,proof:'DECLARED_IN_GITHUB'};
}

export function buildPrAutomationTrace({pr,comments=[],commentsComplete=false,productionVerified=false,observedAt}={}){
 const sha=x=>typeof x==='string'&&/^[0-9a-f]{40}$/i.test(x)?x.toLowerCase():null;
 const validTime=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
 const knownEvents=new Set(['PR_CREATED','COMMIT_WRITTEN','ERROR_DETECTED','REPAIR_ASSIGNED','REPAIR_BLOCKED','CI_RESTORED','MERGE_ARMED','MERGED','DEPLOYED','LIVE_VERIFIED','STAGE_BLOCKED','STAGE_OBSERVED']);
 const stages=new Set(['PR','DIAGNOSIS','ASSIGNMENT','REPAIR','HEAD','CI','MERGE','RELEASE','LIVE']);
 const outcomes=new Set(['DONE','WAIT','HOLD','FAILED','OBSERVED']);
 const blockerOutcomes=new Set(['WAIT','HOLD','FAILED']);
 const safeCode=x=>typeof x==='string'&&/^[A-Z0-9][A-Z0-9_.:-]{0,119}$/.test(x)?x:null;
 const safeAction=x=>typeof x==='string'&&x.length<=240&&!/[\r\n<>]/.test(x)?x:null;
 const url=x=>typeof x==='string'&&/^https:\/\/github\.com\/andylitvinov-design\/books\/(?:pull\/\d+(?:#issuecomment-\d+)?|actions\/runs\/\d+(?:\/job\/\d+)?|commit\/[a-f0-9]{40})$/.test(x)?x:null;
 if(!Number.isSafeInteger(pr?.number)||!sha(pr?.head?.sha)||!validTime(observedAt))return null;
 const owner='andylitvinov-design',map=new Map();
 const origin=pr.user?.login===owner?readAutomationIdentity(pr.body):null;
 for(const c of Array.isArray(comments)?comments:[]){
  if(c?.user?.login!==owner||!Number.isSafeInteger(c.id)||typeof c.body!=='string'||c.body.length>60000)continue;
  const lines=c.body.split(/\r?\n/);
  for(let i=0;i+1<lines.length;i++){
   if(lines[i].trim()!=='<!-- HH_PR_TRACE_V1 -->'||lines[i+1].length>3000)continue;
   let e;try{e=JSON.parse(lines[i+1])}catch{continue}
   if(!e||e.schema!=='HH_PR_TRACE_V1'||e.pr!==pr.number||!knownEvents.has(e.event)||
    !stages.has(e.stage)||!outcomes.has(e.outcome)||!validTime(e.at)||
    Date.parse(e.at)>Date.parse(observedAt)||!sha(e.head_sha))continue;
   const identity=readAutomationIdentity('HH-Automation: '+e.automation_id+'\nHH-Run: '+e.run_id);
   if(!identity||identity.automationId==='manual-chat')continue;
   const reasonCode=safeCode(e.reason_code),nextAction=safeAction(e.next_action);
   if(blockerOutcomes.has(e.outcome)&&(!reasonCode||!nextAction))continue;
   if(e.event==='COMMIT_WRITTEN'&&e.outcome==='DONE'&&!sha(e.commit_sha))continue;
   if(['MERGED','DEPLOYED','LIVE_VERIFIED'].includes(e.event)&&e.outcome==='DONE'&&!sha(e.merge_sha))continue;
   if(['DEPLOYED','LIVE_VERIFIED'].includes(e.event)&&e.outcome==='DONE'&&!sha(e.served_sha))continue;
   const record={...identity,event:e.event,stage:e.stage,outcome:e.outcome,at:e.at,
    headSha:sha(e.head_sha),baseSha:sha(e.base_sha),commitSha:sha(e.commit_sha),
    mergeSha:sha(e.merge_sha),servedSha:sha(e.served_sha),reasonCode,nextAction,
    evidenceUrl:url(e.evidence_url),sourceUrl:'https://github.com/'+owner+'/books/pull/'+pr.number+'#issuecomment-'+c.id};
   const key=JSON.stringify([identity.automationId,identity.runId,e.event,e.stage,e.outcome,
    record.headSha,record.baseSha,record.commitSha,record.mergeSha,record.servedSha,reasonCode,
    typeof e.evidence_key==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(e.evidence_key)?e.evidence_key:null]);
   if(!map.has(key)||Date.parse(record.at)<Date.parse(map.get(key).at))map.set(key,record);
  }
 }
 const events=[...map.values()].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
 const merged=pr.merged===true&&!!sha(pr.merge_commit_sha);
 const current=events.find(e=>merged?
  !productionVerified&&['RELEASE','LIVE'].includes(e.stage)&&e.mergeSha===sha(pr.merge_commit_sha):
  !['RELEASE','LIVE'].includes(e.stage)&&e.headSha===sha(pr.head.sha)&&!!e.baseSha&&e.baseSha===sha(pr.base?.sha))||null;
 return {schema:'HH_PR_TRACE_V1',origin,events:events.slice(0,60),
  current:current?{...current,reportedWaitMinutes:blockerOutcomes.has(current.outcome)?
    Math.max(0,Math.floor((Date.parse(observedAt)-Date.parse(current.at))/60000)):null}:null,
  coverage:commentsComplete?(events.length>60?'bounded':'loaded'):'partial',
  evidenceLevel:'AGENT_DECLARATION_NOT_SIGNED_IDENTITY'};
}
