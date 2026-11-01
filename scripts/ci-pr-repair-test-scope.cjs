'use strict';
// Runs in the isolated read-only-token repair job. Never grant a source write
// when no bounded test directly imports each changed source file.
const fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const SRC=/^(?!\/)(?!.*(?:^|\/)\.)(?!.*\.\.)(?:[\w.-]+\/)*[\w.-]+\.(?:js|jsx|ts|tsx|mjs|cjs)$/;
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
  if(!hasNodeTest||!hasTestCall)continue;
  let hit=false;
  for(const line of lines){
   const match=line.match(/^\s*(?:import(?:\s+[^;]*?\s+from)?\s*|}\s*from\s*|(?:const|let|var)\s+[^=]+?=\s*require\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/);
   if(!match||!match[1].startsWith('.'))continue;
   const resolved=path.resolve(path.dirname(full),match[1]);
   if(target.has(resolved)){coverage.add(resolved);hit=true;}
  }
  if(hit)selected.push(file);
  if(selected.length>50)return null;
 }
 return coverage.size===target.size&&selected.length?selected.sort():null;
}
function main(){
 const changed=process.argv.slice(2),root=process.cwd();
 const listing=spawnSync('git',['ls-files','-z','--','tests'],{encoding:'utf8',maxBuffer:8*1024*1024,timeout:10000});
 if(listing.status!==0)throw Error('TEST_LIST_UNAVAILABLE');
 const candidates=listing.stdout.split('\0').filter(x=>TEST.test(x));
 const tests=selectTests(root,changed,candidates);
 if(!tests)throw Error('NO_VERIFIED_BOUNDED_RELATED_TESTS');
 console.log('HH_REPAIR_RELATED_TESTS '+JSON.stringify(tests));
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 const result=spawnSync(process.execPath,['--test','--test-reporter=tap',...tests],
   {encoding:'utf8',maxBuffer:4*1024*1024,timeout:180000,env});
 if(result.stdout)process.stdout.write(result.stdout);
 if(result.stderr)process.stderr.write(result.stderr);
 const passes=[...(result.stdout||'').matchAll(/^# pass (\d+)\s*$/gm)];
 if(result.status!==0||result.error||!passes.length||Number(passes.at(-1)[1])<1)
   throw Error('RELATED_TESTS_FAILED_OR_TIMED_OUT_OR_ALL_SKIPPED');
}
if(require.main===module){try{main()}catch(error){console.error('HH_REPAIR_TEST_GATE '+error.message);process.exitCode=1;}}
module.exports={selectTests};
