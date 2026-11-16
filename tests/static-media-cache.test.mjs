import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStaticMediaCache, isPcmWav } from '../scripts/vercel-static-media-cache.mjs';

const valid = b => b.toString().startsWith('approved');
function fixture(t) {
  const root=mkdtempSync(join(tmpdir(),'hh-media-cache-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  mkdirSync(join(root,'scripts'));
  writeFileSync(join(root,'scripts/generator.mjs'),'original');
  cpSync(new URL('../scripts/vercel-static-media-cache.mjs',import.meta.url),join(root,'scripts/vercel-static-media-cache.mjs'));
  writeFileSync(join(root,'package-lock.json'),'{}');
  const options={root,group:'fixture',sources:['scripts/generator.mjs'],enabled:true};
  return {root,options,cache:createStaticMediaCache(options)};
}
test('cold miss, byte-identical warm hit, source and lockfile invalidation',t=>{
  const {root,options,cache}=fixture(t), bytes=Buffer.from('approved-output');
  assert.equal(cache.get('asset',valid),null);
  assert.deepEqual(cache.put('asset',bytes,valid),bytes);
  assert.deepEqual(createStaticMediaCache(options).get('asset',valid),bytes);
  writeFileSync(join(root,'scripts/generator.mjs'),'changed');
  const changed=createStaticMediaCache(options);
  assert.equal(changed.get('asset',valid),null);
  changed.put('asset',bytes,valid);
  writeFileSync(join(root,'package-lock.json'),'{"changed":true}');
  assert.equal(createStaticMediaCache(options).get('asset',valid),null);
  assert.equal(readdirSync(join(root,'.next/cache/hh-static-media/fixture')).length,2);
});
test('corruption and partial cache safely miss; invalid generated outputs fail',t=>{
  const {root,cache}=fixture(t),bytes=Buffer.from('approved-output');
  cache.put('asset',bytes,valid);
  const dir=join(root,'.next/cache/hh-static-media/fixture');
  const file=readdirSync(dir).find(x=>!x.endsWith('.json'));
  writeFileSync(join(dir,file),'approved-broken');
  assert.equal(cache.get('asset',valid),null);
  cache.put('asset',bytes,valid);
  rmSync(join(dir,file+'.json'));
  assert.equal(cache.get('asset',valid),null);
  assert.throws(()=>cache.put('asset',Buffer.from('invalid'),valid));
});
test('disabled/missing fingerprint never reads cache; unavailable cache keeps generated output',t=>{
  const {root,options,cache}=fixture(t),bytes=Buffer.from('approved-output');
  cache.put('asset',bytes,valid);
  assert.equal(createStaticMediaCache({...options,enabled:false}).get('asset',valid),null);
  rmSync(join(root,'package-lock.json'));
  assert.equal(createStaticMediaCache(options).get('asset',valid),null);
  rmSync(join(root,'.next'),{recursive:true});
  writeFileSync(join(root,'.next'),'not a directory');
  assert.deepEqual(cache.put('asset',bytes,valid),bytes);
});
test('WAV validation rejects wrong duration and malformed input',()=>{
  assert.equal(isPcmWav(Buffer.alloc(0),22050,32),false);
  assert.equal(isPcmWav(Buffer.alloc(44+22050*32*2),22050,32),false);
});
