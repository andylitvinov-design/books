import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('../scripts/lab-preflight.mjs',import.meta.url));
test('lab preflight fails closed without durable lease, isolated data and budget',()=>{
 const result=spawnSync(process.execPath,[script],{encoding:'utf8'});
 assert.equal(result.status,2);
 const data=JSON.parse(result.stdout);
 assert.equal(data.ready,false);
 assert.equal(data.checks.central_lease_implemented,false);
 assert.equal(data.checks.isolated_database_verified,false);
 assert.equal(data.checks.billing_cost_guard_verified,false);
 assert.equal(data.action,'do-not-deploy');
});
