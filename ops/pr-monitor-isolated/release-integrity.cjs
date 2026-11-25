'use strict';
/**
 * HH_PR_DASHBOARD_ATOMIC_RELEASE_V1
 * Read-only release preflight and post-deployment acceptance. No builds,
 * deployments, protected-branch writes, env reads or recurring runners.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ORIGIN='https://holistic-house-pr-dashboard.vercel.app';
const FILES=Object.freeze([
 'api/ci-error-funnel.js',
 'api/ci-funnel-extensions.cjs',
 'api/ci-stage-weekly.js',
 'api/package.json',
 'api/pr-open-count.js',
 'index.html','monitor.css','monitor.js','vercel.json'
]);
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const fail=reason=>{throw Error('HH_DASHBOARD_BUNDLE_'+reason)};
function auditBundle(root=__dirname){
 const files=FILES.map(file=>{
  if(file.startsWith('/')||file.includes('..'))fail('UNSAFE_PATH');
  const bytes=fs.readFileSync(path.join(root,file));
  if(!bytes.length||bytes.length>1500000)fail('FILE_INVALID');
  return {path:file,sha256:sha(bytes),bytes:bytes.length};
 });
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const js=fs.readFileSync(path.join(root,'monitor.js'),'utf8');
 const api=fs.readFileSync(path.join(root,'api/ci-error-funnel.js'),'utf8');
 const config=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
 for(const id of ['funnel-extra-rows','funnel-incident-list',
   'funnel-prev','funnel-next','funnel-page']){
  if(!html.includes('id="'+id+'"')||!js.includes("'"+id+"'"))fail('MISMATCHED_UI_'+id);
 }
 if(!api.includes("require('./ci-funnel-extensions.cjs')")||
    !api.includes('extended_stages')||!api.includes('incidents:')||
    !js.includes('Array.isArray(d.extended_stages)'))
   fail('MISMATCHED_API_CLIENT');
 if(!Array.isArray(config.rewrites)||config.rewrites.length!==10||
    config.rewrites.some(r=>typeof r.source!=='string'||
      !/^\/api\/[a-z0-9-]+$/.test(r.source)||
      typeof r.destination!=='string'||
      !r.destination.startsWith('https://holistic-house-pr-monitor.vercel.app/api/')))
   fail('UNEXPECTED_REWRITE');
 return {schema:'HH_PR_DASHBOARD_ATOMIC_RELEASE_V1',files,
  bundle_sha256:sha(JSON.stringify(files)),file_count:files.length,
  requires_complete_upload:true};
}
async function verifyLive({fetchImpl=global.fetch,root=__dirname,origin=ORIGIN}={}){
 if(origin!==ORIGIN||typeof fetchImpl!=='function')
  return {verified:false,reason:'INVALID_ORIGIN_OR_FETCHER'};
 const manifest=auditBundle(root);
 const pages=[['index.html','/'],['monitor.js','/monitor.js'],['monitor.css','/monitor.css']];
 try{
  const response=await Promise.all(pages.map(async ([file,route])=>{
   const r=await fetchImpl(origin+route,{method:'GET',redirect:'error',
      headers:{Accept:file.endsWith('.html')?'text/html':'text/plain'},
      signal:AbortSignal.timeout(12000)});
   if(r?.status!==200||r.redirected===true)return {file,ok:false};
   const data=await r.arrayBuffer();
   const bytes=Buffer.from(data);
   const expected=manifest.files.find(x=>x.path===file);
   return {file,ok:bytes.length<=1500000&&sha(bytes)===expected.sha256};
  }));
  if(response.some(x=>!x.ok))
   return {verified:false,reason:'ATOMIC_STATIC_ASSETS_MISMATCH',files:response};
  const result=await fetchImpl(origin+'/api/ci-error-funnel?hours=24',{method:'GET',
   redirect:'error',headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
  if(result?.status!==200||result.redirected===true)
   return {verified:false,reason:'ERROR_FUNNEL_API_UNAVAILABLE'};
  const data=await result.json();
  if(data?.schema!=='HH_PR_REPAIR_EVIDENCE_FUNNEL_V1'||
     !Array.isArray(data.extended_stages)||data.extended_stages.length!==6||
     !Array.isArray(data.incidents)||!Number.isSafeInteger(data.cohort?.page_size)||
     data.cohort.page_size!==8||data.cohort.checked_only_public_records!==true)
   return {verified:false,reason:'ERROR_FUNNEL_API_OLD_OR_INCOMPLETE'};
  // API success + all three exact static hashes is a consistent bundle.
  // This does NOT prove an individual PR's Merge or Vercel LIVE SHA.
  return {verified:true,reason:'ATOMIC_DASHBOARD_BUNDLE_SERVING',
   bundle_sha256:manifest.bundle_sha256,file_count:manifest.file_count};
 }catch(e){return {verified:false,reason:'RELEASE_READBACK_UNAVAILABLE',error_code:e?.name||'Error'};}
}
if(require.main===module){
 if(process.argv.includes('--verify-live')){
  verifyLive().then(x=>{process.stdout.write(JSON.stringify(x)+'\n');if(!x.verified)process.exitCode=1;});
 }else process.stdout.write(JSON.stringify(auditBundle())+'\n');
}
module.exports={auditBundle,verifyLive,FILES,ORIGIN};
