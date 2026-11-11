'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {selectTests}=require('../scripts/ci-pr-repair-test-scope.cjs');
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hh-repair-tests-'));
 fs.mkdirSync(path.join(root,'tests'),{recursive:true});
 const put=(name,text)=>{const f=path.join(root,name);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,text)};
 return {root,put,cleanup:()=>fs.rmSync(root,{recursive:true,force:true})};
}
test('selects only direct imports for every modified file',()=>{
 const f=fixture();try{
  f.put('tests/a.test.mjs',"import '../src/a.mjs';\nimport test from 'node:test';\ntest('a',()=>{});\n");
  f.put('tests/b.test.cjs',"require('../src/b.js');\nconst test=require('node:test');\ntest('b',()=>{});\n");
  f.put('tests/unrelated.test.mjs',"const text=\"import '../src/c.js'\";\n/*\nimport '../src/c.js';\n*/\n");
  assert.deepEqual(selectTests(f.root,['src/a.mjs','src/b.js'],['tests/a.test.mjs','tests/b.test.cjs','tests/unrelated.test.mjs']),['tests/a.test.mjs','tests/b.test.cjs']);
  assert.equal(selectTests(f.root,['src/c.js'],['tests/unrelated.test.mjs']),null);
  f.put('tests/template.test.mjs',"const x = `\nimport '../src/c.js';\n`;\n");
  assert.equal(selectTests(f.root,['src/c.js'],['tests/template.test.mjs']),null);
  f.put('tests/empty.test.mjs',"import '../src/c.js';\n");
  assert.equal(selectTests(f.root,['src/c.js'],['tests/empty.test.mjs']),null);
 }finally{f.cleanup()}
});

test('accepts literal repository-root source reads but not dynamic or spoofed helpers',()=>{
 const f=fixture();try{
  f.put('src/landing.tsx','export const page=true;\n');
  const prolog="import test from 'node:test';\nimport {readFileSync} from 'node:fs';\n";
  const literal="const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')\n";
  f.put('tests/source.test.mjs',prolog+literal+
   "test('entry',()=>{\n const freeEntry=read('src/landing.tsx')\n if(!freeEntry)throw Error('missing')\n})\n");
  assert.deepEqual(selectTests(f.root,['src/landing.tsx'],['tests/source.test.mjs']),
    ['tests/source.test.mjs']);
  f.put('tests/source.test.mjs',prolog+
   "const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')\n"+
   "test('entry',()=>{const freeEntry=read('src/landing.tsx')})\n");
  assert.equal(selectTests(f.root,['src/landing.tsx'],['tests/source.test.mjs']),null,
    'unverified helper aliases must not be counted as coverage');
  f.put('tests/source.test.mjs',prolog+literal+
   "test('entry',()=>{\n const file='src/landing.tsx'\n const freeEntry=read(file)\n})\n");
  assert.equal(selectTests(f.root,['src/landing.tsx'],['tests/source.test.mjs']),null,
    'dynamic paths do not establish direct source coverage');
 }finally{f.cleanup()}
});

test('direct static node:fs URL test counts as source coverage only for an exact literal path',()=>{
 const f=fixture();try{
  f.put('components/acquisition-event-link.tsx','export const consent=true;\n');
  f.put('tests/acquisition-event-link-owner-wake-canary.test.mjs',
   "import test from 'node:test';\n"+
   "import {readFileSync} from 'node:fs';\n"+
   "const source=readFileSync(new URL('../components/acquisition-event-link.tsx',import.meta.url),'utf8');\n"+
   "test('direct source',()=>{if(!source)throw Error('missing')});\n");
  const target=['components/acquisition-event-link.tsx'];
  const testFiles=['tests/acquisition-event-link-owner-wake-canary.test.mjs'];
  assert.deepEqual(selectTests(f.root,target,testFiles),testFiles);
  for(const invalid of [
   // A claimed path in a comment is never a genuine direct source read.
   "import test from 'node:test';\nimport {readFileSync} from 'node:fs';\n"+
    "// const source=readFileSync(new URL('../components/acquisition-event-link.tsx',import.meta.url),'utf8');\n"+
    "test('fake',()=>{});\n",
   // No imported native readFileSync means a test may have stubbed the reader.
   "import test from 'node:test';\n"+
    "const source=readFileSync(new URL('../components/acquisition-event-link.tsx',import.meta.url),'utf8');\n"+
    "test('fake',()=>{});\n",
   "import test from 'node:test';\nimport {readFileSync as read} from 'node:fs';\n"+
    "const source=readFileSync(new URL('../components/acquisition-event-link.tsx',import.meta.url),'utf8');\n"+
    "test('fake',()=>{});\n",
   // A variable URL does not prove the test actually reads this source path.
   "import test from 'node:test';\nimport {readFileSync} from 'node:fs';\n"+
    "const file='../components/acquisition-event-link.tsx';\n"+
    "const source=readFileSync(new URL(file,import.meta.url),'utf8');\n"+
    "test('fake',()=>{});\n",
   // Traversal, interpolation and path trickery never become trusted.
   "import test from 'node:test';\nimport {readFileSync} from 'node:fs';\n"+
    "const source=readFileSync(new URL('../components/../components/acquisition-event-link.tsx',import.meta.url),'utf8');\n"+
    "test('fake',()=>{});\n",
   "import test from 'node:test';\nimport {readFileSync} from 'node:fs';\n"+
    "const source=readFileSync(new URL('../components/acquisition-event-link.tsx',import.meta.url),'latin1');\n"+
    "test('fake',()=>{});\n",
   "import test from 'node:test';\nimport {readFileSync} from 'node:fs';\n"+
    "const source=readFileSync(new URL('../components/other.tsx',import.meta.url),'utf8');\n"+
    "test('fake',()=>{});\n"
  ]){
   f.put(testFiles[0],invalid);
   assert.equal(selectTests(f.root,target,testFiles),null,'unsafe test must not satisfy source coverage');
  }
 }finally{f.cleanup()}
});

test('safe Next locale and route-group source paths receive literal test coverage',()=>{
 const f=fixture();try{
  for(const p of ['app/[locale]/about/page.tsx','app/(public)/about/page.tsx'])
   f.put(p,'export const page=true;\n');
  f.put('tests/locale.test.mjs',
   "import '../app/[locale]/about/page.tsx';\nimport test from 'node:test';\ntest('locale',()=>{});\n");
  f.put('tests/group.test.mjs',
   "import '../app/(public)/about/page.tsx';\nimport test from 'node:test';\ntest('group',()=>{});\n");
  assert.deepEqual(selectTests(f.root,
   ['app/[locale]/about/page.tsx','app/(public)/about/page.tsx'],
   ['tests/locale.test.mjs','tests/group.test.mjs']),
   ['tests/group.test.mjs','tests/locale.test.mjs']);
  assert.equal(selectTests(f.root,['app/[locale]/../secret/page.tsx'],
   ['tests/locale.test.mjs']),null);
  assert.equal(selectTests(f.root,['app//about/page.tsx'],
   ['tests/locale.test.mjs']),null);
 }finally{f.cleanup()}
});

test('missing coverage, malformed paths, symlinks and excessive test scope fail closed',()=>{
 const f=fixture();try{
  f.put('tests/a.test.mjs',"import '../src/a.mjs';\nimport test from 'node:test';\ntest('a',()=>{});\n");
  fs.symlinkSync(path.join(f.root,'tests/a.test.mjs'),path.join(f.root,'tests/link.test.mjs'));
  assert.equal(selectTests(f.root,['src/a.mjs','src/b.js'],['tests/a.test.mjs']),null);
  assert.equal(selectTests(f.root,['../escape.js'],['tests/a.test.mjs']),null);
  assert.equal(selectTests(f.root,['src/a.mjs'],['tests/link.test.mjs']),null);
  assert.equal(selectTests(f.root,['src/a.mjs'],Array(51).fill('tests/a.test.mjs')),null);
 }finally{f.cleanup()}
});

test('CLI executes a real related test and rejects failure',()=>{
 const {execFileSync,spawnSync}=require('node:child_process');const f=fixture();
 const gate=path.resolve(__dirname,'../scripts/ci-pr-repair-test-scope.cjs');
 try{
  f.put('src/a.mjs','export const value=1;\n');
  f.put('tests/a.test.mjs',"import {value} from '../src/a.mjs';\nimport {test} from 'node:test';\ntest('a',()=>{if(value!==1)throw Error('bad')});\n");
  execFileSync('git',['init','-q'],{cwd:f.root});execFileSync('git',['add','tests/a.test.mjs'],{cwd:f.root});
  assert.equal(spawnSync(process.execPath,[gate,'src/a.mjs'],{cwd:f.root}).status,0);
  f.put('src/a.mjs','export const value=2;\n');
  assert.notEqual(spawnSync(process.execPath,[gate,'src/a.mjs'],{cwd:f.root}).status,0);
  assert.notEqual(spawnSync(process.execPath,[gate,'src/missing.mjs'],{cwd:f.root}).status,0);
  f.put('tests/a.test.mjs',"import '../src/a.mjs';\nimport test from 'node:test';\ntest('skip',{skip:true},()=>{});\n");
  assert.notEqual(spawnSync(process.execPath,[gate,'src/a.mjs'],{cwd:f.root}).status,0);
  f.put('tests/a.test.mjs',"import '../src/a.mjs';\nimport test from 'node:test';\nif(false){\ntest('never',()=>{});\n}\n");
  assert.notEqual(spawnSync(process.execPath,[gate,'src/a.mjs'],{cwd:f.root}).status,0);
  f.put('src/b.mjs','export const b=1;\n');
  f.put('tests/b.test.mjs',"import '../src/b.mjs';\nimport test from 'node:test';\ntest('real',()=>{});\n");
  execFileSync('git',['add','tests/b.test.mjs'],{cwd:f.root});
  assert.notEqual(spawnSync(process.execPath,[gate,'src/a.mjs','src/b.mjs'],{cwd:f.root}).status,0);
 }finally{f.cleanup()}
});

test('worker runs the trusted test selector before it creates a source candidate',()=>{
 const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/hh-pr-repair-worker.yml'),'utf8');
 assert.ok(workflow.includes('path: .hh-trusted'));
 assert.ok(workflow.includes("['.hh-trusted/scripts/ci-pr-repair-test-scope.cjs',...changed]"));
 assert.ok(workflow.includes('gate.status===0'));
 assert.ok(workflow.includes('before.get(p)===digest(p)'));
 assert.ok(workflow.indexOf('gate.status===0')<workflow.indexOf('result.files.push('));
});


function committedBaselineFixture({baseline='export const value=1;\\n',patched='export const value=2;\\n',
 green=true,stale=true,staleMessageChanges=false}={}){
 const {execFileSync}=require('node:child_process');
 const f=fixture();
 f.put('src/a.mjs',baseline.replace('\\n','\n'));
 if(green)f.put('tests/green.test.mjs',
  "import '../src/a.mjs';\\nimport test from 'node:test';\\ntest('related green',()=>{});\\n".replaceAll('\\n','\n'));
 if(stale)f.put('tests/stale.test.mjs',staleMessageChanges
  ? "import {value} from '../src/a.mjs';\\nimport test from 'node:test';\\ntest('stale',()=>{throw Error('preexisting issue '+value)});\\n".replaceAll('\\n','\n')
  : "import '../src/a.mjs';\\nimport test from 'node:test';\\ntest('stale',()=>{throw Error('preexisting issue')});\\n".replaceAll('\\n','\n'));
 execFileSync('git',['init','-q'],{cwd:f.root});
 execFileSync('git',['add','.'],{cwd:f.root});
 execFileSync('git',['-c','user.name=Repair Test','-c','user.email=repair-test@example.invalid',
  'commit','-qm','baseline'],{cwd:f.root});
 f.put('src/a.mjs',patched.replace('\\n','\n'));
 return f;
}
test('a known baseline-red related test is quarantined only with unchanged TAP plus green direct coverage',()=>{
 const f=committedBaselineFixture();
 try{
  const run=require('node:child_process').spawnSync(process.execPath,
   [path.resolve(__dirname,'../scripts/ci-pr-repair-test-scope.cjs'),'src/a.mjs'],
   {cwd:f.root,encoding:'utf8'});
  assert.equal(run.status,0,run.stderr||run.stdout);
  assert.match(run.stdout,/HH_REPAIR_PREEXISTING_TEST_FAILURE/);
  assert.ok(run.stdout.includes('HH_REPAIR_TEST_PASS tests/green'));
  assert.equal(fs.readFileSync(path.join(f.root,'src/a.mjs'),'utf8'),
   'export const value=2;\n','baseline probe must restore the exact repaired source bytes');
 }finally{f.cleanup()}
});
test('changed failure diagnostic is never waived as a preexisting related test failure',()=>{
 const f=committedBaselineFixture({staleMessageChanges:true});
 try{
  const run=require('node:child_process').spawnSync(process.execPath,
   [path.resolve(__dirname,'../scripts/ci-pr-repair-test-scope.cjs'),'src/a.mjs'],
   {cwd:f.root,encoding:'utf8'});
  assert.notEqual(run.status,0);
  assert.match(run.stderr,/RELATED_TEST_REGRESSION_OR_UNVERIFIED_BASELINE/);
 }finally{f.cleanup()}
});
test('all-stale test scope still fails closed when no direct source test passes',()=>{
 const f=committedBaselineFixture({green:false});
 try{
  const run=require('node:child_process').spawnSync(process.execPath,
   [path.resolve(__dirname,'../scripts/ci-pr-repair-test-scope.cjs'),'src/a.mjs'],
   {cwd:f.root,encoding:'utf8'});
  assert.notEqual(run.status,0);
  assert.match(run.stderr,/NO_GREEN_DIRECT_SOURCE_COVERAGE/);
 }finally{f.cleanup()}
});
test('baseline-green test becoming red is a regression even when other tests pass',()=>{
 const f=committedBaselineFixture({stale:false});
 try{
  f.put('tests/regression.test.mjs',
    "import {value} from '../src/a.mjs';\nimport test from 'node:test';\ntest('source contract',()=>{if(value!==1)throw Error('new regression')});\n");
  const cp=require('node:child_process');
  cp.execFileSync('git',['add','tests/regression.test.mjs'],{cwd:f.root});
  cp.execFileSync('git',['-c','user.name=Repair Test','-c','user.email=repair-test@example.invalid',
    'commit','-qm','add baseline contract'],{cwd:f.root});
  const run=cp.spawnSync(process.execPath,
   [path.resolve(__dirname,'../scripts/ci-pr-repair-test-scope.cjs'),'src/a.mjs'],
   {cwd:f.root,encoding:'utf8'});
  assert.notEqual(run.status,0);
  assert.match(run.stderr,/RELATED_TEST_REGRESSION_OR_UNVERIFIED_BASELINE/);
 }finally{f.cleanup()}
});

test('valid multi-import node:fs direct coverage is accepted without trusting aliases',()=>{
 const f=fixture();
 try{
  const sourceFile='components/public-landing.tsx';
  const testFile='tests/landing-source.test.mjs';
  f.put(sourceFile,'export const landing=true;\n');
  const read="const source=readFileSync(new URL('../components/public-landing.tsx',import.meta.url),'utf8');\n";
  const body="import test from 'node:test';\n";
  const check="test('landing source',()=>{if(!source)throw Error('missing')});\n";
  const imports=[
   "import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';\n",
   'import { mkdirSync, readFileSync } from "node:fs";\n',
   "import {readFileSync, writeFileSync as write} from 'node:fs';\n"
  ];
  for(const imported of imports){
   f.put(testFile,body+imported+read+check);
   assert.deepEqual(selectTests(f.root,[sourceFile],[testFile]),[testFile],
     'a real unaliased native source reader has direct coverage');
  }
  for(const imported of [
   "import { readFileSync as read, mkdirSync } from 'node:fs';\n",
   "import { readFileSync, mkdirSync } from 'node:fs/promises';\n",
   "import { getReadFileSync, mkdirSync } from 'node:fs';\n",
   "// import { readFileSync, mkdirSync } from 'node:fs';\n",
   "import { readFileSync, readFileSync as extra } from 'node:fs';\n"
  ]){
   f.put(testFile,body+imported+read+check);
   assert.equal(selectTests(f.root,[sourceFile],[testFile]),null,
     'an untrusted/missing/aliased fs import must not authorize coverage');
  }
  f.put(testFile,body+imports[0]+
   "const file='../components/public-landing.tsx';\n"+
   "const source=readFileSync(new URL(file,import.meta.url),'utf8');\n"+check);
  assert.equal(selectTests(f.root,[sourceFile],[testFile]),null,
    'dynamic source paths remain forbidden');
 }finally{f.cleanup();}
});
