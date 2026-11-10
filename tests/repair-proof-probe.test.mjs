import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('components/repair-proof-probe.ts');
test('synthetic OpenRouter repair proof expects a ready-only declaration',()=>{
  assert.match(source,/export const repairProofState: 'ready' = 'ready';/);
});
