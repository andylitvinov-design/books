import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeSavedGoalProfile, stageSupportGoalProfile, readStagedSupportGoalProfile, clearStagedSupportGoalProfile, SUPPORT_GOAL_HANDOFF_MAX_AGE_MS } from '../lib/holistic-support/saved-goal-profile.mjs';
import { normalizeDevelopmentGoals, DEFAULT_DEVELOPMENT_TARGETS, DEVELOPMENT_GOALS_VERSION } from '../lib/profile/development-program.js';

const sample = () => ({
  version: 1,
  activeSector: 'energy',
  scores: { energy:5, money:6, relationships:7, meaning:8 },
  savedSectors: { energy: { checkin:5, concerns:['fatigue'],tasks:['betterSleep'],ratings:{ vitality:{current:5,desired:7} } } },
});
const storage=()=>{const data=new Map();return {
  getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),
  removeItem:k=>data.delete(k),
}};
test('goal self-ratings stay bounded, are not a clinical score and round-trip within original encrypted goals shape',()=>{
  const profile=normalizeSavedGoalProfile(sample());
  assert.ok(profile);
  const goals=normalizeDevelopmentGoals({version:DEVELOPMENT_GOALS_VERSION,targets:{...DEFAULT_DEVELOPMENT_TARGETS},details:{},supportProfile:profile});
  assert.deepEqual(goals.supportProfile,profile);
  assert.equal(normalizeSavedGoalProfile({...sample(),extra:'private-transcript'}),null);
  assert.equal(normalizeSavedGoalProfile({...sample(),scores:{energy:11,money:6,relationships:7,meaning:8}}),null);
  assert.equal(normalizeDevelopmentGoals({...goals,supportProfile:{...profile,activeSector:'other'}}),null);
  assert.ok(normalizeDevelopmentGoals({version:DEVELOPMENT_GOALS_VERSION,targets:{...DEFAULT_DEVELOPMENT_TARGETS},details:{}}));
});
test('voluntary same-tab handoff expires and can be cleared without URLs or persistent storage',()=>{
  const s=storage(),now=1750000000000,profile=sample();
  assert.deepEqual(stageSupportGoalProfile(profile,s,now),normalizeSavedGoalProfile(profile));
  assert.deepEqual(readStagedSupportGoalProfile(s,now+100),normalizeSavedGoalProfile(profile));
  assert.equal(readStagedSupportGoalProfile(s,now+SUPPORT_GOAL_HANDOFF_MAX_AGE_MS+1),null);
  stageSupportGoalProfile(profile,s,now);
  clearStagedSupportGoalProfile(s);
  assert.equal(readStagedSupportGoalProfile(s,now+100),null);
});
test('server refuses arbitrary keys and preserves profile during concurrent Life Context/Vector revision writes',()=>{
  const backend=readFileSync(new URL('../lib/app/development-goals.js',import.meta.url),'utf8');
  assert.match(backend,/onlyKeys\(input, \['version', 'targets', 'details', 'goalCheckin', 'vectors', 'lifeContext', 'supportProfile', 'revision'\]\)/);
  assert.match(backend,/preserveSupportProfile/);
  assert.match(backend,/if\(preserveSupportProfile&&prior\.supportProfile\)/);
  assert.match(backend,/account_id=\$1/);
  assert.match(backend,/openSealed/);
  assert.match(backend,/seal\(/);
  assert.match(backend,/DEVELOPMENT_GOALS_CONFLICT/);
});
