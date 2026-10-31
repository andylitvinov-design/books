import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { classifyStaticUiText, scopedCssIsSafe } from '../lib/ci/fast-static-ui-text.mjs';
import { verify, loadTrustedTypescript } from '../scripts/ci-specialist-aggregate.mjs';

const before='export default function Page() {\n  return <main>\n    <h1>Welcome</h1>\n    <p>Discover our story</p>\n  </main>;\n}\n';
const after=before.replace('Welcome','Bienvenidos').replace('Discover our story','Наша история');
const row={filename:'app/[locale]/about/page.tsx',status:'modified'};
const source=(sha,path)=>path?.endsWith('.css') ? '.card { color: red; }' : sha==='base'?before:after;
const typescript=createRequire(new URL('../lib/ci/fast-ui-parser/package.json',import.meta.url))('typescript');

test('real public article JSX text can change without changing its data or logic',()=>{
  const path='app/[locale]/articles/page.tsx';
  const actual=readFileSync(path,'utf8');
  const updated=actual.replace('Holistic House · Journal','Holistic House · Stories');
  assert.notEqual(actual,updated);
  const files=[{filename:path,status:'modified'}];
  assert.equal(classifyStaticUiText(files,side=>side==='base'?actual:updated,{typescript}),'FAST');
  assert.equal(classifyStaticUiText(files,side=>side==='base'?actual:updated,{loadTypescript:()=>null}),'STRICT');
  assert.equal(classifyStaticUiText(files,side=>side==='base'?actual:updated.replace('force-dynamic','force-static'),{typescript}),'STRICT');
  assert.equal(classifyStaticUiText(files,side=>side==='base'?actual:updated.replace('Stories','Pay $50'),{typescript}),'STRICT');
  const sensitivePage=actual.replace('export const dynamic','const paymentFlow = true;\nexport const dynamic');
  assert.equal(classifyStaticUiText(files,side=>side==='base'?sensitivePage:sensitivePage.replace('Journal','Stories'),{typescript}),'STRICT');
  const authPage=actual.replace('export const dynamic','const useAuthUser = true;\nexport const dynamic');
  assert.equal(classifyStaticUiText(files,side=>side==='base'?authPage:authPage.replace('Journal','Stories'),{typescript}),'STRICT');
  const clinicalPage=actual.replace('export const dynamic','const medicalDisclaimer = true;\nexport const dynamic');
  assert.equal(classifyStaticUiText(files,side=>side==='base'?clinicalPage:clinicalPage.replace('Journal','Stories'),{typescript}),'STRICT');
  const conditional=actual.replace('<p className="homeopathy-kicker">Holistic House · Journal</p>',
    '{ru && <p className="homeopathy-kicker">Holistic House · Journal</p>}');
  assert.equal(classifyStaticUiText(files,side=>side==='base'?conditional:conditional.replace('Journal','Stories'),{typescript}),'STRICT');
});

test('real public JSX localization branches may update displayed text only',()=>{
  const path='app/[locale]/articles/page.tsx', actual=readFileSync(path,'utf8');
  const changed=actual.replace('"Articles & services"','"Articles and resources"');
  assert.notEqual(changed,actual);
  const files=[{filename:path,status:'modified'}];
  assert.equal(classifyStaticUiText(files,side=>side==='base'?actual:changed,{typescript}),'FAST');
  assert.equal(classifyStaticUiText(files,side=>side==='base'?actual:changed.replace('locale === "ru"','locale !== "ru"'),{typescript}),'STRICT');
});

test('AST text routing rejects buttons, sensitive words, code strings and dynamic contexts',()=>{
  const files=[row];
  for(const [old,next] of [
    ['export default function Page(){return <main><button>Continue now</button></main>}','export default function Page(){return <main><button>Continue later</button></main>}'],
    ['export default function Page(){return <main><p>Privacy notice</p></main>}','export default function Page(){return <main><p>Other notice</p></main>}'],
    ['export default function Page(){const x="Welcome here";return <main><p>Welcome</p></main>}','export default function Page(){const x="Another value";return <main><p>Welcome</p></main>}'],
    ['export default function Page(){return <main>{flag && <p>Welcome home</p>}</main>}','export default function Page(){return <main>{flag && <p>Welcome back</p>}</main>}'],
    ['export default function Page(){return <main><p onClick={act}>Welcome home</p></main>}','export default function Page(){return <main><p onClick={act}>Welcome back</p></main>}'],
  ]) assert.equal(classifyStaticUiText(files,side=>side==='base'?old:next,{typescript}),'STRICT');
});

test('CSS modules using global escapes, network imports or unknown content stay STRICT',()=>{
  const css={filename:'app/[locale]/about/page.module.css',status:'modified'};
  assert.equal(scopedCssIsSafe([css],()=>'.card { color: red; }'),true);
  for(const value of [':global(body) { display:none }','@import "remote.css";','.card { background: url(https://example.test/x) }','.card { composes: hidden from "other" }',':export { flag: x }','.card { color: \\72 ed }','\0',null]) {
    assert.equal(scopedCssIsSafe([css],()=>value),false);
  }
  assert.equal(scopedCssIsSafe([{...css,status:'removed'}],()=>'.x { color: red }'),false);
});

test('public static UI text and localization changes route FAST',()=>{
  assert.equal(classifyStaticUiText([row],source),'FAST');
  assert.equal(classifyStaticUiText([row,{filename:'app/[locale]/about/page.module.css',status:'modified'}],source),'FAST');
});

test('public noninteractive static elements can be added or restyled',()=>{
  const updated=before.replace('    <h1>Welcome</h1>','    <h2 className="title">Welcome</h2>\n    <p>More detail</p>');
  assert.equal(classifyStaticUiText([row],rev=>rev==='base'?before:updated),'FAST');
});

test('a self-contained public toggle using local React state can route FAST',()=>{
  const uiBefore='"use client";\nimport { useState } from "react";\nexport default function Page() {\n  const [open, setOpen] = useState(false);\n  return (\n    <main>\n      <p>Welcome</p>\n    </main>\n  );\n}\n';
  const uiAfter=uiBefore.replace('      <p>Welcome</p>','      <button type="button" onClick={() => setOpen(!open)}>Show</button>\n      {open && <p>More details</p>}');
  assert.equal(classifyStaticUiText([row],rev=>rev==='base'?uiBefore:uiAfter),'FAST');
  assert.equal(classifyStaticUiText([row],rev=>rev==='base'?uiBefore:uiAfter.replace('setOpen(!open)','sendData()')),'STRICT');
  assert.equal(classifyStaticUiText([row],rev=>rev==='base'?uiBefore:uiAfter.replace('type="button" ','')),'STRICT');
  const misplaced=uiAfter.replace('export default function Page() {\n  const [open, setOpen] = useState(false);','const [open, setOpen] = useState(false);\nexport default function Page() {');
  assert.equal(classifyStaticUiText([row],rev=>rev==='base'?uiBefore:misplaced),'STRICT');
});

test('a self-contained public tab selector accepts literal state but no external calls',()=>{
  const uiBefore='"use client";\nimport { useState } from "react";\nexport default function Page() {\n  const [tab, setTab] = useState("overview");\n  return (\n    <main>\n      <p>Welcome</p>\n    </main>\n  );\n}\n';
  const uiAfter=uiBefore.replace('      <p>Welcome</p>','      <button type="button" onClick={() => setTab("story")}>Story</button>\n      {tab === "story" && <p>Our story</p>}');
  assert.equal(classifyStaticUiText([row],rev=>rev==='base'?uiBefore:uiAfter),'FAST');
  assert.equal(classifyStaticUiText([row],rev=>rev==='base'?uiBefore:uiAfter.replace('setTab("story")','setTab(runAction())')),'STRICT');
});

test('code, structure, interactions and sensitive paths fail closed',()=>{
  const variants=[
    {rows:[row],read:s=>s==='base'?before:after.replace('<h1>','<form>').replace('</h1>','</form>')},
    {rows:[row],read:s=>s==='base'?before:after.replace('return <main>','return <section>')},
    {rows:[row],read:s=>(s==='base'?before:after).replace('<main>','<main onClick={submit}>')},
    {rows:[row],read:s=>(s==='base'?before:after).replace('<main>','<main onMouseEnter={doThing}>')},
    {rows:[row],read:s=>(s==='base'?before:after).replace('<main>','<main><UnknownWidget />')},
    {rows:[row],read:s=>(s==='base'?before:after).replace('<main>','<main><img src="https://example.test/pixel" />')},
    {rows:[row],read:s=>(s==='base'?before:after).replace('<main>','<main>{account.private}</main><main>')},
    {rows:[row],read:s=>(s==='base'?before:after).replace('export default','const useAuthStatus = true;\nexport default')},
    {rows:[row],read:s=>(s==='base'?before:after).replace('  return <main>','  const details = getInfo();\n  return <main>')},
    {rows:[row],read:s=>(s==='base'?before:after).replace('<main>','<main>{details}')},
    {rows:[row],read:s=>(s==='base'?before:after).replace('<main>','<main {...props}>')},
    {rows:[row],read:s=>(s==='base'?before:after).replace('export default','export { value } from "unknown-package";\nexport default')},
    {rows:[row],read:s=>(s==='base'?before:after).replace('export default','const message = `secret`;\nexport default')},
    {rows:[row],read:s=>(s==='base'?before:after).replace('export default','import { lookup } from "@/lib/private-service";\nexport default')},
    {rows:[row],read:s=>(s==='base'?before:after).replace('Welcome','Accept terms').replace('Bienvenidos','Aceptar términos')},
    {rows:[row],read:s=>s==='base'?before:after.replace('Bienvenidos','€50')},
    {rows:[{filename:'app/[locale]/client/page.tsx',status:'modified'}],read:source},
    {rows:[{filename:'app/[locale]/unknown/page.tsx',status:'modified'}],read:source},
    {rows:[{filename:'components/public-intro.tsx',status:'modified'}],read:source},
    {rows:[{filename:'app/[locale]/about/page.tsx\n',status:'modified'}],read:source},
    {rows:[row,{filename:'supabase/migrations/001.sql',status:'added'}],read:source},
    {rows:[row,{filename:'app/[locale]/about/page.module.css',status:'removed'}],read:source},
    {rows:[row,{filename:'app/[locale]/about/page.module.css'}],read:source},
    {rows:[{...row,status:'added'}],read:source},
    {rows:[row],read:()=>null},
  ];
  for(const v of variants) assert.equal(classifyStaticUiText(v.rows,v.read),'STRICT');
});

test('release verifier accepts proven text-only change without polling diagnostic workflows',async()=>{
  const sha='a'.repeat(40),base='b'.repeat(40),repo='andylitvinov-design/books';
  const ctx={repo,head:sha,base,number:27};
  const pr={number:27,state:'open',draft:false,head:{sha,ref:'ui',repo:{full_name:repo}},base:{sha:base,ref:'codex/public-book-library',repo:{full_name:repo}}};
  const api={pr:async()=>pr,changed:async()=>[row],runs:async()=>[]};
  const result=await verify(api,ctx,{base:new Map(),current:new Map()}, {readSource:(rev)=>rev===base?before:after,maxWaitMs:0});
  assert.equal(result.risk,'FAST');
});

test('release verifier routes real public JSX text using a trusted parser',async()=>{
  const sha='a'.repeat(40),base='b'.repeat(40),repo='andylitvinov-design/books';
  const path='app/[locale]/articles/page.tsx', actual=readFileSync(path,'utf8');
  const updated=actual.replace('Holistic House · Journal','Holistic House · Stories');
  const pr={number:27,state:'open',draft:false,head:{sha,ref:'ui',repo:{full_name:repo}},base:{sha:base,ref:'codex/public-book-library',repo:{full_name:repo}}};
  const diagnostic='.github/workflows/site-video-browser.yml';
  const workflow=readFileSync(diagnostic,'utf8');
  const files={base:new Map([[diagnostic,workflow]]),current:new Map([[diagnostic,workflow]])};
  const api={pr:async()=>pr,changed:async()=>[{filename:path,status:'modified'}],runs:async()=>[{path:diagnostic,head_sha:sha,status:'in_progress',conclusion:null}]};
  const result=await verify(api,{repo,head:sha,base,number:27},files,{readSource:rev=>rev===base?actual:updated,loadTypescript:()=>typescript,maxWaitMs:0});
  assert.equal(result.risk,'FAST');
  assert.deepEqual(result.expected,[]);
  assert.ok(result.advisory.nonApplicable.some(item=>item.includes(diagnostic)));
});

test('missing parser or mixed authentication change cannot waive specialists',async()=>{
  const sha='a'.repeat(40),base='b'.repeat(40),repo='andylitvinov-design/books';
  const path='app/[locale]/articles/page.tsx', actual=readFileSync(path,'utf8');
  const updated=actual.replace('Holistic House · Journal','Holistic House · Stories');
  const pr={number:27,state:'open',draft:false,head:{sha,ref:'ui',repo:{full_name:repo}},base:{sha:base,ref:'codex/public-book-library',repo:{full_name:repo}}};
  const workflow='.github/workflows/diagnostic.yml';
  const files={base:new Map([[workflow,'on: [pull_request]\n']]),current:new Map([[workflow,'on: [pull_request]\n']])};
  const ctx={repo,head:sha,base,number:27};
  const api={pr:async()=>pr,changed:async()=>[{filename:path,status:'modified'}],runs:async()=>[]};
  const options={readSource:rev=>rev===base?actual:updated,loadTypescript:()=>null,maxWaitMs:0};
  await assert.rejects(()=>verify(api,ctx,files,options),/SPECIALIST_MISSING_OR_PENDING/);
  api.changed=async()=>[{filename:path,status:'modified'},{filename:'app/api/auth/route.ts',status:'modified'}];
  let calls=0;
  options.loadTypescript=()=>{calls++; return typescript;};
  await assert.rejects(()=>verify(api,ctx,files,options),/SPECIALIST_MISSING_OR_PENDING/);
  assert.equal(calls,0);
});

test('a CSS module with a global escape requires its applicable specialist',async()=>{
  const sha='a'.repeat(40),base='b'.repeat(40),repo='andylitvinov-design/books';
  const ctx={repo,head:sha,base,number:27};
  const pr={number:27,state:'open',draft:false,head:{sha,ref:'ui',repo:{full_name:repo}},base:{sha:base,ref:'codex/public-book-library',repo:{full_name:repo}}};
  const workflow='.github/workflows/diagnostic.yml';
  const files={base:new Map([[workflow,'on: [pull_request]\n']]),current:new Map([[workflow,'on: [pull_request]\n']])};
  const api={pr:async()=>pr,changed:async()=>[{filename:'app/[locale]/about/page.module.css',status:'modified'}],runs:async()=>[]};
  await assert.rejects(()=>verify(api,ctx,files,{readSource:rev=>rev===base?'.card {color:red}':':global(body) {display:none}',maxWaitMs:0}),/SPECIALIST_MISSING_OR_PENDING/);
});

test('release verifier reads the exact Git base and head, not uncommitted worktree content',async()=>{
  const tmp=mkdtempSync(join(tmpdir(),'hh-fast-ui-'));
  const previous=process.cwd();
  const git=(...args)=>execFileSync('git',args,{cwd:tmp,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  try {
    git('init','-q');
    mkdirSync(join(tmp,'app/[locale]/about'),{recursive:true});
    const filename=join(tmp,row.filename);
    writeFileSync(filename,before);
    git('add','.');
    git('-c','user.name=CI Test','-c','user.email=ci@example.invalid','commit','-qm','base');
    const base=git('rev-parse','HEAD');
    writeFileSync(filename,after);
    git('add','.');
    git('-c','user.name=CI Test','-c','user.email=ci@example.invalid','commit','-qm','head');
    const sha=git('rev-parse','HEAD'),repo='andylitvinov-design/books';
    writeFileSync(filename,after.replace('<main>','<form onSubmit={send}>'));
    const pr={number:27,state:'open',draft:false,head:{sha,ref:'ui',repo:{full_name:repo}},base:{sha:base,ref:'codex/public-book-library',repo:{full_name:repo}}};
    const api={pr:async()=>pr,changed:async()=>[row],runs:async()=>[]};
    process.chdir(tmp);
    assert.equal((await verify(api,{repo,head:sha,base,number:27},{base:new Map(),current:new Map()},{maxWaitMs:0})).risk,'FAST');
  } finally {
    process.chdir(previous);
    rmSync(tmp,{recursive:true,force:true});
  }
});

test('real verifier installs the parser from Git BASE and ignores modified worktree files',async()=>{
  const tmp=mkdtempSync(join(tmpdir(),'hh-parser-test-')), previous=process.cwd();
  const git=(...args)=>execFileSync('git',args,{cwd:tmp,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  try {
    git('init','-q');
    mkdirSync(join(tmp,'lib/ci/fast-ui-parser'),{recursive:true});
    for (const name of ['package.json','package-lock.json']) {
      copyFileSync(join(previous,'lib/ci/fast-ui-parser',name),join(tmp,'lib/ci/fast-ui-parser',name));
    }
    const uiPath='app/[locale]/articles/page.tsx';
    mkdirSync(join(tmp,'app/[locale]/articles'),{recursive:true});
    const actual=readFileSync(join(previous,uiPath),'utf8');
    writeFileSync(join(tmp,uiPath),actual);
    git('add','.');
    git('-c','user.name=CI Test','-c','user.email=ci@example.invalid','commit','-qm','base');
    const base=git('rev-parse','HEAD');
    writeFileSync(join(tmp,uiPath),actual.replace('Holistic House · Journal','Holistic House · Stories'));
    git('add',uiPath);
    git('-c','user.name=CI Test','-c','user.email=ci@example.invalid','commit','-qm','head');
    const sha=git('rev-parse','HEAD'),repo='andylitvinov-design/books';
    writeFileSync(join(tmp,'lib/ci/fast-ui-parser/package.json'),'{"dependencies":{"untrusted":"*"}}');
    process.chdir(tmp);
    const pr={number:27,state:'open',draft:false,head:{sha,ref:'ui',repo:{full_name:repo}},base:{sha:base,ref:'codex/public-book-library',repo:{full_name:repo}}};
    const api={pr:async()=>pr,changed:async()=>[{filename:uiPath,status:'modified'}],runs:async()=>[]};
    assert.equal((await verify(api,{repo,head:sha,base,number:27},{base:new Map(),current:new Map()},{maxWaitMs:0})).risk,'FAST');
    git('add','.');
    git('-c','user.name=CI Test','-c','user.email=ci@example.invalid','commit','-qm','untrusted');
    assert.equal(loadTrustedTypescript(git('rev-parse','HEAD')),null);
  } finally {
    process.chdir(previous);
    rmSync(tmp,{recursive:true,force:true});
  }
});
