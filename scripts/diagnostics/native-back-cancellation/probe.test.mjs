import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyEvidence, fixture, bounded, cleanupPreservingError } from './probe.mjs';
const cancelled = {type:'requestfailed',path:'/delayed.js',cancelled:true};
const prefix = [{type:'server-script-request'},{type:'back-command'}];
const error = {type:'pageerror',category:'synthetic-script-error'};
test('requires actual cancellation and corresponding synthetic error', () => {
 assert.equal(classifyEvidence([...prefix,cancelled,error],'pending',true),'cancellation-reproduced');
 for (const events of [[cancelled],[error],[],[{...cancelled,cancelled:false},error]]) assert.equal(classifyEvidence(events,'pending',true),'not-reproduced');
});
test('navigation success is independently required', () => {
 assert.equal(classifyEvidence([...prefix,cancelled,error],'pending',false),'navigation-failed');
});
test('loaded control preserves zero-error expectation', () => {
 assert.equal(classifyEvidence([],'loaded',true),'control-passed');
 assert.equal(classifyEvidence([...prefix,cancelled,error],'loaded',true),'control-failed');
 assert.equal(classifyEvidence([cancelled,error,...prefix],'loaded',true),'control-failed');
});
test('fixture keeps native rejection visible and performs no interception', () => {
 assert.match(fixture,/reject\(new Error\('SYNTHETIC_PENDING_SCRIPT_CANCELLED'\)\)/);
 assert.doesNotMatch(fixture,/preventDefault|stopImmediatePropagation|\.catch\(|location\.(replace|assign)/);
 assert.match(fixture,/script.src = '\/delayed.js'/);
});
test('unrelated error or browser crash invalidates proof', () => {
 for (const extra of [{type:'crash'},{type:'pageerror',category:'other'}]) {
  assert.equal(classifyEvidence([...prefix,cancelled,error,extra],'pending',true),'unexpected-error');
 }
});

test('pre-command cancellation cannot establish causation', () => {
 assert.equal(classifyEvidence([cancelled,error,...prefix],'pending',true),'not-reproduced');
 assert.equal(classifyEvidence([{type:'back-command'},cancelled,error],'pending',true),'not-reproduced');
});
test('case deadline bounds a hung evaluate-like operation', async () => {
 await assert.rejects(bounded(() => new Promise(() => {}), 10, 'Synthetic case'), /Synthetic case deadline/);
});
test('hung cleanup retains original failure and fails otherwise', async () => {
 const original = new Error('original');
 await cleanupPreservingError(() => new Promise(() => {}), original, 10);
 await assert.rejects(cleanupPreservingError(() => new Promise(() => {}), null, 10), /Cleanup deadline/);
 await cleanupPreservingError(() => { throw new Error('cleanup'); }, original, 10);
});
