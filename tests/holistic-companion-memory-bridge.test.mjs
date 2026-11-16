import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const route=read('app/api/holistic-agent/turn/route.js');
const ui=read('components/holistic-agent-chat.tsx');
const panel=read('components/holistic-agent-memory-panel.tsx');
test('only verified account and independent consent enable memory in a safe turn',()=>{
 assert.match(route,/body\.useAgentMemory===true && safety\.status==="clear" && !recentUnsafe/);
 assert.match(route,/process\.env\.HH_AGENT_MEMORY_ENABLED==="true"/);
 assert.match(route,/readMyAgentMemory\(config,actor\)/);
 assert.match(route,/saved\.consent===true && saved\.useInDialogue===true/);
 assert.match(route,/const allowed=new Set\(\["preferred_name","response_length","avoid_format"\]\)/);
 assert.match(route,/agentMemory:Boolean\(approvedMemory\)/);
 assert.doesNotMatch(route,/body\.memoryItems|body\.memoryFacts|body\.savedMemory/);
});
test('UI mounts memory inside existing chat only for authenticated users with flags',()=>{
 assert.match(ui,/\{authenticated&&<HolisticAgentMemoryPanel locale=\{locale\}/);
 assert.match(ui,/NEXT_PUBLIC_HH_AGENT_MEMORY_ENABLED/);
 assert.match(ui,/useAgentMemory:authenticated&&useAgentMemory/);
 assert.match(panel,/HH_AGENT_MEMORY_ENABLED/);
 assert.match(panel,/x-hh-memory-owner/);
 assert.doesNotMatch(ui,/localStorage\.setItem\([^)]*memory/i);
});
test('saved avoid-format does not override an explicitly chosen format',()=>{
 assert.match(route,/const enabledFormats=body\.preferredFormat \? \[body\.preferredFormat\] :/);
 assert.match(route,/kind!==approvedMemory\?\.avoid_format/);
});
test('consent can be revoked in-line; no unsolicited modal',()=>{
 assert.match(panel,/onChange=\{e=>void changeConsent\(e\.target\.checked\)\}/);
 assert.match(panel,/eraseAll|copy\.erase/);
 assert.doesNotMatch(panel,/<dialog|window\.alert|window\.confirm/);
});

test('fast factual replies avoid unnecessary private memory reads',()=>{
 assert.ok(route.indexOf('if(fastRule&&FAST_RULE_IDS.has(fastRule.id))') <
   route.indexOf('readMyAgentMemory(config,actor)'));
});

test('revoking or editing memory during a turn blocks its already composed model prompt',()=>{
 assert.match(route,/const latest=await readMyAgentMemory\(config,actor\)/);
 assert.match(route,/latest\?\.consent!==true\|\|latest\?\.useInDialogue!==true/);
 assert.match(route,/MEMORY_CONSENT_CHANGED/);
 assert.ok(route.indexOf('const latest=await readMyAgentMemory(config,actor)')<
   route.indexOf('return generateOwnedOllama(prompt,'));
});
