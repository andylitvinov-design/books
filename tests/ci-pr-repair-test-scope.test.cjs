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
