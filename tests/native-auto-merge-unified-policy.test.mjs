import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('native automerge recognizes the unified required check and rejects incomplete job pages', () => {
  const source = readFileSync('.github/workflows/hh-native-auto-merge.yml', 'utf8');
  assert.match(source, /\["hh-merge-check", \["hh-merge-check"\]\]/);
  assert.match(source, /jobPage\.total_count !== jobs\.length/);
  assert.match(source, /matching\.length === 1/);
});
