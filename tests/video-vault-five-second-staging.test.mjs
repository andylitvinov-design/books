import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planVaultTrim} from '../lib/video-vault/ingest-trim.mjs';

test('staged five-second films do not request obsolete 10-second default',()=>{
 const p=planVaultTrim(5);
 assert.equal(p.outputFrames,120);assert.equal(p.inputSeconds,5);
 assert.equal(p.holdSeconds,0);assert.equal(p.outputSeconds,5);
});
test('119-frame 24fps footage gets only a tiny frozen tail, never looping source footage',()=>{
 const p=planVaultTrim(119/24,5);
 assert.equal(p.outputFrames,120);assert.equal(p.outputSeconds,5);
 assert.ok(p.holdSeconds>0&&p.holdSeconds<0.05);assert.ok(p.finalFrameHoldApplied);
});
test('full 5–15s filmed footage retains requested source clip and trim start',()=>{
 assert.equal(planVaultTrim(32).inputSeconds,10);
 assert.equal(planVaultTrim(32,15,12).outputFrames,360);
});
test('short, over-trimmed, negative or invalid source plans fail closed',()=>{
 for(const args of [[4.9,5,0],[5,10,0],[8,5,5],[0,undefined,0],
 [NaN,5,0],[12,16,0],[12,5,-1],[12,5,8]])
  assert.throws(()=>planVaultTrim(...args),/HH_VAULT_TRIM_/);
});
test('source QA and Cloudflare price/rights/R2 readback hold gates stay intact',()=>{
 const s=readFileSync(new URL('../scripts/video-vault-ingest.mjs',import.meta.url),'utf8');
 for(const token of ['UPSCALE_WARNINGS_NOT_NATIVE_HD','FINAL_FRAME_HOLD_WARNINGS',
  'finalFrameHoldApplied','-frames:v','-xerror','STAGED_ASPECT_MISMATCH',
  'HH_VIDEO_VAULT_OWNER_UPLOAD_CONFIRMED','checkVaultCostGate','validateVaultManifest','r2.getVerified'])
  assert.ok(s.includes(token),token);
});
