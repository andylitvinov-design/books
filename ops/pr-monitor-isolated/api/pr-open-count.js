'use strict';
// Read-only aggregate of all open PRs (including drafts) across all branches.
const URL='https://api.github.com/search/issues?q=repo%3Aandylitvinov-design%2Fbooks+is%3Apr+is%3Aopen&per_page=1';
const SCHEMA='HH_PR_OPEN_COUNT_V1';
function parseCount(data){
 if(data?.incomplete_results!==false||!Number.isSafeInteger(data.total_count)||data.total_count<0)throw Error('GITHUB_COUNT_INCOMPLETE');
 return data.total_count;
}
async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'METHOD_NOT_ALLOWED'});}
 try{
  const response=await fetch(URL,{headers:{Accept:'application/vnd.github+json','User-Agent':'HolisticHouse-PR-Monitor','X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(6500)});
  if(!response.ok)throw Error('GITHUB_HTTP');
  const open=parseCount(await response.json());
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=20, must-revalidate');
  return res.status(200).json({schema:SCHEMA,complete:true,open,generated_at:new Date().toISOString()});
 }catch{
  res.setHeader('Cache-Control','no-store');
  return res.status(503).json({schema:SCHEMA,complete:false,error:'GITHUB_COUNT_UNAVAILABLE'});
 }
}
module.exports=handler;module.exports._test={parseCount};
