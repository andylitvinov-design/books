'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// business_brain.commander_chat_events_kind_check admits only
// owner, assistant_unverified, note, github_report; details stay in JSONB.
test('blocked execution is persisted under the CHECK-allowed note kind', () => {
  const source = fs.readFileSync(path.join(__dirname, '../supabase/functions/agent-commander-private-store-v1/index.ts'), 'utf8');
  const start = source.indexOf('if(action==="commander_start_run")');
  const end = source.indexOf('if(action==="status")', start);
  assert.ok(start !== -1 && end > start, 'find run-handler body');
  const handler = source.slice(start, end);
  assert.match(handler, /kind:"execution_blocked"/);
  assert.match(handler, /values\(\$1::uuid,\$2::uuid,\$3::uuid,'note',\$4::text::jsonb,false\)/);
  assert.doesNotMatch(handler, /values\(\$1::uuid,\$2::uuid,\$3::uuid,'execution_blocked',/);
});
