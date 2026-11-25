import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('signed judgment continuations cannot be bypassed by fast replies',()=>{
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 const child=spawnSync(process.execPath,['--experimental-vm-modules','--test',fileURLToPath(new URL('./holistic-agent-judgment-fast-vm.mjs',import.meta.url))],{encoding:'utf8',env});
 assert.equal(child.status,0,child.stdout+'\n'+child.stderr);
});
