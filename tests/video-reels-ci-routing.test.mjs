import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=readFileSync(new URL('../.github/workflows/holistic-support-mandala.yml',import.meta.url),'utf8');
const branch="startsWith(github.head_ref, 'codex/video-reels-')";
test('Video Reels branch executes all existing real media/browser gates, including macOS WebKit',()=>{
  const gated=workflow.split('\n').filter(line=>line.includes("startsWith(github.head_ref, 'fix/video-')"));
  assert.equal(gated.length,8,'all established fix/video release gates must remain in place');
  for(const line of gated) assert.ok(line.includes(branch),'missing Reels branch in mandatory gate: '+line.slice(0,75));
  assert.match(workflow,/voice-webkit-macos:\n\s+if:[^\n]*codex\/video-reels-/);
  assert.match(workflow,/node --test tests\/video-studio-question-registry\.test\.mjs[^\n]*tests\/video-reels-ci-routing\.test\.mjs/);
  assert.match(workflow,/HH_VOICE_E2E_ENGINE: webkit/);
  assert.match(workflow,/node scripts\/verify-affirmation-voice-browser\.mjs/);
});
