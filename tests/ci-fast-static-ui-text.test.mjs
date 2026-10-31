import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { classifyStaticUiText, scopedCssIsSafe } from '../lib/ci/fast-static-ui-text.mjs';
import { verify } from '../scripts/ci-specialist-aggregate.mjs';

const before='export default function Page() {\n  return <main>\n    <h1>Welcome</h1>\n    <p>Discover our story</p>\n  </main>;\n}\n';
const after=before.replace('Welcome','Bienvenidos').replace('Discover our story','Наша история');
const row={filename:'app/[locale]/about/page.tsx',status:'modified'};
const source=(sha,path)=>path?.endsWith('.css') ? '.card { color: red; }' : sha==='base'?before:after;

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
  const api={pr:async()=>pr,changed:async()=>[row],runs:async()=>{throw Error('unexpected diagnostic wait');}};
  const result=await verify(api,ctx,{}, {readSource:(rev)=>rev===base?before:after,maxWaitMs:0});
  assert.equal(result.risk,'FAST');
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
    const api={pr:async()=>pr,changed:async()=>[row],runs:async()=>{throw Error('unexpected diagnostic wait');}};
    process.chdir(tmp);
    assert.equal((await verify(api,{repo,head:sha,base,number:27},{},{maxWaitMs:0})).risk,'FAST');
  } finally {
    process.chdir(previous);
    rmSync(tmp,{recursive:true,force:true});
  }
});
