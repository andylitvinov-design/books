import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('health telemetry reads latest per task from the private ledger, not first 40 mixed events',()=>{
 const source=read('lib/automations/scout-db.mjs');
 assert.match(source,/distinct on \(task_id\)/i);
 assert.match(source,/result_json/);
 assert.match(source,/lastRuns:/);
 assert.match(source,/task_id,slot_utc desc/i);
 assert.match(source,/candidatePageInfo/);
});
test('owner dashboard never declares active toggles successful without result evidence',()=>{
 const ui=read('app/admin/automations/page.tsx');
 assert.match(ui,/summarizeTaskHealth/);
 assert.match(ui,/lastRuns/);
 assert.match(ui,/quota_paused/);
 assert.match(ui,/succeededSlots/);
 assert.doesNotMatch(ui,/<span className=\{styles\.tag\}>\{task\.enabled\?t\.enabled:t\.paused\}<\/span>/);
});
