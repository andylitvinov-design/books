import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parsePaths,syntaxCandidates,impactsTypes,mayDelegateTypesToNext,rootFingerprint,
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

test('Core preflight skips only redundant CSS/data typing; Next and DOCK remain type-safe',()=>{
  const workflow=readFileSync('.github/workflows/hh-pr-core-release.yml','utf8');
  const source=readFileSync('scripts/ci-source-preflight.mjs','utf8');
  const block=workflow.split('      - name: Source Preflight — syntax and TypeScript before costly Next build')[1]
    ?.split('      - name: Upload Source Preflight root diagnostics on failure')[0];
  assert.ok(block,'early preflight missing');
  assert.match(block,/steps\.fast\.outputs\.route/);
  assert.match(block,/GITHUB_EVENT_NAME/);
  assert.match(block,/DOCK/);
  assert.match(block,/args\+=\(--full-types\)/);
  assert.match(block,/node scripts\/ci-source-preflight\.mjs/);
  assert.match(source,/const typechecked=fullTypes\|\|\(!typecheckDelegated&&impactsTypes\(paths\)\)/);
  assert.equal(impactsTypes(['app/[locale]/about/page.module.css','public/images/home.webp']),false);
  assert.equal(impactsTypes(['app/[locale]/about/page.tsx']),true);
  assert.equal(impactsTypes(['components/app/messages-bottom-navigation.jsx']),true);
  assert.equal(impactsTypes(['tsconfig.json']),true);
  assert.equal(impactsTypes(['package-lock.json']),true);
  assert.match(workflow,/name: Exact proposed release production build and TypeScript check/);
  assert.match(workflow,/run: npm run build/);
  assert.match(workflow,/^  hh-specialist:/m);
  assert.match(workflow,/^  hh-merge-check:/m);
});

test('CORE and only exact non-sensitive Mandala media FULL share mandatory Next TypeScript',()=>{
  const cfg=readFileSync('next.config.ts','utf8');
  const p=(paths,route='CORE',ciOnly='false',eventName='pull_request',nextConfig=cfg)=>
    mayDelegateTypesToNext(paths,{eventName,route,ciOnly,nextConfig});
  assert.equal(p(['components/mandala-free-video-studio.tsx']),true);
  assert.equal(p(['app/en/explore/page.tsx','app/en/explore/page.module.css']),true);
  // The BASE-trusted FULL route owns browser/codec/consent checks as before.
  // Delegation removes only the duplicate early TypeScript compile.
  const reviewed=[
    'components/mandala-free-video-studio.tsx',
    'components/mandala-auto-video-director.tsx',
    'components/mandala-multitrack-timeline.tsx',
    'components/mandala-video-mobile.module.css',
    'components/mandala-auto-video-director.module.css',
    'components/mandala-multitrack-timeline.module.css',
  ];
  for(const file of reviewed.filter(path=>path.endsWith('.tsx')))
    assert.equal(p([file],'FULL'),true,file);
  assert.equal(p(['components/mandala-free-video-studio.tsx',
    'components/mandala-video-mobile.module.css'],'FULL'),true);
  for(const extra of [
    'app/api/holistic-support/voice/route.js',
    'components/mandala-affirmation-voice.tsx',
    'lib/crm/direct-messages.ts','lib/auth/session.ts',
    'lib/payments/checkout.ts','supabase/migrations/001.sql',
    'app/[locale]/client/page.tsx','tests/mandala-workspace-tabs.test.mjs',
    'scripts/verify-affirmation-voice-browser.mjs','public/videos/scene.mp4',
    'package-lock.json','next.config.ts','tsconfig.json',
    '.github/workflows/hh-pr-core-release.yml',
  ])assert.equal(p(['components/mandala-free-video-studio.tsx',extra],'FULL'),false,extra);
  assert.equal(p(['components/mandala-affirmation-voice.tsx'],'FULL'),false);
  assert.equal(p(['components/mandala-video-mobile.module.css'],'FULL'),false);
  const denied=[
    [],['app/en/explore/page.module.css'],
    ['components/public.tsx','package.json'],['components/public.tsx','package-lock.json'],
    ['components/public.tsx','tsconfig.json'],['components/public.tsx','next.config.ts'],
    ['components/public.tsx','next-env.d.ts'],['components/public.tsx','.github/workflows/hh-pr-core-release.yml'],
    ['components/public.tsx','tests/ci-source-preflight.test.mjs'],
    ['components/public.tsx','scripts/ci-source-preflight.mjs'],
  ];
  for(const files of denied)assert.equal(p(files),false,'must keep standalone tsc: '+files);
  for(const route of ['FULL','DOCK','ASSETS','TEXT','UNKNOWN'])
    assert.equal(p(['components/public.tsx'],route),false,'route '+route);
  assert.equal(p(['components/public.tsx'],'CORE','true'),false);
  assert.equal(p(['components/mandala-free-video-studio.tsx'],'FULL','true'),false);
  assert.equal(p(['components/mandala-free-video-studio.tsx'],'FULL','false','workflow_dispatch'),false);
  assert.equal(p(['components/mandala-free-video-studio.tsx'],'FULL','false','pull_request',
    cfg+'\nconst x={typescript:{ignoreBuildErrors:true}};'),false);
  assert.equal(p(['components/public.tsx'],'CORE','false','workflow_dispatch'),false);
  assert.equal(p(['components/public.tsx'],'CORE','false','pull_request',
    cfg+'\nconst x={typescript:{ignoreBuildErrors:true}};'),false);
  assert.equal(p(['components/public.tsx'],'CORE','false','pull_request',''),false);
  assert.equal(cfg.includes('ignoreBuildErrors'),false,'Next must still check all types');
});

test('delegated preflight reports unchecked types honestly and still demands exact Next build',()=>{
  const source=readFileSync('scripts/ci-source-preflight.mjs','utf8');
  const flow=readFileSync('.github/workflows/hh-pr-core-release.yml','utf8');
  const step=flow.split('      - name: Source Preflight — syntax and TypeScript before costly Next build')[1]
    ?.split('      - name: Upload Source Preflight root diagnostics on failure')[0]||'';
  const build=flow.split('      - name: Exact proposed release production build and TypeScript check')[1]
    ?.split('  hh-specialist:')[0]||'';
  for(const marker of ['HH_PREFLIGHT_ROUTE:', 'HH_PREFLIGHT_CI_ONLY:',
    '--defer-types-to-next', '--full-types'])assert.ok(step.includes(marker),'missing '+marker);
  assert.ok(step.includes('steps.fast.outputs.route'), 'require BASE-trusted router');
  assert.ok(step.includes('== CORE'), 'CORE route remains supported');
  assert.ok(step.includes('== FULL'), 'reviewed FULL can delegate to Next');
  assert.ok(source.includes('FULL_MEDIA_EDITOR_ONLY'));
  assert.ok(source.includes("route==='FULL'"));
  assert.match(flow,/run: npm run build/);
  assert.match(flow,/^  hh-specialist:/m);
  assert.ok(build.includes('run: npm run build'));
  assert.ok(build.includes("steps.diff.outputs.ci_only != 'true'"));
  assert.ok(build.includes("steps.fast.outputs.route != 'DOCK'"));
  assert.ok(flow.includes('hh-specialist:')&&flow.includes('hh-merge-check:'));
  assert.ok(source.includes('CONFLICTING_TYPECHECK_OWNERS'));
  assert.ok(source.includes('mayDelegateTypesToNext(paths'));
  const report=formatReport(['components/public.tsx'],[],false,true);
  assert.equal(report.typechecked,false);
  assert.equal(report.typecheckDelegated,true);
  assert.equal(report.status,'passed');
});
