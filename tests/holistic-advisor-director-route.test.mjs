import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../app/api/holistic-agent/director-turn/route.js', import.meta.url), 'utf8');

test('Holistic House Director endpoint is server-only and fails closed when bridge is disabled', () => {
  assert.match(source, /runtime = "nodejs"/);
  assert.match(source, /HH_AGENT_DIRECTOR_BRIDGE_ENABLED !== "true"/);
  assert.match(source, /HH_AGENT_DIRECTOR_BRIDGE_SECRET/);
  assert.match(source, /timingSafeEqual/);
  assert.match(source, /x-hh-director-signature/);
  assert.match(source, /Math\.abs\(seconds - Number\(timestamp\)\) > 90/);
});

test('service identity is fixed, audience-bound and request body is bounded', () => {
  assert.match(source, /SERVICE_AUDIENCE = "holistic-house-ai-advisor"/);
  assert.match(source, /body\.actor !== "verified-director-owner"/);
  assert.match(source, /body\.audience !== SERVICE_AUDIENCE/);
  assert.match(source, /body\.requestId !== requestId/);
  assert.match(source, /raw\.length > 12000/);
});

test('advisor uses only reviewed deterministic logic and never reads client profile or executes tools', () => {
  assert.match(source, /planJudgmentTurn/);
  assert.match(source, /ruleConversationReply/);
  assert.match(source, /history\.some\(turn => turn\.role === "user" && riskyCue\.test\(turn\.text\)\)/);
  assert.match(source, /consumeRate/);
  assert.match(source, /modelUsed: false/);
  assert.match(source, /reportType: "ADVISORY_ONLY"/);
  assert.doesNotMatch(source, /generateOwnedOllama|readMyAgentMemory|createAppRepository|executeTool|dispatchJob/);
});
