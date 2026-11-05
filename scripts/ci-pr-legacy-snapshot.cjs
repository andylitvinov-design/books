'use strict';
// Bounded, read-only path identity when a shallow PR checkout cannot prove
// merge ancestry. A matching blob is NOT permission to merge or write source.
const SHA=/^[a-f0-9]{40}$/i;
const MAX=8,MAX_TIME_MS=18000;
function safePath(p){
 return typeof p==='string'&&p.length>=3&&p.length<=230&&
  /^[A-Za-z0-9_./()[\]-]+$/.test(p)&&
  /\.(?:js|jsx|ts|tsx|mjs|cjs)$/.test(p)&&
  !p.startsWith('/')&&!p.includes('//')&&
  p.split('/').every(x=>x&&x!=='.'&&x!=='..'&&!x.startsWith('.'));
}
function treeEntry(result,path){
 if(!result||result.status!==0||result.error||typeof result.stdout!=='string')
  return {state:'UNVERIFIED_TREE_READ'};
 const items=result.stdout.split('\0').filter(Boolean);
 if(items.length===0)return {state:'ABSENT'};
 if(items.length!==1)return {state:'UNVERIFIED_TREE_READ'};
 const m=/^([0-7]{6}) (blob|tree|commit) ([a-f0-9]{40})\t([^\n\r]+)$/i.exec(items[0]);
 if(!m||m[4]!==path)return {state:'UNVERIFIED_TREE_READ'};
 if(m[2]!=='blob'||!['100644','100755'].includes(m[1]))
  return {state:'NONREGULAR_FILE'};
 return {state:'REGULAR_BLOB',sha:m[3].toLowerCase(),mode:m[1]};
}
function compareLegacySnapshot({files,read,now=Date.now,budgetMs=MAX_TIME_MS}={}){
 if(!Array.isArray(files)||files.length===0||files.length>MAX||
    new Set(files).size!==files.length||typeof read!=='function'||
    typeof now!=='function'||!Number.isFinite(budgetMs)||budgetMs<1000||budgetMs>MAX_TIME_MS)
   throw Error('INVALID_BOUNDED_LEGACY_SNAPSHOT');
 const deadline=now()+budgetMs;
 const rows=[];
 for(const path of files){
  if(!safePath(path)){
   rows.push({path:String(path).slice(0,230),state:'UNVERIFIED_PATH'});continue;
  }
  const inspect=ref=>{
   if(now()>=deadline)return {state:'TIME_BUDGET_EXCEEDED'};
   let value;
   try{value=read(ref,path,Math.min(1200,Math.max(250,deadline-now())))}
   catch{return {state:'UNVERIFIED_TREE_READ'};}
   return treeEntry(value,path);
  };
  const source=inspect('HEAD'),production=inspect('FETCH_HEAD');
  let state='INCOMPLETE';
  if(source.state==='REGULAR_BLOB'&&production.state==='REGULAR_BLOB')
   state=source.sha===production.sha&&source.mode===production.mode?'IDENTICAL_BLOB':'DIVERGENT_BLOB';
  else if(source.state==='REGULAR_BLOB'&&production.state==='ABSENT')
   state='ONLY_IN_LEGACY';
  else if(source.state==='ABSENT'&&production.state==='REGULAR_BLOB')
   state='ONLY_IN_PRODUCTION';
  rows.push({path,state,source_oid:source.sha||null,production_oid:production.sha||null,
   source_state:source.state,production_state:production.state});
 }
 const counts={identical:0,divergent:0,only_legacy:0,only_production:0,unknown:0};
 for(const r of rows){if(r.state==='IDENTICAL_BLOB')counts.identical++;
  else if(r.state==='DIVERGENT_BLOB')counts.divergent++;
  else if(r.state==='ONLY_IN_LEGACY')counts.only_legacy++;
  else if(r.state==='ONLY_IN_PRODUCTION')counts.only_production++;
  else counts.unknown++;
 }
 return {schema:'HH_LEGACY_SNAPSHOT_IDENTITY_V1',
  state:counts.unknown?'INCOMPLETE_UNANCHORED_SNAPSHOT':
   counts.identical===files.length?'ALL_PATHS_IDENTICAL_UNANCHORED':
   'PATHS_DIVERGED_REQUIRE_SEMANTIC_REVIEW',
  reason:'BLOB_IDENTITY_IS_NOT_GIT_MERGE_ANCESTRY',
  source_write_authorized:false,merge_authorized:false,ancestry_verified:false,
  paths:rows.length,counts,rows};
}
module.exports={safePath,treeEntry,compareLegacySnapshot};
