import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const edge = readFileSync(new URL('../supabase/functions/agent-commander-private-store-v1/index.ts', import.meta.url), 'utf8');

test('private chat normalizer persists bounded goal, acceptance criteria and skill IDs', () => {
  assert.match(edge, /const goal=clean\(input\.goal===undefined\?\(previous\?\.goal\|\|description\|\|title\):input\.goal,2000\)/);
  assert.match(edge, /criteria=input\.acceptanceCriteria===undefined\?\(previous\?\.acceptanceCriteria\|\|\[\]\):input\.acceptanceCriteria/);
  assert.match(edge, /criteria\.length>5/);
  assert.match(edge, /criteria\.some\(v=>typeof v!==\"string\"\|\|!clean\(v,500\)\|\|v\.length>500\)/);
  assert.match(edge, /skills=input\.skillIds===undefined\?\(previous\?\.skillIds\|\|\[\]\):input\.skillIds/);
  assert.match(edge, /skills\.length>10/);
  assert.match(edge, /acceptanceCriteria:criteria\.map\(v=>clean\(v,500\)\),skillIds:\[\.\.\.skills\]/);
});

test('Agent Director dispatch derives task context from the persisted owner chat and includes it in the idempotency hash', () => {
  assert.match(edge, /const goal=clean\(rawChat\.goal\|\|rawChat\.description\|\|rawChat\.title\|\|message,2000\)/);
  assert.match(edge, /const acceptanceCriteria=Array\.isArray\(rawChat\.acceptanceCriteria\)/);
  assert.match(edge, /const skillIds=Array\.isArray\(rawChat\.skillIds\)/);
  assert.match(edge, /JSON\.stringify\(acceptanceCriteria\),JSON\.stringify\(skillIds\),parentTaskId\|\|""/);
  assert.match(edge, /jsonbText\(\{message,goal,acceptanceCriteria,skillIds,parentTaskId,contextCapsule,modelId,confirmGitHubWrite:writeConfirmed\}\)/);
  assert.match(edge, /goal,acceptanceCriteria,skillIds,parentTaskId,/);
  assert.match(edge, /linkedPrHintsVerified:false/);
});

test('parent Agent Director run is selected only from a completed run in the same owner and chat', () => {
  assert.match(edge, /where owner_id=\$1::uuid and chat_id=\$2::uuid and executor='local' and status='COMPLETED'/);
  assert.match(edge, /\[ownerId,chat\.chat_id\]/);
  assert.match(edge, /parentTaskId=prior\[0\]\?\.run_id\|\|null/);
});
