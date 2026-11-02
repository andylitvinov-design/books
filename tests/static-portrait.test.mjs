import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import sharp from 'sharp';
const require=createRequire(import.meta.url);
const manifest=JSON.parse(readFileSync('data/static-portrait.json'));
const source=readFileSync('components/static-portrait.tsx','utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const compiled={exports:{}};new Function('require','module','exports',code)(name=>name.endsWith('static-portrait.json')?manifest:require(name),compiled,compiled.exports);
const {StaticPortrait}=compiled.exports;

test('portrait original remains exact, all six static variants decode and match provenance',async()=>{
 const original=readFileSync('public'+manifest.source);assert.equal(createHash('sha256').update(original).digest('hex'),manifest.sourceSha256);
 assert.equal(manifest.variants.length,6);assert.equal((await sharp(original).stats()).channels[3].min,255);
 for(const variant of manifest.variants){const b=readFileSync('public'+variant.path);assert.equal(b.length,variant.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),variant.sha256);const m=await sharp(b).metadata();assert.equal(m.width,variant.width);assert.equal(m.height,variant.height);assert.equal(((await sharp(b).stats()).channels[3]?.min ?? 255),255);assert.ok(Math.abs(variant.width/variant.height-1079/1057)<0.01);assert.ok(variant.bytes<220000);}
});

test('responsive portrait preserves Next layout, alt, sizes, priority and lazy loading',()=>{
 const priority=StaticPortrait({src:manifest.source,alt:'Andrey',fill:true,priority:true,sizes:'(max-width: 767px) 100vw, 620px'});
 assert.equal(priority.type,'img');assert.equal(priority.props.alt,'Andrey');assert.equal(priority.props.style.position,'absolute');assert.equal(priority.props.style.width,'100%');assert.equal(priority.props.sizes,'(max-width: 767px) 100vw, 620px');assert.equal(priority.props.fetchPriority,'high');assert.equal(priority.props.loading,undefined);assert.equal(priority.props.srcSet.split(', ').length,6);assert.ok(!priority.props.srcSet.includes('/_next/image'));
 const lazy=StaticPortrait({src:manifest.source,alt:'',width:900,height:720,className:'original',loading:'lazy',sizes:'450px'});assert.equal(lazy.props.loading,'lazy');assert.equal(lazy.props.width,900);assert.equal(lazy.props.height,720);assert.equal(lazy.props.className,'original');assert.equal(lazy.props.alt,'');
 assert.throws(()=>StaticPortrait({src:'/other.png',alt:'',width:20,height:20}),/verified portrait/);
});

test('approved live Home uses real static portraits without restoring oversized Services hero',()=>{
 const files=['components/holistic-house-home.tsx','app/es/page.tsx'];let count=0;
 for(const f of files){const s=readFileSync(f,'utf8');count+=(s.match(/<StaticPortrait\b/g)||[]).length;assert.ok(s.includes('/images/holistic-house/andy-about.png'));}
 assert.equal(count,3);
 const services=readFileSync("app/es/services/page.tsx","utf8");
 assert.ok(services.includes("className={offerStyles.photo}"));
 assert.ok(services.includes("data-es-services-photo-cards"));
});

test('only new public artwork folders are excluded from function tracing',()=>{
 const s=readFileSync('next.config.ts','utf8');assert.ok(s.includes('"/*": ["./public/images/reiki-originals/**/*", "./public/images/holistic-house/portrait-static/**/*", "./public/images/holistic-house/static-card-media/**/*"]'));
 assert.ok(s.includes('source: "/images/holistic-house/static-card-media/:path*"'));assert.ok(!s.includes('"./public/**/*"'));
});
