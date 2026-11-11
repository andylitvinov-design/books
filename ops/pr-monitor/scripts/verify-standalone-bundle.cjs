#!/usr/bin/env node
'use strict';
/* HH_PR_MONITOR_COMPLETE_BUNDLE_GATE_V1
 * No external calls, no deployment and no credentials. Run against the complete
 * assembled standalone Vercel SOURCE directory, never the partial ops archive.
 */
const fs=require('node:fs');
const path=require('node:path');
const required=[
 'index.html','pr-monitor.html','legacy.html','briefing.html','learning.html',
 'pr-three-cohorts-snapshot.json','monitor-core.js','compact.js',
 'pr-two-screen-boot.js','pr-two-screen.js','pr-error-funnel.js',
 'pr-compact-top.js','pr-compact-top.css','pr-recommendations.js',
 'pr-recommendations.css','project-management-nav.js',
 'api/commander-chats.js','api/commander-drafts.js',
 'api/commander-session.js','api/pr-created-cohort.js',
 'api/pr-stage-overview.js','api/pr-three-kpis.js',
 'lib/commander-private-store.js','vercel.json'
];
const fail=(items,code,detail)=>items.push(code+(detail?' '+detail:''));
function analyzeBundle(folder){
 const root=path.resolve(folder||'.'),errors=[],visited=new Set();
 const inRoot=file=>{const rel=path.relative(root,file);return !!rel&&rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel);};
 const exists=file=>{try{return fs.statSync(path.join(root,file)).isFile()}catch{return false}};
 for(const file of required)if(!exists(file))fail(errors,'REQUIRED_MISSING',file);
 const extensions=['','.js','.cjs','.mjs','.json','/index.js','/index.cjs'];
 function scan(file){
  if(visited.has(file)||!exists(file))return;
  visited.add(file);
  const code=fs.readFileSync(path.join(root,file),'utf8');
  const rx=/\brequire\s*\(\s*(['"])(\.[^'"\r\n]+)\1\s*\)/g;
  for(const m of code.matchAll(rx)){
   const abs=path.resolve(root,path.dirname(file),m[2]);
   if(!inRoot(abs)){fail(errors,'DEPENDENCY_OUTSIDE_ROOT',file+' -> '+m[2]);continue;}
   const found=extensions.map(ext=>abs+ext).find(name=>inRoot(name)&&fs.existsSync(name)&&fs.statSync(name).isFile());
   if(!found){fail(errors,'DEPENDENCY_MISSING',file+' -> '+m[2]);continue;}
   const rel=path.relative(root,found);
   if(/\.(?:js|cjs|mjs)$/.test(rel))scan(rel);
  }
 }
 // Scan every server endpoint, not only the one whose missing helper triggered this incident.
 const api=path.join(root,'api');
 if(fs.existsSync(api)&&fs.statSync(api).isDirectory())for(const name of fs.readdirSync(api)){
  if(/\.(?:js|cjs|mjs)$/.test(name))scan('api/'+name);
 }
 if(exists('vercel.json')){
  try{
   const config=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
   const funcs=config.functions||{};
   const bundled=Object.entries(funcs).some(([pattern,value])=>
     /^api\/.*(?:\*|commander-chats\.js)/.test(pattern)&&
     String(value?.includeFiles||'').includes('lib/'));
   if(!bundled)fail(errors,'FUNCTION_LIB_INCLUDE_NOT_PINNED','api/*.js must include lib/**');
   if((config.rewrites||[]).some(rule=>rule.source==='/:path*'&&/^https?:\/\//.test(rule.destination||'')))
    fail(errors,'PROXY_ONLY_CONFIG','standalone source must not redirect every route to an old deployment');
  }catch(e){fail(errors,'INVALID_VERCEL_CONFIG',String(e.message).slice(0,120));}
 }
 if(exists('pr-three-cohorts-snapshot.json')){
  try{
   const raw=JSON.parse(fs.readFileSync(path.join(root,'pr-three-cohorts-snapshot.json'),'utf8'));
   if(raw.schema!=='HH_PR_THREE_CREATED_COHORTS_V1'||raw.repo!=='andylitvinov-design/books'||
       raw.timezone!=='America/Toronto'||!Array.isArray(raw.windows)||raw.windows.length!==3)
     fail(errors,'INVALID_COHORT_ARCHIVE','identity/schema/windows');
   else for(const w of raw.windows){
    if(!w.complete||!Array.isArray(w.rows)||w.rows.length!==w.expected_count||
       Date.parse(w.to)-Date.parse(w.from)!==86400000)
      fail(errors,'INVALID_COHORT_WINDOW',String(w.id));
    const from=Date.parse(w.from),to=Date.parse(w.to);
    if(Array.isArray(w.rows))for(const p of w.rows){
     const created=Date.parse(p.created_at);
     if(!Number.isInteger(p.number)||!Number.isFinite(created)||created<from||created>to||
       (p.closed_at!==null&&p.closed_at!==undefined&&Date.parse(p.closed_at)<created)||
       (p.merged_at!==null&&p.merged_at!==undefined&&Date.parse(p.merged_at)<created)){
       fail(errors,'INVALID_COHORT_ROW',String(w.id)+' #'+String(p.number));break;
     }
    }
   }
  }catch(e){fail(errors,'UNREADABLE_COHORT_ARCHIVE',String(e.message).slice(0,120));}
 }
 return {schema:'HH_PR_MONITOR_COMPLETE_BUNDLE_GATE_V1',ok:errors.length===0,
   checkedRequired:required.length,checkedModules:visited.size,errors};
}
module.exports={analyzeBundle,required};
if(require.main===module){
 const result=analyzeBundle(process.argv[2]||'.');
 console.log(JSON.stringify(result,null,2));
 if(!result.ok)process.exitCode=2;
}
