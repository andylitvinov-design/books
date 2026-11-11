'use strict';
// Runs in the isolated read-only-token repair job. Never grant a source write
// when no bounded test directly imports each changed source file.
const fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const SRC=/^(?!\/)(?!.*(?:^|\/)\.)(?!.*\.\.)(?:[A-Za-z0-9_.()[\]-]+\/)*[\w.-]+\.(?:js|jsx|ts|tsx|mjs|cjs)$/;
const TEST=/^tests\/(?!.*(?:^|\/)\.)(?!.*\.\.)(?:[\w.-]+\/)*[\w.-]+\.test\.(?:mjs|cjs|js)$/;
function selectTests(root,changed,candidates){
 if(!Array.isArray(changed)||!changed.length||changed.length>8||!changed.every(x=>typeof x==='string'&&SRC.test(x))||
    !Array.isArray(candidates)||candidates.length>3000)return null;
 let realRoot;try{realRoot=fs.realpathSync(root);}catch{return null;}
 const target=new Set(changed.map(x=>path.resolve(realRoot,x))),coverage=new Set(),selected=[];
 const unique=[...new Set(candidates)];if(unique.length!==candidates.length)return null;
 for(const file of unique){
  if(typeof file!=='string'||!TEST.test(file))return null;
  const full=path.resolve(realRoot,file);let real,stat,source;
  try{real=fs.realpathSync(full);stat=fs.lstatSync(full);
   if(!stat.isFile()||stat.size>200000||real!==full)return null;
   source=fs.readFileSync(full,'utf8');
  }catch{return null;}
  // A template or line continuation can contain a fake import on its own
  // line. Ambiguous files are skipped rather than treated as coverage.
  if(source.includes('`') || /\\\r?\n/.test(source))continue;
  // Accept only anchored literal direct imports, after discarding comments.
  // Ambiguous dynamic aliases or indirect coverage intentionally fail closed.
  const lines=source.replace(/\/\*[\s\S]*?\*\//g,'').split(/\r?\n/)
    .filter(l=>!/^\s*\/\//.test(l));
  const hasNodeTest=lines.some(line=>/^\s*(?:import(?:\s+[^;]*?\s+from)?\s*|(?:const|let|var)\s+[^=]+?=\s*require\s*\(\s*)['"]node:test['"]/.test(line));
  const hasTestCall=lines.some(line=>/^\s*(?:test|it|describe)\s*\(/.test(line));
  // A literal read through this exact repository-root helper is observable
  // source coverage too. Reject generic/dynamic fs reads and templates.
  const staticRootRead=/^\s*const read\s*=\s*path\s*=>\s*readFileSync\(\s*new URL\(\s*['"]\.\.\/['"]\s*\+\s*path\s*,\s*import\.meta\.url\s*\)\s*,\s*['"]utf8['"]\s*\)\s*;?\s*$/m.test(source);
  // Direct static URL reads are just as observable as the existing literal
  // repository-root helper. Accept the exact node:fs import and the full
  // literal file path only. No alias, interpolation, dynamic URL, symlink or
  // source outside the preauthorized changed-file inventory.
  const staticFsRead=lines.some(line=>
    /^\s*import\s*\{\s*readFileSync\s*\}\s*from\s*['"]node:fs['"]\s*;?\s*$/.test(line));
  if(!hasNodeTest||!hasTestCall)continue;
  let hit=false;
  for(const line of lines){
   const staticRead=staticRootRead?line.match(/^\s*(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*read\(\s*['"]([^'"]+)['"]\s*\)\s*;?\s*$/):null;
   // Capture the complete literal URL relative to THIS test, not a variable
   // or partial source line. SRC guarantees a non-traversal in-tree file.
   const directRead=staticFsRead?line.match(/^\s*(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*readFileSync\(\s*new URL\(\s*(['"])(\.\.\/[^'"\\\r\n`]+)\1\s*,\s*import\.meta\.url\s*\)\s*,\s*(['"])utf8\3\s*\)\s*;?\s*$/):null;
   if(directRead&&!SRC.test(directRead[2].slice(3)))continue;
   const match=staticRead||line.match(/^\s*(?:import(?:\s+[^;]*?\s+from)?\s*|}\s*from\s*|(?:const|let|var)\s+[^=]+?=\s*require\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/);
   if(!directRead&&(!match||(!staticRead&&!match[1].startsWith('.'))))continue;
   const resolved=path.resolve(staticRead?realRoot:path.dirname(full),
     directRead?directRead[2]:match[1]);
   if(target.has(resolved)){coverage.add(resolved);hit=true;}
  }
  if(hit)selected.push(file);
  if(selected.length>50)return null;
 }
 return coverage.size===target.size&&selected.length?selected.sort():null;
}
const crypto=require('node:crypto');
const SHA=/^[a-f0-9]{40}$/i,MAX_SOURCE_BYTES=150000;
function testResult(file,deadline,env){
 const remaining=deadline-Date.now();
 if(remaining<=0)throw Error('RELATED_TESTS_TIMED_OUT');
 const result=spawnSync(process.execPath,['--test','--test-reporter=tap',file],
   {encoding:'utf8',maxBuffer:4*1024*1024,timeout:remaining,env});
 const out=result.stdout||'';
 const passes=[...out.matchAll(/^# pass (\d+)\s*$/gm)];
 const total=[...out.matchAll(/^# tests (\d+)\s*$/gm)];
 const pass=passes.length?Number(passes.at(-1)[1]):0;
 const count=total.length?Number(total.at(-1)[1]):0;
 const empty=count===1&&pass===1&&out.split(/\r?\n/).includes('# Subtest: '+file);
 return {file,pass,count,ok:result.status===0&&!result.error&&pass>=1&&!empty,
   stable:stableFailureFingerprint(out,result.stderr||''),
   timedOut:!!result.error||result.signal!==null};
}
function stableFailureFingerprint(stdout,stderr=''){
 // The complete TAP diagnostics (not only failure names) must remain
 // unchanged. Ignore only timing and process warning PID noise. A changed
 // message, expected/actual, stack, failure count or skipped test is a
 // regression; flaky/non-deterministic failures deliberately fail closed.
 const normalized=(stdout+'\n'+stderr).replace(/\x1b\[[\d;]*m/g,'')
  .split(/\r?\n/).filter(line=>
   !/^\s*duration_ms:/.test(line)&&
   !/^# duration_ms\s/.test(line)&&
   !/^TAP version\s/.test(line)&&
   !/^# \(node:\d+\)/.test(line)&&
   line.trim()!=='').map(line=>line.trimEnd()).join('\n');
 return crypto.createHash('sha256').update(normalized).digest('hex');
}
function baselineFiles(root,files){
 const sha=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',timeout:10000});
 if(sha.status!==0||!SHA.test(sha.stdout?.trim()||'')||
   process.env.REPAIR_SHA&&process.env.REPAIR_SHA!==sha.stdout.trim())
  throw Error('RELATED_TEST_BASELINE_HEAD_NOT_VERIFIED');
 const changed=spawnSync('git',['diff','--name-only','-z','HEAD','--'],
   {cwd:root,encoding:'utf8',timeout:10000,maxBuffer:4*1024*1024});
 const tracked=changed.stdout?.split('\0').filter(Boolean).sort();
 if(changed.status!==0||JSON.stringify(tracked)!==JSON.stringify([...files].sort()))
  throw Error('RELATED_TEST_BASELINE_SCOPE_NOT_VERIFIED');
 return files.map(file=>{
  const absolute=path.resolve(root,file),real=fs.realpathSync(absolute);
  if(!absolute.startsWith(root+path.sep)||real!==absolute||
     !fs.lstatSync(absolute).isFile())throw Error('RELATED_TEST_UNSAFE_SOURCE');
  const patched=fs.readFileSync(absolute);
  const original=spawnSync('git',['show','HEAD:'+file],{cwd:root,timeout:12000,
    maxBuffer:MAX_SOURCE_BYTES+2048});
  if(original.status!==0||!original.stdout||!original.stdout.length||
     original.stdout.length>MAX_SOURCE_BYTES||patched.length>MAX_SOURCE_BYTES||
     patched.equals(original.stdout))
    throw Error('RELATED_TEST_BASELINE_BLOB_UNVERIFIED');
  return {absolute,patched,original:original.stdout,mode:fs.statSync(absolute).mode};
 });
}
function runOriginalTests(root,files,tests,deadline,env){
 const snapshots=baselineFiles(root,files),out=new Map();
 try{
  for(const item of snapshots)fs.writeFileSync(item.absolute,item.original,{mode:item.mode});
  for(const testFile of tests)out.set(testFile,testResult(testFile,deadline,env));
 }finally{
  for(const item of snapshots)fs.writeFileSync(item.absolute,item.patched,{mode:item.mode});
 }
 if(snapshots.some(x=>!fs.readFileSync(x.absolute).equals(x.patched)))
  throw Error('RELATED_TEST_PATCH_NOT_RESTORED');
 return out;
}
function main(){
 const changed=process.argv.slice(2),root=fs.realpathSync(process.cwd());
 const listing=spawnSync('git',['ls-files','-z','--','tests'],{encoding:'utf8',maxBuffer:8*1024*1024,timeout:10000});
 if(listing.status!==0)throw Error('TEST_LIST_UNAVAILABLE');
 const candidates=listing.stdout.split('\0').filter(x=>TEST.test(x));
 const tests=selectTests(root,changed,candidates);
 if(!tests)throw Error('NO_VERIFIED_BOUNDED_RELATED_TESTS');
 console.log('HH_REPAIR_RELATED_TESTS '+JSON.stringify(tests));
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 const deadline=Date.now()+180000;
 const patched=new Map(tests.map(file=>[file,testResult(file,deadline,env)]));
 const failing=tests.filter(file=>!patched.get(file).ok);
 if(failing.length){
  if(failing.some(file=>patched.get(file).timedOut))
   throw Error('RELATED_TESTS_FAILED_OR_TIMED_OUT_OR_EMPTY: '+failing[0]);
  // Compare exact failures against the immutable original PR HEAD in this
  // unprivileged runner. Never ignore newly introduced red tests.
  const baseline=runOriginalTests(root,changed,failing,deadline,env);
  for(const file of failing){
   const before=baseline.get(file),after=patched.get(file);
   if(!before||before.ok||before.timedOut||before.stable!==after.stable)
    throw Error('RELATED_TEST_REGRESSION_OR_UNVERIFIED_BASELINE: '+file);
   console.log('HH_REPAIR_PREEXISTING_TEST_FAILURE '+JSON.stringify({
    test:file,unchanged_tap_sha256:before.stable}));
  }
 }
 const passing=new Set(tests.filter(file=>patched.get(file).ok));
 // Every changed file needs at least one real passing direct-source test.
 // Merely having unchanged stale failures is not sufficient to publish.
 for(const file of changed){
  const direct=selectTests(root,[file],candidates);
  if(!direct||!direct.some(testFile=>passing.has(testFile)))
   throw Error('NO_GREEN_DIRECT_SOURCE_COVERAGE: '+file);
 }
 for(const file of tests)if(patched.get(file).ok)
  console.log('HH_REPAIR_TEST_PASS '+file+' pass='+patched.get(file).pass);
}
if(require.main===module){try{main()}catch(error){console.error('HH_REPAIR_TEST_GATE '+error.message);process.exitCode=1;}}
module.exports={selectTests};
