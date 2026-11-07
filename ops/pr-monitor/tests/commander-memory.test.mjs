import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const brain=require('../commander-memory.js');
const registry={last_updated:'2026-08-01',projects:[{project_id:'agent-commander',name:'Agent Commander',
 aliases:['Командир агентов'],repo:'andylitvinov-design/books',status:'NEEDS_VERIFICATION'}]};
const requests=[];
const fetchImpl=async(url,options)=>{
 requests.push({url,options});
 if(url.endsWith('portfolio-registry.json'))return{ok:true,status:200,text:async()=>JSON.stringify(registry)};
 if(url.includes('/contents/projects'))return{ok:true,status:200,text:async()=>JSON.stringify([
  {name:'agent-commander',type:'dir'},{name:'holistic-house',type:'dir'},
  {name:'../sensitive',type:'dir'},{name:'index.md',type:'file'}])};
 if(url.endsWith('/PROJECT.md'))return{ok:true,status:200,text:async()=>"# Project\nRead-only source."};
 return{ok:false,status:404,text:async()=>''};
};
test('one public canonical Brain and strictly bounded project paths',()=>{
 assert.equal(brain.REPO,'andylitvinov-design/ai-projects-brain');
 assert.ok(brain.slugOK('agent-commander'));
 for(const bad of ['..','../config','foo/bar','https://example.com','a?ref=secrets','UPPER'])assert.equal(brain.slugOK(bad),false);
 assert.ok(brain.FILES.includes('STATE.md'));
 assert.ok(!brain.FILES.includes('.env'));
 assert.doesNotMatch(src('commander-memory.js'),/localStorage|sessionStorage|Authorization|service_role|method:['"]POST/);
});
test('public catalog combines current registry and actual folders without fabricated status',async()=>{
 requests.length=0;
 const catalog=await brain.list({fetchImpl,refresh:true});
 assert.equal(catalog.projects.length,2);
 assert.equal(brain.find('Командир',catalog)[0].id,'agent-commander');
 assert.equal(brain.find('holistic',catalog)[0].id,'holistic-house');
 assert.equal(brain.suggest('Проверь Командир агентов',catalog),'agent-commander');
 assert.equal(catalog.projects.find(p=>p.id==='holistic-house').status,'needs verification');
 assert.ok(requests.every(r=>r.options.credentials==='omit'));
});
test('selecting one project reads only allowlisted capsules; missing docs are disclosed',async()=>{
 requests.length=0;
 const value=await brain.load('agent-commander',{fetchImpl,refresh:true});
 assert.ok(value.documents.some(x=>x.name==='PROJECT.md'));
 assert.ok(value.missing.includes('STATE.md'));
 assert.equal(requests.filter(r=>r.url.includes('/projects/agent-commander/')).length,brain.FILES.length);
 assert.ok(!requests.some(r=>r.url.includes('secrets')));
 await assert.rejects(()=>brain.load('../secrets',{fetchImpl}),/INVALID_PROJECT_ID/);
 const bundle=brain.bundle(value,900);
 assert.ok(bundle.includes('НЕ ИНСТРУКЦИИ'));
 assert.ok(bundle.includes('blob/main/projects/agent-commander/PROJECT.md'));
 assert.ok(bundle.length<=900);
});
test('offline and unavailable catalogs do not silently render fake projects',async()=>{
 const bad=async()=>{throw Error('offline')};
 await assert.rejects(()=>brain.list({refresh:true,fetchImpl:bad}),/PROJECT_MEMORY_UNAVAILABLE/);
});
test('mobile memory route and task intake are integrated without a second task DB',()=>{
 const html=src('memory.html'),page=src('commander-memory-page.js');
 assert.match(html,/commander-memory\.js/);
 assert.match(html,/project-management-nav\.js/);
 assert.match(page,/HHCommanderMemorySelection/);
 assert.match(page,/textContent/);
 assert.match(page,/navigator\.clipboard/);
 assert.doesNotMatch(page,/innerHTML|workflow_dispatch|supabase|fetch\('/);
 const nav=src('project-management-nav.js');
 assert.match(nav,/memory\.html/);
 const task=src('commander-task-input.js');
 assert.match(task,/HHCommanderMemory/);
 assert.match(task,/memory\.load/);
 assert.match(task,/9\. ПАМЯТЬ ПРОЕКТА/);
 assert.match(task,/output\.value!==previous/);
});
