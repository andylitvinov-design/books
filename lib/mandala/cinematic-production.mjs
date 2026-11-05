/**
 * Quote-first, no-network video provider router and durable-job contract.
 * This module never submits a paid request or stores private client data.
 * Only a server-owned transaction with real receipts may advance paid jobs.
 */
export const CINEMATIC_PROVIDER_CATALOG=Object.freeze({
  local:Object.freeze({label:'On-device montage',type:'local',kind:'first_party_animation',generatesPeople:false,license:'first_party',requiresQuote:false}),
  kling_turbo:Object.freeze({label:'Kling 2.5 Turbo',type:'kling',kind:'abstract_background',generatesPeople:false,license:'verify_provider_commercial_rights',requiresQuote:true}),
  kling_cinematic:Object.freeze({label:'Kling cinematic',type:'kling',kind:'abstract_background',generatesPeople:false,license:'verify_provider_commercial_rights',requiresQuote:true}),
  runway:Object.freeze({label:'Runway model router',type:'runway',kind:'abstract_background',generatesPeople:false,license:'verify_provider_commercial_rights',requiresQuote:true}),
  higgsfield:Object.freeze({label:'Higgsfield model router',type:'higgsfield',kind:'abstract_background',generatesPeople:false,license:'verify_provider_commercial_rights',requiresQuote:true}),
  heygen_owner:Object.freeze({label:'Approved Andrey Digital Twin',type:'heygen',kind:'owner_presenter_only',generatesPeople:true,license:'verified_owner_only',requiresQuote:true}),
});
const STATES=Object.freeze(['draft','quoted','approved','payment_verified','submitted','provider_ready','qa_passed','delivered','failed','archived']);
const NEXT=Object.freeze({
  draft:['quoted','archived'],quoted:['approved','archived'],approved:['payment_verified','archived'],
  payment_verified:['submitted','archived'],submitted:['provider_ready','failed'],
  provider_ready:['qa_passed','failed'],qa_passed:['delivered','failed'],
  delivered:['archived'],failed:['archived'],archived:[],
});
const SAFE_ID=/^[a-zA-Z0-9_-]{10,128}$/;
const SHA256=/^[a-f0-9]{64}$/i;
const safeMinor=value=>Number.isSafeInteger(value)&&value>0&&value<=1000000;
export function listCinematicRoutes({visibility='client_private',capabilities={}}={}){
  return Object.entries(CINEMATIC_PROVIDER_CATALOG).map(([id,item])=>{
    const external=item.type!=='local';
    const allowed=(!external||visibility==='approved_public') &&
      (id!=='heygen_owner'||visibility==='approved_public');
    const configured=external && capabilities[id]===true;
    return Object.freeze({
      id,label:item.label,kind:item.kind,license:item.license,requiresQuote:item.requiresQuote,
      status:id==='local'?'local_ready':!allowed?'private_content_blocked':
        !configured?'not_connected_or_not_verified':'quote_and_owner_approval_required',
      canSubmit:false,priceMinor:null,
    });
  });
}
/** Fail-closed provider submission gate. No caller can supply a guessed price. */
export function evaluateCinematicSpend({
  provider,visibility,configured=false,serverEnabled=false,
  quote,ownerApproval,order,commercialRightsVerified=false,
}={}){
  if(provider==='local')return Object.freeze({allowed:true,reason:'local_no_charge'});
  if(!Object.hasOwn(CINEMATIC_PROVIDER_CATALOG,provider))return Object.freeze({allowed:false,reason:'unknown_provider'});
  if(visibility!=='approved_public')return Object.freeze({allowed:false,reason:'private_content_blocked'});
  if(!configured||!serverEnabled)return Object.freeze({allowed:false,reason:'provider_disabled'});
  if(!commercialRightsVerified)return Object.freeze({allowed:false,reason:'rights_unverified'});
  if(!quote||!safeMinor(quote.totalMinor)||!['EUR','USD','CAD'].includes(quote.currency)||
    !SAFE_ID.test(String(quote.providerQuoteId||''))||quote.verifiedByServer!==true||
    !Number.isFinite(quote.expiresAt)||quote.expiresAt<=Date.now())
    return Object.freeze({allowed:false,reason:'verified_quote_required'});
  if(!ownerApproval||ownerApproval.approved!==true||
    !SAFE_ID.test(String(ownerApproval.approvalId||''))||
    !safeMinor(ownerApproval.maxMinor)||quote.totalMinor>ownerApproval.maxMinor||
    ownerApproval.currency!==quote.currency)
    return Object.freeze({allowed:false,reason:'owner_cost_approval_required'});
  if(!order||order.verifiedByServer!==true||!SAFE_ID.test(String(order.receiptId||''))||
    !safeMinor(order.totalMinor)||order.totalMinor<quote.totalMinor||order.currency!==quote.currency)
    return Object.freeze({allowed:false,reason:'verified_payment_required'});
  return Object.freeze({allowed:true,reason:'approved_public_paid_job'});
}
/** Pure helper: persistent server ledger must own identity, unique key and revision. */
export function draftCinematicJob({id,idempotencyKey,provider,scope='client_private',planVersion}={}){
  if(!SAFE_ID.test(String(id||''))||!SAFE_ID.test(String(idempotencyKey||''))||
    !Object.hasOwn(CINEMATIC_PROVIDER_CATALOG,provider)||
    !/^[a-z0-9-]{6,90}$/.test(String(planVersion||''))||
    !['client_private','approved_public'].includes(scope))throw Error('invalid_cinematic_job');
  return Object.freeze({
    id,idempotencyKey,provider,scope,planVersion,status:'draft',revision:0,
    providerJobId:null,assetSha256:null,receiptId:null,
  });
}
export function advanceCinematicJob(job,next,{verifiedPayment=false,ownerApproved=false,providerJobId,
  assetSha256,qaApproved=false,privateDeliveryVerified=false,receiptId}={}){
  if(!job||!STATES.includes(job.status)||!NEXT[job.status].includes(next))
    throw Error('invalid_cinematic_transition');
  if(next==='approved'&&!ownerApproved)throw Error('owner_approval_required');
  if(next==='payment_verified'&&!verifiedPayment)throw Error('verified_payment_required');
  if(next==='payment_verified'&&!SAFE_ID.test(String(receiptId||'')))
    throw Error('payment_receipt_required');
  if(next==='submitted'&&!SAFE_ID.test(String(providerJobId||'')))
    throw Error('provider_job_receipt_required');
  if(next==='provider_ready'&&!SHA256.test(String(assetSha256||'')))
    throw Error('stored_master_checksum_required');
  if(next==='qa_passed'&&!qaApproved)throw Error('media_qa_required');
  if(next==='delivered'&&!privateDeliveryVerified)throw Error('actual_delivery_required');
  const result={...job,status:next,revision:job.revision+1};
  if(next==='submitted')result.providerJobId=providerJobId;
  if(next==='provider_ready')result.assetSha256=assetSha256;
  if(next==='payment_verified')result.receiptId=receiptId;
  return Object.freeze(result);
}
export function buildCinematicAssemblyManifest(plan,{audio='silent',licensedAudio=false}={}){
  if(!plan||plan.noExternalClientData!==true||![4,6].includes(plan.shotCount)||
     !Array.isArray(plan.shots)||plan.shots.length!==plan.shotCount)throw Error('invalid_cinematic_manifest');
  if(!['silent','first_party','user_approved'].includes(audio)||
    (audio==='user_approved'&&!licensedAudio))throw Error('audio_rights_required');
  let at=0;
  const clips=plan.shots.map((shot,i)=>{
    if(shot.startSeconds!==at||!Number.isInteger(shot.durationSeconds)||shot.durationSeconds<1||
      typeof shot.sceneId!=='string'||!/^[a-z0-9-]+$/.test(shot.sceneId))
      throw Error('invalid_cinematic_timeline');
    at+=shot.durationSeconds;
    return {index:i+1,sceneId:shot.sceneId,seconds:shot.durationSeconds,startSeconds:shot.startSeconds};
  });
  if(at!==plan.durationSeconds)throw Error('invalid_cinematic_duration');
  return Object.freeze({
    version:'hh-assembly-1',planVersion:plan.version,
    durationSeconds:plan.durationSeconds,aspect:plan.aspect,clips,
    audio,rightsConfirmed:audio!=='user_approved'||licensedAudio,
    renderMode:'local_canvas_preview',storage:'device_only',publicationApproved:false,
  });
}
