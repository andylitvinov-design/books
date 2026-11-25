import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

test('real Sharp cold/warm outputs equal baseline; warm cache never bypasses source pin',async t=>{
  const root=mkdtempSync(join(tmpdir(),'hh-artwork-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  for(const name of ['scripts','data','public/images'])mkdirSync(join(root,name),{recursive:true});
  symlinkSync(fileURLToPath(new URL('../node_modules',import.meta.url)),join(root,'node_modules'));
  cpSync(new URL('../scripts/vercel-static-media-cache.mjs',import.meta.url),join(root,'scripts/vercel-static-media-cache.mjs'));
  writeFileSync(join(root,'package-lock.json'),'{}');
  const original=await sharp({create:{width:100,height:80,channels:3,background:'#227755'}}).png().toBuffer();
  const sha=createHash('sha1').update('blob '+original.length+'\0').update(original).digest('hex');
  const url='/images/holistic-house/static-card-media/fixture-'+sha.slice(0,16)+'-w720.webp';
  writeFileSync(join(root,'public/images/fixture.png'),original);
  writeFileSync(join(root,'data/public-card-artwork.json'),JSON.stringify({books:{fixture:{source:'public/images/fixture.png',bytes:original.length,sha,url}},images:{}}));
  const run=()=>spawnSync(process.execPath,['scripts/build-public-card-artwork.mjs'],{cwd:root,env:{...process.env,VERCEL_ENV:'production'},encoding:'utf8'});
  const baseline=await sharp(original,{failOn:'error'}).rotate()
    .resize({width:720,withoutEnlargement:true,kernel:'lanczos3'})
    .webp({quality:76,alphaQuality:90,effort:4}).toBuffer();
  cpSync(new URL('../scripts/build-public-card-artwork.mjs',import.meta.url),join(root,'scripts/build-public-card-artwork.mjs'));
  assert.equal(run().status,0);
  assert.deepEqual(readFileSync(join(root,'public',url)),baseline);
  rmSync(join(root,'public',url));
  const warm=run();
  assert.equal(warm.status,0,warm.stderr);
  assert.match(warm.stdout,/hits: 1, misses: 0/);
  assert.deepEqual(readFileSync(join(root,'public',url)),baseline);
  writeFileSync(join(root,'public/images/fixture.png'),'changed-source');
  const invalid=run();
  assert.notEqual(invalid.status,0);
  assert.match(invalid.stderr,/Artwork source has changed/);
});
