#!/usr/bin/env node
'use strict';
/* HH_PR_MONITOR_RELEASE_CANDIDATE_V1
 * Read-only, one-shot acceptance for an EXACT standalone deployment URL.
 * A Vercel READY status is not proof of a complete release. Never auto-promote.
 */
const {createHash}=require('node:crypto');
const fs=require('node:fs'),path=require('node:path');
const CHECKS=Object.freeze({
 '/': 'html',
 '/index.html': 'html',
 '/pr-monitor.html': 'html',
 '/pr-monitor-full.html': 'html',
 '/briefing.html': 'html',
 '/pr-monitor-yesterday.css': 'css',
 '/legacy.html': 'html',
 '/pr-two-screen-boot.js': 'js',
 '/pr-two-screen.js': 'js',
 '/monitor-core.js': 'js',
 '/pr-merge-velocity-ui.js': 'js',
 '/pr-compact-top.js': 'js',
 '/pr-dense-view.js': 'js',
 '/pr-recommendations.js': 'js',
 '/ci-jobs-bridge.js': 'js',
 '/pr-lifecycle-ribbon.js': 'js',
 '/pr-lifecycle-ribbon.css': 'css',
 '/pr-error-funnel.css': 'css',
 '/api/pr-three-kpis': 'HH_PR_THREE_KPI_V1',
 '/api/pr-merge-speed': 'HH_PR_MERGE_SPEED_V1',
 '/api/pr-stage-overview': 'HH_PR_STAGE_OVERVIEW_V1',
 '/api/pr-activity': 'HH_PR_ACTIVITY_CONSISTENT_V1',
 '/api/ci-runner-trends': 'HH_CI_RUNNER_BINS_V2',
 '/api/pr-stage-timeline?hours=6': 'HH_PR_STAGE_TIMELINE_V2',
 '/api/ci-insights': 'HH_CI_DEEP_MONITOR_V1'
});
const EXT=/\/([a-z0-9][a-z0-9._-]*\.(?:js|css))(?=[?\s"'`<\\]|$)/gi;
function assetsFrom(source){
 const found=new Set();
 for(const match of String(source||'').matchAll(EXT))found.add('/'+match[1]);
 return [...found];
}
function verifySourceAssets(root){
 const folder=path.resolve(root),errors=[],sources=['legacy.html','pr-two-screen-boot.js','pr-monitor.html','index.html','briefing.html','pr-monitor-full.html'];
 const references=new Set();
 for(const f of sources){
  const file=path.join(folder,f);
  if(!fs.existsSync(file)){errors.push('SOURCE_MISSING '+f);continue;}
  const body=fs.readFileSync(file,'utf8');
  if(body.length<30)errors.push('SOURCE_EMPTY '+f);
  for(const asset of assetsFrom(body))references.add(asset);
 }
 if(fs.existsSync(path.join(folder,'pr-monitor-full.html'))&&
    fs.existsSync(path.join(folder,'pr-monitor.html'))){
  const full=fs.readFileSync(path.join(folder,'pr-monitor-full.html'),'utf8');
  const canonical=fs.readFileSync(path.join(folder,'pr-monitor.html'),'utf8');
  if(full!==canonical)errors.push('SOURCE_FULL_NOT_CANONICAL');
 }
 if(fs.existsSync(path.join(folder,'index.html'))&&fs.existsSync(path.join(folder,'briefing.html'))){
  const index=fs.readFileSync(path.join(folder,'index.html'),'utf8');
  const briefing=fs.readFileSync(path.join(folder,'briefing.html'),'utf8');
  if(index!==briefing)errors.push('SOURCE_INDEX_NOT_BRIEFING');
 }
 for(const item of references){
  const file=path.join(folder,item.slice(1));
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())errors.push('SOURCE_ASSET_MISSING '+item);
  else if(fs.statSync(file).size<10)errors.push('SOURCE_ASSET_EMPTY '+item);
 }
 return {schema:'HH_PR_MONITOR_SOURCE_ASSET_CLOSURE_V1',ok:errors.length===0,
  sources:sources.length,assetReferences:references.size,errors};
}
function normalizeOrigin(input){
 const url=new URL(input);
 if(url.protocol!=='https:'||url.username||url.password||url.port||
    url.pathname!=='/'||url.search||url.hash||
    !/^[a-z0-9-]+\.vercel\.app$/i.test(url.hostname))
  throw Error('Candidate must be a bare HTTPS .vercel.app deployment origin');
 return url.origin;
}
function expectedType(kind){
 return kind==='html'?'text/html':kind==='js'?'javascript':kind==='css'?'text/css':'application/json';
}
function validBody(path,kind,body){
 if(body.length<10)return 'EMPTY_OR_TRUNCATED';
 if(/NOT_FOUND|FUNCTION_INVOCATION_FAILED|The page could not be found/i.test(body.slice(0,180)))
  return 'VERCEL_ERROR_BODY';
 if(kind==='html'){
  if(!/<\s*html\b/i.test(body)||!/<\s*\/html\s*>/i.test(body))return 'INVALID_HTML';
  // First-paint DOM, not a loading-only stub or client-side meta refresh.
  if(['/', '/index.html', '/briefing.html'].includes(path)){
   if(/<meta\b[^>]*http-equiv\s*=\s*['"]refresh['"]/i.test(body))return 'CLIENT_META_REFRESH_FORBIDDEN';
   if(!body.includes('data-view="home"')||!body.includes('/project-management-nav.js')||
      !body.includes('/commander-ui.js'))return 'COMMANDER_BRIEFING_REQUIRED';
  }
  if(['/pr-monitor.html','/pr-monitor-full.html'].includes(path)){
   if(body.includes('Загружаю проверенный монитор'))return 'LOADING_STUB_FORBIDDEN';
   const realMain=/<main\b[^>]*class\s*=\s*['"][^'"]*\bwrap\b/i.test(body);
   const full=body.includes('/monitor-core.js')&&body.includes('/pr-two-screen.js')&&
      body.includes('/pr-merge-velocity-ui.js')&&body.includes('/pr-recommendations.js')&&
      body.includes('/pr-error-funnel.js')&&body.includes('/project-management-nav.js')&&
      body.includes('/pr-stage-dashboard.js')&&body.includes('/pr-monitor-yesterday.css')&&
      body.includes('id="hh-project-management-nav"');
   if(!realMain||!full)return 'MONITOR_FULL_REQUIRED';
  }
  if(path==='/legacy.html'&&!/<\s*main\b/i.test(body))return 'LEGACY_NOT_COMPLETE';
 }
 if(kind==='js'&&(!/[();={}]/.test(body)||/\<\s*html\b/i.test(body.slice(0,180))))return 'INVALID_JAVASCRIPT';
 if(kind==='css'&&!/[{}:;]/.test(body))return 'INVALID_CSS';
 if(kind.startsWith('HH_')){
  let json;try{json=JSON.parse(body)}catch{return 'INVALID_JSON';}
  if(json.schema!==kind)return 'WRONG_API_SCHEMA';
 }
 return null;
}
async function verifyCandidate(input, fetchImpl=globalThis.fetch){
 const origin=normalizeOrigin(input);
 if(typeof fetchImpl!=='function')throw Error('fetch unavailable');
 const pending=new Map(Object.entries(CHECKS));
 const checked=[],errors=[],digests={};
 // One read of each path; discover referenced client assets from the HTML and boot.
 for(const [pathname,kind] of pending){
  try{
   const response=await fetchImpl(origin+pathname,{method:'GET',redirect:'manual',cache:'no-store',
    headers:{Accept:kind.startsWith('HH_')?'application/json':'*/*'}});
   const type=String(response.headers?.get?.('content-type')||'').toLowerCase();
   // Commander root may redirect only to same-origin briefing; never to the PR boot stub.
   if((pathname==='/'||pathname==='/index.html')&&
      (response.status===307||response.status===308)){
    const location=response.headers?.get?.('location');
    let target;
    try{if(location)target=new URL(location,origin+pathname)}catch{}
    if(target&&target.origin===origin&&target.pathname==='/briefing.html'&&
       !target.search&&!target.hash){checked.push(pathname);continue;}
    errors.push(pathname+' INVALID_CANONICAL_REDIRECT');continue;
   }
   if(response.status!==200){errors.push(pathname+' HTTP_'+response.status);continue;}
   const target=expectedType(kind);
   if(!type.includes(target)){errors.push(`${pathname} WRONG_CONTENT_TYPE ${type||'-'}`);continue;}
   const body=await response.text();
   const fault=validBody(pathname,kind,body);
   if(fault){errors.push(`${pathname} ${fault}`);continue;}
   checked.push(pathname);
   if(kind==='html'||kind==='js'||kind==='css')
    digests[pathname]=createHash('sha256').update(body).digest('hex');
   if(['/','/index.html','/pr-monitor.html','/pr-monitor-full.html','/briefing.html','/legacy.html','/pr-two-screen-boot.js'].includes(pathname)){
    for(const asset of assetsFrom(body))if(!pending.has(asset))
     pending.set(asset,asset.endsWith('.css')?'css':'js');
   }
  }catch(e){errors.push(`${pathname} FETCH_FAILED ${String(e.message||e).slice(0,120)}`);}
 }
 return {schema:'HH_PR_MONITOR_RELEASE_CANDIDATE_V1',origin,ok:errors.length===0,
  checked:checked.length,expected:pending.size,errors,digests};
}
module.exports={verifyCandidate,verifySourceAssets,normalizeOrigin,assetsFrom,CHECKS};
if(require.main===module){
 const input=process.argv[2];
 if(!input){console.error('Usage: node verify-release-candidate.cjs <exact HTTPS deployment origin> | --bundle <full source folder>');process.exitCode=2;}
 else if(input==='--bundle'){
  const folder=process.argv[3];if(!folder){console.error('Missing full source folder');process.exitCode=2;}
  else {
   const source=require('./verify-standalone-bundle.cjs').analyzeBundle(folder);
   const assets=verifySourceAssets(folder);
   const receipt={ok:source.ok&&assets.ok,source,assets};
   console.log(JSON.stringify(receipt,null,2));if(!receipt.ok)process.exitCode=2;
  }
 }
 else verifyCandidate(input).then(result=>{
  console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=2;
 }).catch(err=>{console.error(String(err.message||err));process.exitCode=2;});
}
