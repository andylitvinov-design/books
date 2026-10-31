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
