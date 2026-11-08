'use strict';
/* Read-only, no network, no tool permissions. Agent Commander skill metadata and SKILL.md resolver. */
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),HOME=path.join(ROOT,'.agents','skills');
const CATALOG=path.join(ROOT,'ops','pr-monitor','skills-library.json');
const REG=/^[a-z][a-z0-9-]{2,60}$/;
const FRONT_MATTER_RE=/^---\r?\n([\s\S]{1,2000}?)\r?\n---\r?\n/;
const repairNames=Object.freeze({'lint-autofix':'hh-repair-lint-autofix','typescript-deterministic':'hh-repair-typescript-deterministic','bounded-free-ai':'hh-repair-bounded-free-ai'});
const clean=x=>String(x||'').toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim();
function readCatalog(){
 const raw=fs.readFileSync(CATALOG,'utf8');if(raw.length>100000)throw Error('CATALOG_TOO_LARGE');
 const doc=JSON.parse(raw);if(doc.schema!=='HH_COMMANDER_SKILLS_V1'||!Array.isArray(doc.skills)||doc.skills.length>80)throw Error('INVALID_CATALOG');
 if(new Set(doc.skills.map(s=>s.id)).size!==doc.skills.length||!doc.skills.every(s=>REG.test(s.id)&&Array.isArray(s.keywords)&&Array.isArray(s.steps)))throw Error('INVALID_SKILL_MANIFEST');
 return doc.skills;
}
function folderName(s){return repairNames[s.id]||'hh-'+s.id}
function score(s,input){
 const text=clean(input);return s.keywords.reduce((sum,word)=>{
  const q=clean(word);if(!q)return sum;
  const found=q==='деплой'?text.includes('депло'):(q.length<=3&&/^[a-z]+$/.test(q)?new RegExp('(^|[^a-z])'+q+'([^a-z]|$)','i').test(text):text.includes(q));
  return sum+(found?1:0);
 },0);
}
function select(task,options={}){
 const raw=String(task||'').trim();
 if(raw.length<5||raw.length>2500)throw Error('INVALID_TASK_LENGTH');
 const count=Number.isSafeInteger(options.count)?Math.max(3,Math.min(5,options.count)):4;
 const active=readCatalog().filter(s=>s.status==='curated');
 const seen=new Set(),chosen=[];
 const push=id=>{const s=active.find(x=>x.id===id);if(s&&!seen.has(id)){chosen.push(s);seen.add(id)}};
 push('task-architect');
 const matches=active.filter(s=>!['task-architect','context-assembler','independent-reviewer'].includes(s.id))
  .map(s=>({s,score:score(s,raw)})).filter(x=>x.score>0)
  .sort((a,b)=>b.score-a.score||a.s.id.localeCompare(b.s.id));
 for(const {s} of matches.slice(0,count-3))push(s.id);
 push('context-assembler');push('independent-reviewer');
 return chosen.slice(0,count);
}
function checkSkillSync(s,raw){
 if(s.status!=='curated')return true;
 if(!raw.includes('\n  version: "'+s.version+'"\n'))throw Error('SKILL_VERSION_MISMATCH '+s.id);
 for(let i=0;i<s.steps.length;i++){
  if(!raw.includes('\n'+(i+1)+'. '+s.steps[i]+'\n'))throw Error('SKILL_PROCEDURE_DRIFT '+s.id+' step '+(i+1));
 }
 return true;
}
function getSkill(s){
 if(!s||!REG.test(s.id))throw Error('BAD_SKILL_ID');
 const folder=folderName(s);
 if(!REG.test(folder))throw Error('BAD_SKILL_FOLDER');
 const filename=path.join(HOME,folder,'SKILL.md');
 const info=fs.lstatSync(filename);
 if(!info.isFile()||info.isSymbolicLink()||info.size>12000)throw Error('SKILL_NOT_A_SAFE_FILE');
 const raw=fs.readFileSync(filename,'utf8');
 const front=raw.match(FRONT_MATTER_RE)?.[1]||'';
 const names=[...front.matchAll(/^name:\s*([a-z][a-z0-9-]+)\s*$/gm)];
 const descriptions=[...front.matchAll(/^description:\s*(\S.*)\s*$/gm)];
 if(names.length!==1||names[0][1]!==folder||descriptions.length!==1||!raw.includes('## Стоп-условия')&&!raw.includes('# Stop / no shortcuts'))throw Error('INVALID_NATIVE_SKILL '+folder);
 if(/^\s*allowed-tools:/mi.test(front))throw Error('UNTRUSTED_TOOL_GRANT');
 checkSkillSync(s,raw);
 return {id:s.id,name:folder,title:s.title,status:s.status,version:s.version,path:path.relative(ROOT,filename).replace(/\\/g,'/'),text:raw};
}
function resolve(task,options={}){
 const chosen=select(task,options);
 return {schema:'HH_COMMANDER_SKILLS_NATIVE_V1',selected:chosen.map(getSkill),executed:false,sourceSha:null};
}
if(require.main===module){
 const args=process.argv.slice(2),taskIdx=args.indexOf('--task'),list=args.includes('--list'),bundle=args.includes('--bundle');
 if(list){const items=readCatalog().map(s=>({id:s.id,name:folderName(s),status:s.status}));process.stdout.write(JSON.stringify(items,null,2)+'\n')}
 else{
  if(taskIdx<0||!args[taskIdx+1]){process.stderr.write('Usage: node scripts/commander-native-skill-loader.cjs --task "..." [--bundle]\n');process.exitCode=2}
  else try{
   const out=resolve(args[taskIdx+1]);
   if(bundle)process.stdout.write(out.selected.map(s=>'<!-- '+s.path+' -->\n'+s.text).join('\n---\n\n'));
   else process.stdout.write(JSON.stringify({...out,selected:out.selected.map(({text,...safe})=>safe)},null,2)+'\n');
  }catch(e){process.stderr.write('Skill resolution stopped: '+String(e.message||e)+'\n');process.exitCode=1}
 }
}
module.exports={readCatalog,folderName,select,checkSkillSync,getSkill,resolve};