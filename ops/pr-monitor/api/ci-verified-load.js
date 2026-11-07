'use strict';
/* One user-requested, read-only GitHub census. No schedule, dispatch, mutation,
 * token on the client, Vercel build, or duplicate background poller.
 */
const {summarize,selectRuns,prioritySample}=require('../ci-verified-model.cjs');
const BASE='https://api.github.com/repos/andylitvinov-design/books';
const STATES=['in_progress','queued','waiting','pending','requested'];
const CACHE_MS=55_000;
const CAP=process.env.GITHUB_TOKEN||process.env.GH_TOKEN?16:8;
let cache=null,inFlight=null;
function methodError(res,status,code){return res.status(status).json({schema:'HH_CI_VERIFIED_LOAD_V2',error:code});}
async function census(now=Date.now(),request=fetch){
  let reads=0,remaining=null;
  const token=process.env.GITHUB_TOKEN||process.env.GH_TOKEN||'';
  const maxReads=CAP+7;
  async function gh(path){
    if(++reads>maxReads)throw Error('BOUNDED_READ_LIMIT');
    if(remaining!==null && remaining<(token?40:4))throw Error('GITHUB_API_RESERVE');
    const headers={'Accept':'application/vnd.github+json','User-Agent':'hh-monitor-verified-ci'};
    if(token)headers.Authorization='Bearer '+token;
    const response=await request(BASE+path,{headers,signal:AbortSignal.timeout(8500)});
    const rem=response.headers?.get?.('x-ratelimit-remaining');
    if(rem!==null&&rem!==undefined&&/^\d+$/.test(rem))remaining=Number(rem);
    if(!response.ok)throw Error('GITHUB_UPSTREAM_'+response.status);
    return response.json();
  }
  const statusPages=await Promise.all(STATES.map(async s=>{
    try{return await gh('/actions/runs?status='+s+'&per_page=100');}
    catch{return {read_failed:true,status:s};}
  }));
  const selected=selectRuns(statusPages);
  const runs=prioritySample(selected.runs,CAP);
  const jobPages={};
  await Promise.all(runs.map(async r=>{
    try{jobPages[r.id]=await gh('/actions/runs/'+r.id+'/jobs?per_page=100&filter=latest');}
    catch{jobPages[r.id]=null;}
  }));
  const [recent,scheduled]=await Promise.all([
    gh('/actions/runs?per_page=100').catch(()=>null),
    gh('/actions/runs?event=schedule&per_page=100').catch(()=>null)]);
  return {...summarize({statusPages,jobPages,recent,scheduled},now,CAP),
    source:{kind:'BOUNDED_GITHUB_ACTIONS_READ_ONLY',reads,quota_remaining:remaining,
      note:'Latest workflow statuses reconciled against actual job state; no CI is dispatched.'}};
}
async function handler(req,res){
  res.setHeader('Cache-Control','public, s-maxage=45, stale-while-revalidate=20');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return methodError(res,405,'METHOD_NOT_ALLOWED');}
  const now=Date.now();
  if(cache && now-cache.at<CACHE_MS)return res.status(200).json({...cache.value,cache_hit:true});
  if(!inFlight)inFlight=census(now).then(value=>{cache={at:Date.now(),value};return value;})
    .finally(()=>{inFlight=null;});
  try{return res.status(200).json(await inFlight);}
  catch(e){
    // A historical readback is not a current load measurement. Fail explicitly.
    return methodError(res,503,String(e.message||e).slice(0,90));
  }
}
module.exports=handler;
module.exports.census=census;
