/**
 * GitHub PR workbench receipts. Only reduced PUBLIC metadata is surfaced.
 * A file inventory, checks or AI suggestions never prove functional LIVE.
 */
const STATUSES=new Set(['added','modified','removed','renamed','copied','changed','unchanged']);
const blank=()=>({known:false,count:null,complete:false,items:[]});
const boundedInt=n=>Number.isSafeInteger(n)&&n>=0&&n<=10000000;
export function summarizePrFiles(entries,declaredCount){
  if(!Array.isArray(entries)||entries.length>100||
    !Number.isSafeInteger(declaredCount)||declaredCount<0||declaredCount<entries.length||
    declaredCount>100000)return blank();
  const items=[];
  for(const file of entries){
    if(!file||typeof file.filename!=='string'||file.filename.length<1||
      file.filename.length>240||/[\x00-\x1f\x7f]/.test(file.filename)||
      file.filename.startsWith('/')||file.filename.split('/').includes('..')||
      !STATUSES.has(file.status)||!boundedInt(file.additions)||
      !boundedInt(file.deletions))return blank();
    if(items.length<12)items.push({
      path:file.filename,status:file.status,additions:file.additions,deletions:file.deletions
    });
  }
  return {known:true,count:declaredCount,complete:entries.length===declaredCount,items};
}
export function recommendDeliveryNext(proof){
  if(!proof||proof.prState==='unknown')return 'inspect_again';
  if(proof.prState==='closed')return 'closed_without_merge';
  if(proof.prState==='open'){
    if(proof.ci==='failed')return 'repair_checks';
    if(proof.ci==='pending')return 'wait_checks';
    if(proof.ci==='passed')return 'review_protected_merge';
    return 'check_ci_evidence';
  }
  if(proof.prState==='merged'){
    if(proof.codeOnProduction===true)return 'check_functional_live';
    if(!proof.servingSha)return 'verify_deployment_identity';
    return 'await_verified_deployment';
  }
  return 'inspect_again';
}
