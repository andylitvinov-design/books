import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parsePaths,syntaxCandidates,impactsTypes,rootFingerprint,
  parseTypescriptDiagnostics,summarizeFindings,formatReport,checkJavascriptSyntax,
} from '../scripts/ci-source-preflight.mjs';

test('null-separated change paths deduplicate',()=>{
  assert.deepEqual(parsePaths('scripts/a.mjs\0components/b.tsx\0scripts/a.mjs\0'),
    ['components/b.tsx','scripts/a.mjs']);
  assert.throws(()=>parsePaths(''),/INVALID_DIFF_FORMAT/);
});
test('untrusted or truncated diff fails closed',()=>{
  for(const row of ['bad','../escape.mjs\0','/tmp/private.mjs\0','-bad.mjs\0','scripts/./a.mjs\0','a\nb.mjs\0'])
    assert.throws(()=>parsePaths(row),/INVALID_DIFF_/);
});
test('syntax selection covers Node JS, React JS/JSX; TypeScript covers code and manifests',()=>{
  assert.deepEqual(syntaxCandidates(['scripts/a.mjs','tests/x.cjs','components/x.tsx','components/y.jsx','app/page.js']),
    ['scripts/a.mjs','tests/x.cjs','components/y.jsx','app/page.js']);
  assert.equal(impactsTypes(['components/x.tsx']),true);
  assert.equal(impactsTypes(['package-lock.json']),true);
  assert.equal(impactsTypes(['docs/a.md','.github/workflows/hh-pr-core-release.yml']),false);
});
test('real TS2345 maps to stable root, not generic CI/build failure',()=>{
  const log="components/mandala-free-video-studio.tsx(3767,42): error TS2345: Argument of type 'string' is not assignable to parameter of type object.\n";
  const errors=parseTypescriptDiagnostics(log);
  assert.equal(errors.length,1);
  assert.equal(errors[0].category,'source.typescript');
  assert.equal(errors[0].code,'TS2345');
  assert.equal(errors[0].line,3767);
  assert.equal(parseTypescriptDiagnostics(log.replace('(3767,42)','(3800,1)'))[0].root,errors[0].root);
  const report=formatReport(['components/mandala-free-video-studio.tsx'],errors,true);
  assert.equal(report.status,'failed');
  assert.equal(report.rootCount,1);
});
test('identical diagnostics group, different files remain distinct',()=>{
  const a=rootFingerprint('source.typescript','components/a.tsx','TS2345','A type error');
  const b=rootFingerprint('source.typescript','components/b.tsx','TS2345','A type error');
  assert.notEqual(a,b);
  const errors=[
    {root:a,category:'source.typescript',file:'components/a.tsx',code:'TS2345',message:'A type error'},
    {root:a,category:'source.typescript',file:'components/a.tsx',code:'TS2345',message:'A type error'},
    {root:b,category:'source.typescript',file:'components/b.tsx',code:'TS2345',message:'A type error'},
  ];
  assert.deepEqual(summarizeFindings(errors).map(r=>r.occurrences),[2,1]);
});
test('no findings means no invented failures',()=>{
  const report=formatReport([],[],false);
  assert.equal(report.status,'passed');
  assert.deepEqual(report.roots,[]);
});

test('JS/JSX syntax catches real errors without rejecting valid React components',()=>{
  const dir = mkdtempSync(join(tmpdir(),'hh-source-js-'));
  try {
    const plain = join(dir,'page.js'), jsx = join(dir,'card.jsx');
    const bad = join(dir,'bad.js'), badJsx = join(dir,'bad.jsx'), typed = join(dir,'typed.js');
    writeFileSync(plain,'export default function Page(){return <main><span>Hello</span></main>;}');
    writeFileSync(jsx,'export const Card = () => <article data-test="ok">Ready</article>;');
    writeFileSync(bad,"const message = 'not closed;\n");
    writeFileSync(badJsx,'function Broken(){return <div></section>;}');
    writeFileSync(typed,'function example(x: number) { return x; }');
    const findings = checkJavascriptSyntax([plain,jsx,bad,badJsx,typed]);
    assert.deepEqual(findings.map(f=>f.code).sort(),['JS1002','JS17002','JS8010']);
    assert.equal(formatReport([plain,jsx,bad,badJsx,typed],findings,false).rootCount,3);
    assert.equal(findings.find(f=>f.file===bad).line,1);
    const originalRoot = findings.find(f=>f.file===bad).root;
    writeFileSync(bad,"// a line moved\nconst message = 'not closed;\n");
    assert.equal(checkJavascriptSyntax([bad])[0].root,originalRoot);
  } finally {
    rmSync(dir,{recursive:true,force:true});
  }
});

test('unreadable changed JavaScript fails closed instead of silently passing',()=>{
  const dir = mkdtempSync(join(tmpdir(),'hh-source-missing-'));
  try {
    const findings = checkJavascriptSyntax([join(dir,'missing.js')]);
    assert.equal(findings[0].code,'JS_READ');
    assert.equal(findings[0].category,'infrastructure.preflight');
    assert.equal(findings[0].root.length,20);
  } finally {
    rmSync(dir,{recursive:true,force:true});
  }
});
