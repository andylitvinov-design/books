import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { decideRoute, parseChangedRows, validateImage } from '../scripts/ci-quick-route.mjs';

const image = (filename,status='M')=>({filename,status});
const trusted=filenames=>filenames.every(x=>x.startsWith('public/'))?'FAST':'STRICT';
const row = (filename,status='M')=>({filename,status});

function crc32(bytes) {
  let c=0xffffffff;
  for(const b of bytes) {
    c ^= b;
    for(let i=0;i<8;i++) c = (c&1) ? (c>>>1)^0xedb88320 : c>>>1;
  }
  return (c^0xffffffff)>>>0;
}
function chunk(type, data) {
  const label=Buffer.from(type,'ascii');
  const length=Buffer.alloc(4); length.writeUInt32BE(data.length);
  const crc=Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([label,data])));
  return Buffer.concat([length,label,data,crc]);
}
function validPng() {
  const header=Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(1,0); ihdr.writeUInt32BE(1,4);
  ihdr[8]=8; ihdr[9]=6; // 1x1 RGBA
  return Buffer.concat([header,chunk('IHDR',ihdr),
    chunk('IDAT',deflateSync(Buffer.from([0,0,0,0,255]))),chunk('IEND',Buffer.alloc(0))]);
}
function validWebpContainer() {
  // Minimum VP8L RIFF envelope for structural tests; CI routes are still
  // checked by independent Git blob hashes and hardened image tooling.
  const data=Buffer.from([47,0,0,0,0,0,0,0,0]);
  const length=Buffer.alloc(4); length.writeUInt32LE(data.length);
  const body=Buffer.concat([Buffer.from('WEBPVP8L'),length,data,Buffer.from([0])]);
  const ri=Buffer.alloc(4); ri.writeUInt32LE(body.length);
  return Buffer.concat([Buffer.from('RIFF'),ri,body]);
}

test('fast router requires exact, nonempty, NUL-delimited Git statuses',()=>{
  assert.deepEqual(parseChangedRows('M\0public/hero.webp\0A\0public/new.png\0'),[
    image('public/hero.webp'),image('public/new.png','A')]);
  for(const source of ['', 'M\0', 'M\0file\0D\0', 'R100\0old\0new\0',
    'M\0public/a\nb.webp\0','M\0public/../secret.png\0']) {
    assert.throws(()=>parseChangedRows(source),source);
  }
});
test('image-only routes skip Core only when EVERY changed file is a trusted public raster',()=>{
  assert.equal(decideRoute([image('public/images/home.webp'),image('public/images/cover.png','A')],trusted),'ASSETS');
  for(const changed of [
    [image('public/hero.webp'),row('components/site-video.tsx')],
    [image('public/hero.webp','D')],
    [image('public/hero.webp','T')],
    [image('public/hero.webp'),image('public/privacy/banner.png')],
    [image('public/../secret.webp')],
    [image('static/cover.png')],
    [image('public/script.svg')],
    [image('public/banner.webp'),row('.github/workflows/other.yml')],
  ])assert.notEqual(decideRoute(changed,trusted),'ASSETS',JSON.stringify(changed));
  assert.equal(decideRoute([image('public/test.webp')],()=> 'STRICT'),'CORE');
  assert.equal(decideRoute([image('public/test.webp')]),'CORE');
});
test('public JSX is only a candidate until BASE-pinned #2777 proof succeeds',()=>{
  const txt='app/[locale]/about/page.tsx';
  assert.equal(decideRoute([row(txt)],trusted,()=>{}),'TEXT_CANDIDATE');
  assert.equal(decideRoute([row(txt,'A')],trusted,()=>{}),'CORE');
  assert.equal(decideRoute([row(txt),row('app/[locale]/about/page.module.css')],trusted,()=>{}),'CORE');
  assert.equal(decideRoute([row(txt),image('public/a.webp')],trusted,()=>{}),'CORE');
  for(const risk of [
    'app/[locale]/services/page.tsx',
    'app/[locale]/auth/page.tsx',
    'app/[locale]/about/page.tsx.bak',
    'components/remote-energy-landing.tsx',
  ])assert.notEqual(decideRoute([row(risk)],trusted,()=>{}),'TEXT_CANDIDATE');
});
test('sensitive changes always demand full Core and specialist route',()=>{
  const paths=[
    'app/api/payment/route.ts','app/[locale]/client/page.tsx',
    'app/[locale]/auth/login.tsx','components/checkout/card.tsx',
    'lib/billing/price.js','supabase/migrations/001.sql',
    'lib/auth/session.js','tests/ci-specialist-aggregate.test.mjs',
    '.github/workflows/hh-pr-core-release.yml','scripts/ci-specialist-aggregate.mjs',
    'package-lock.json','next.config.ts','middleware.ts','AGENTS.md',
  ];
  for(const path of paths) {
    assert.equal(decideRoute([row(path)],trusted,()=>{}),'FULL',path);
    assert.equal(decideRoute([row('app/[locale]/about/page.tsx'),row(path)],trusted,()=>{}),'FULL',path);
  }
  assert.equal(decideRoute([],trusted,()=>{}),'FULL');
});
test('valid PNG passes structural checks including every chunk CRC',()=>{
  const bytes=validPng();
  assert.equal(validateImage('public/icons/logo.png',bytes),true);
  const corrupted=Buffer.from(bytes); corrupted[corrupted.length-6]^=1;
  assert.throws(()=>validateImage('public/logo.png',corrupted),/PNG_CRC/);
  assert.throws(()=>validateImage('public/logo.png',bytes.subarray(0,-4)),/PNG_/);
});
test('WebP RIFF bounds and picture header checked without installing Next',()=>{
  const bytes=validWebpContainer();
  assert.equal(validateImage('public/cover.webp',bytes),true);
  const corrupted=Buffer.from(bytes); corrupted.writeUInt32LE(2,4);
  assert.throws(()=>validateImage('public/cover.webp',corrupted),/WEBP_RIFF/);
  assert.throws(()=>validateImage('public/cover.webp',Buffer.from('hello world')),/IMAGE_PATH_OR_SIZE/);
});
test('images do not allow active SVG, executable extension or truncated media',()=>{
  const bytes=validPng();
  for(const path of ['public/intro.svg','public/photo.jpg.php','components/photo.png','public/../a.png','public/private/a.png.exe'])
    assert.throws(()=>validateImage(path,bytes),/IMAGE_PATH_OR_SIZE/,path);
  assert.throws(()=>validateImage('public/banner.avif',bytes),/AVIF_/);
  assert.throws(()=>validateImage('public/icon.ico',bytes),/ICO_/);
});
test('Core workflow never accepts a skipped job on FULL or CORE',()=>{
  const w=readFileSync('.github/workflows/hh-pr-core-release.yml','utf8');
  assert.match(w,/route: \${{ steps\.fast\.outputs\.route }}/);
  assert.match(w,/needs\.scope\.outputs\.route != 'ASSETS'/);
  assert.match(w,/needs\.scope\.outputs\.route != 'TEXT'/);
  assert.match(w,/\$ROUTE" == ASSETS/);
  assert.match(w,/\$ROUTE" == TEXT/);
  assert.match(w,/\$CODE_RESULT" == success/);
  assert.match(w,/git show "\$tested_base:scripts\/ci-quick-route\.mjs"/);
  assert.match(w,/HH_HEAD_SHA: \${{ github\.event\.pull_request\.head\.sha }}/);
  assert.doesNotMatch(w,/continue-on-error:\s*true/);
});

test('exact Git merge routes real modified images and fails corrupt media closed',async()=>{
  const { mkdtempSync,mkdirSync,writeFileSync,rmSync }=await import('node:fs');
  const { tmpdir }=await import('node:os');
  const { join,resolve }=await import('node:path');
  const { execFileSync,spawnSync }=await import('node:child_process');
  const dir=mkdtempSync(join(tmpdir(),'hh-quick-route-merge-'));
  const env={...process.env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',
    GIT_AUTHOR_NAME:'Synthetic',GIT_AUTHOR_EMAIL:'synthetic@example.invalid',
    GIT_COMMITTER_NAME:'Synthetic',GIT_COMMITTER_EMAIL:'synthetic@example.invalid'};
  const git=(...args)=>execFileSync('git',['-c','core.hooksPath=/dev/null',...args],
    {cwd:dir,env,encoding:'utf8',timeout:10_000,maxBuffer:2_000_000}).trim();
  const file=(path,value)=>{mkdirSync(join(dir,path,'..'),{recursive:true});writeFileSync(join(dir,path),value);};
  try {
    git('init','-q');
    file('scripts/ci-quick-route.mjs',readFileSync('scripts/ci-quick-route.mjs'));
    file('lib/ci/specialist-aggregate.mjs',readFileSync('lib/ci/specialist-aggregate.mjs'));
    file('public/banner.png',validPng());
    git('add','--all');git('commit','-q','-m','base with trusted router');
    const base=git('rev-parse','HEAD'), branch=git('branch','--show-current');
    git('checkout','-qb','image-change');
    const changed=Buffer.from(validPng());changed[changed.length-5]^=1; // intentionally broken CRC
    // First exercise the valid fast path with a fresh complete PNG.
    file('public/banner.png',validPngWithColor(99));
    git('add','--all');git('commit','-q','-m','new image');
    const head=git('rev-parse','HEAD');
    git('checkout','-q',branch);git('merge','-q','--no-ff','image-change','-m','exact merge checkout');
    assert.equal(git('rev-parse','HEAD^1'),base);
    assert.equal(git('rev-parse','HEAD^2'),head);
    const script=resolve('scripts/ci-quick-route.mjs');
    const run=(baseSha,headSha)=>spawnSync(process.execPath,[script],
      {cwd:dir,env:{...env,HH_TESTED_BASE_SHA:baseSha,HH_HEAD_SHA:headSha},
       encoding:'utf8',timeout:20_000,maxBuffer:1_000_000});
    const good=run(base,head);
    assert.equal(good.status,0,good.stderr);
    assert.equal(good.stdout.trim(),'ASSETS');
    const wrong=run(base,'0'.repeat(40));
    assert.notEqual(wrong.status,0,'stale PR HEAD must never get fast routing');
    git('checkout','-qb','corrupt-image',base);
    file('public/banner.png',changed);
    git('add','--all');git('commit','-q','-m','corrupt image');
    const badHead=git('rev-parse','HEAD');
    git('checkout','-q','-B','validate-bad',base);
    git('merge','-q','--no-ff','corrupt-image','-m','candidate with broken media');
    const bad=run(base,badHead);
    assert.notEqual(bad.status,0,'invalid image cannot skip Core with a green route');
    assert.match(bad.stderr,/PNG_CRC|CI_FAST_ROUTE_FAILED/);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
function validPngWithColor(value){
  const out=Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(1,0);ihdr.writeUInt32BE(1,4);ihdr[8]=8;ihdr[9]=6;
  return Buffer.concat([out,chunk('IHDR',ihdr),
    chunk('IDAT',deflateSync(Buffer.from([0,value,0,0,255]))),chunk('IEND',Buffer.alloc(0))]);
}

test('temporary backlog route leaves private, policy and unknown changes on full specialist gate', () => {
  const paths = [
    'app/[locale]/app/messages/page.tsx','lib/practitioners/direct-messages.js',
    'components/app/mobile-profile.jsx','app/[locale]/services/page.tsx',
    'lib/wallet/reconcile.js','lib/ai/provider-api.js','tests/privacy-consent.test.mjs',
    'docs/operations/CI_RELEASE_POLICY.md','.github/workflows/hh-pr-core-release.yml',
    'scripts/ci-quick-route.mjs','package.json','middleware.ts',
    'supabase/migrations/001.sql','unrecognized/file.js'
  ];
  for (const path of paths) assert.equal(decideRoute([row(path)],trusted),'FULL',path);
  for (const path of ['app/[locale]/about/page.tsx','lib/mandala/cinematic-director.mjs','components/public-greeting.jsx','docs/guide.md'])
    assert.equal(decideRoute([row(path)],trusted),'CORE',path);
  assert.equal(decideRoute([row('components/public-greeting.jsx','D')],trusted),'FULL');
  const gate=readFileSync('.github/workflows/hh-pr-core-release.yml','utf8');
  assert.match(gate,/needs\.scope\.outputs\.route == 'FULL'/);
  assert.match(gate,/\[\[ "\$CODE_RESULT" == success \]\]/);
  const loose=readFileSync('.github/workflows/hh-loose-release-ready-once.yml','utf8');
  assert.ok(loose.includes("      - '.github/workflows/hh-pr-core-release.yml'"));
}
